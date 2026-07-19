"""Moving specification lifecycle tests."""

from datetime import datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from tests.test_jobs import create_job


def specification_payload(**overrides) -> dict:
    return {
        "origin_address": "Dresden, Germany",
        "destination_address": "Berlin, Germany",
        "move_date": "2026-07-25",
        "origin_floor": 2,
        "destination_floor": 4,
        "bedrooms": 2,
        "estimated_volume_m3": 28.5,
        "distance_km": 193.0,
        "packing_required": True,
        "inventory": [{"name": "Sofa", "quantity": 1}],
        "special_items": [
            {"name": "Piano", "quantity": 1, "handling_notes": "Use lift"}
        ],
        **overrides,
    }


def test_create_and_retrieve_specification(client: TestClient) -> None:
    job = create_job(client)

    created = client.put(
        f"/api/v1/jobs/{job['id']}/specification",
        json=specification_payload(),
    )
    retrieved = client.get(f"/api/v1/jobs/{job['id']}/specification")

    assert created.status_code == 201
    assert retrieved.status_code == 200
    assert retrieved.json() == created.json()
    assert created.json()["status"] == "draft"
    assert created.json()["version"] == 1
    assert datetime.fromisoformat(created.json()["created_at"]).tzinfo is not None
    assert (
        client.get(f"/api/v1/jobs/{job['id']}").json()["status"]
        == "specification_ready"
    )


def test_update_draft_specification_in_place(client: TestClient) -> None:
    job = create_job(client)
    first = client.put(
        f"/api/v1/jobs/{job['id']}/specification", json=specification_payload()
    ).json()

    response = client.put(
        f"/api/v1/jobs/{job['id']}/specification",
        json=specification_payload(bedrooms=3, inventory=[]),
    )

    assert response.status_code == 200
    assert response.json()["id"] == first["id"]
    assert response.json()["bedrooms"] == 3
    assert response.json()["inventory"] == []


def test_confirm_specification_and_update_job_state(client: TestClient) -> None:
    job = create_job(client)
    client.put(f"/api/v1/jobs/{job['id']}/specification", json=specification_payload())

    response = client.post(f"/api/v1/jobs/{job['id']}/specification/confirm")

    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"
    assert datetime.fromisoformat(response.json()["confirmed_at"]).tzinfo is not None
    assert (
        client.get(f"/api/v1/jobs/{job['id']}").json()["status"]
        == "specification_confirmed"
    )


def test_confirm_without_specification_returns_404(client: TestClient) -> None:
    job = create_job(client)

    response = client.post(f"/api/v1/jobs/{job['id']}/specification/confirm")

    assert response.status_code == 404


def test_confirmed_specification_is_immutable(client: TestClient) -> None:
    job = create_job(client)
    client.put(f"/api/v1/jobs/{job['id']}/specification", json=specification_payload())
    client.post(f"/api/v1/jobs/{job['id']}/specification/confirm")

    response = client.put(
        f"/api/v1/jobs/{job['id']}/specification",
        json=specification_payload(bedrooms=4),
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Confirmed specifications are immutable"}


def test_repeated_confirmation_returns_documented_conflict(client: TestClient) -> None:
    job = create_job(client)
    client.put(f"/api/v1/jobs/{job['id']}/specification", json=specification_payload())
    client.post(f"/api/v1/jobs/{job['id']}/specification/confirm")

    response = client.post(f"/api/v1/jobs/{job['id']}/specification/confirm")

    assert response.status_code == 409
    assert response.json() == {"detail": "Job specification is already confirmed"}


@pytest.mark.parametrize(
    "override",
    [
        {"inventory": [{"name": "Sofa", "quantity": 0}]},
        {"inventory": [{"name": "   ", "quantity": 1}]},
        {"origin_address": "Berlin, Germany"},
        {"origin_floor": -3},
        {"destination_floor": 101},
        {"bedrooms": 21},
        {"estimated_volume_m3": 0},
        {"distance_km": -1},
    ],
)
def test_reject_invalid_specification_data(client: TestClient, override: dict) -> None:
    job = create_job(client)

    response = client.put(
        f"/api/v1/jobs/{job['id']}/specification",
        json=specification_payload(**override),
    )

    assert response.status_code == 422


def test_missing_job_or_specification_returns_404(client: TestClient) -> None:
    missing_job_id = uuid4()
    job = create_job(client)

    missing_job_response = client.put(
        f"/api/v1/jobs/{missing_job_id}/specification",
        json=specification_payload(),
    )
    missing_spec_response = client.get(f"/api/v1/jobs/{job['id']}/specification")

    assert missing_job_response.status_code == 404
    assert missing_spec_response.status_code == 404
