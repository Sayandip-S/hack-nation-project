"""Job CRUD tests."""

from datetime import datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient


def create_job(client: TestClient, **overrides) -> dict:
    payload = {
        "title": "Move from Dresden to Berlin",
        "customer_name": "Demo Customer",
        "customer_phone": "+491701234567",
        "customer_email": "demo@example.com",
        **overrides,
    }
    response = client.post("/api/v1/jobs", json=payload)
    assert response.status_code == 201
    return response.json()


def test_create_job_normalizes_and_returns_complete_resource(
    client: TestClient,
) -> None:
    job = create_job(client, title="  Move from Dresden to Berlin  ")

    assert job["title"] == "Move from Dresden to Berlin"
    assert job["service_type"] == "residential_moving"
    assert job["status"] == "draft"
    assert datetime.fromisoformat(job["created_at"]).tzinfo is not None
    assert datetime.fromisoformat(job["updated_at"]).tzinfo is not None


def test_retrieve_job(client: TestClient) -> None:
    created = create_job(client)

    response = client.get(f"/api/v1/jobs/{created['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_list_jobs_newest_first_and_honors_limit(client: TestClient) -> None:
    first = create_job(client, title="First move")
    second = create_job(client, title="Second move")

    response = client.get("/api/v1/jobs", params={"limit": 1})

    assert response.status_code == 200
    assert [job["id"] for job in response.json()] == [second["id"]]
    assert second["id"] != first["id"]


@pytest.mark.parametrize("title", ["", "  ", "ab", "x" * 201])
def test_reject_invalid_job_title(client: TestClient, title: str) -> None:
    response = client.post("/api/v1/jobs", json={"title": title})

    assert response.status_code == 422


def test_reject_invalid_customer_email(client: TestClient) -> None:
    response = client.post(
        "/api/v1/jobs",
        json={"title": "Valid move", "customer_email": "not-an-email"},
    )

    assert response.status_code == 422


def test_missing_job_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/v1/jobs/{uuid4()}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Job not found"}
