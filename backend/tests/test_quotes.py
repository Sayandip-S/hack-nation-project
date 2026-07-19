"""Structured quote validation, persistence, and three-quote workflow tests."""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from tests.test_provider_calls import (
    create_batch,
    create_confirmed_job,
    create_three_providers,
)


def quote_payload(total: str = "920.00", **overrides) -> dict:
    return {
        "currency": "eur",
        "items": [
            {
                "category": "labor",
                "description": "Moving crew",
                "quantity": "2",
                "unit": "crew-hour",
                "unit_price": "300.00",
                "total_price": "600.00",
            },
            {
                "category": "transport",
                "description": "Truck and mileage",
                "quantity": "1",
                "unit_price": "200.00",
            },
        ],
        "tax_amount": "120.00",
        "total_amount": total,
        "availability_confirmed": True,
        "estimated_duration_hours": "6.5",
        "inclusions": [" Packing blankets ", "", "Insurance"],
        "exclusions": ["Storage"],
        "extraction_source": "manual",
        "extraction_confidence": "0.95",
        **overrides,
    }


def simple_quote_payload(total: str) -> dict:
    return {
        "items": [
            {
                "category": "move",
                "description": "Complete moving service",
                "quantity": "1",
                "unit_price": total,
            }
        ],
        "tax_amount": "0",
        "total_amount": total,
    }


def prepare_calls(client: TestClient) -> tuple[dict, list[dict]]:
    job = create_confirmed_job(client)
    calls = create_batch(client, job["id"], create_three_providers(client)).json()
    return job, calls


def set_call_status(client: TestClient, call_id: str, status: str) -> None:
    response = client.patch(
        f"/api/v1/provider-calls/{call_id}", json={"status": status}
    )
    assert response.status_code == 200


def create_quote_for_call(client: TestClient, call: dict, payload: dict | None = None):
    set_call_status(client, call["id"], "completed")
    return client.post(
        f"/api/v1/provider-calls/{call['id']}/quote",
        json=payload or quote_payload(),
    )


def test_missing_call_quote_returns_404(client: TestClient) -> None:
    response = client.post(
        f"/api/v1/provider-calls/{uuid4()}/quote", json=quote_payload()
    )

    assert response.status_code == 404


def test_pending_call_rejects_quote(client: TestClient) -> None:
    _, calls = prepare_calls(client)

    response = client.post(
        f"/api/v1/provider-calls/{calls[0]['id']}/quote", json=quote_payload()
    )

    assert response.status_code == 409


def test_completed_call_accepts_structured_quote(client: TestClient) -> None:
    _, calls = prepare_calls(client)

    response = create_quote_for_call(client, calls[0])

    body = response.json()
    assert response.status_code == 201
    assert body["currency"] == "EUR"
    assert body["subtotal"] == "800.00"
    assert body["tax_amount"] == "120.00"
    assert body["total_amount"] == "920.00"
    assert [item["sequence"] for item in body["items"]] == [1, 2]
    assert [item["total_price"] for item in body["items"]] == ["600.00", "200.00"]
    assert body["inclusions"] == ["Packing blankets", "Insurance"]
    assert body["exclusions"] == ["Storage"]


def test_in_progress_call_accepts_manual_quote(client: TestClient) -> None:
    _, calls = prepare_calls(client)
    set_call_status(client, calls[0]["id"], "in_progress")

    response = client.post(
        f"/api/v1/provider-calls/{calls[0]['id']}/quote", json=quote_payload()
    )

    assert response.status_code == 201


def test_failed_call_rejects_quote(client: TestClient) -> None:
    _, calls = prepare_calls(client)
    set_call_status(client, calls[0]["id"], "failed")

    response = client.post(
        f"/api/v1/provider-calls/{calls[0]['id']}/quote", json=quote_payload()
    )

    assert response.status_code == 409


def test_quote_ownership_derives_from_call_and_duplicate_returns_409(
    client: TestClient,
) -> None:
    job, calls = prepare_calls(client)
    first = create_quote_for_call(client, calls[0])

    duplicate = client.post(
        f"/api/v1/provider-calls/{calls[0]['id']}/quote", json=quote_payload()
    )

    assert first.json()["job_id"] == job["id"]
    assert first.json()["provider_id"] == calls[0]["provider_id"]
    assert first.json()["provider_call_id"] == calls[0]["id"]
    assert duplicate.status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        quote_payload(
            items=[
                {
                    "category": "x",
                    "description": "x",
                    "quantity": "1",
                    "unit_price": "10",
                    "total_price": "12",
                }
            ],
            tax_amount="0",
            total_amount="10",
        ),
        quote_payload(total_amount="921.00"),
        quote_payload(tax_amount="-1"),
        quote_payload(
            items=[
                {
                    "category": "x",
                    "description": "x",
                    "quantity": "0",
                    "unit_price": "10",
                }
            ],
            total_amount="10",
        ),
        quote_payload(currency="EURO"),
        quote_payload(currency="12$"),
        quote_payload(extraction_confidence="1.1"),
        quote_payload(total_amount="NaN"),
    ],
)
def test_reject_invalid_quote_data(client: TestClient, payload: dict) -> None:
    _, calls = prepare_calls(client)
    set_call_status(client, calls[0]["id"], "completed")

    response = client.post(
        f"/api/v1/provider-calls/{calls[0]['id']}/quote", json=payload
    )

    assert response.status_code == 422


def test_retrieve_and_replace_quote_items_atomically(client: TestClient) -> None:
    _, calls = prepare_calls(client)
    created = create_quote_for_call(client, calls[0]).json()

    retrieved = client.get(f"/api/v1/provider-calls/{calls[0]['id']}/quote")
    updated = client.put(
        f"/api/v1/quotes/{created['id']}", json=simple_quote_payload("850.00")
    )

    assert retrieved.status_code == 200
    assert [item["sequence"] for item in retrieved.json()["items"]] == [1, 2]
    assert updated.status_code == 200
    assert updated.json()["subtotal"] == "850.00"
    assert len(updated.json()["items"]) == 1
    assert updated.json()["items"][0]["sequence"] == 1


def test_quote_update_rejects_ownership_fields(client: TestClient) -> None:
    _, calls = prepare_calls(client)
    created = create_quote_for_call(client, calls[0]).json()
    payload = simple_quote_payload("850.00") | {"job_id": str(uuid4())}

    response = client.put(f"/api/v1/quotes/{created['id']}", json=payload)

    assert response.status_code == 422


def test_three_quote_workflow_updates_state_and_lists_quotes(
    client: TestClient,
) -> None:
    job, calls = prepare_calls(client)
    totals = ["920.00", "790.00", "850.00"]

    for index, (call, total) in enumerate(zip(calls, totals, strict=True), start=1):
        response = create_quote_for_call(client, call, simple_quote_payload(total))
        assert response.status_code == 201
        expected_status = "quotes_received" if index == 3 else "calls_in_progress"
        assert (
            client.get(f"/api/v1/jobs/{job['id']}").json()["status"] == expected_status
        )

    listed = client.get(f"/api/v1/jobs/{job['id']}/quotes")
    assert listed.status_code == 200
    assert len(listed.json()) == 3

    updated = client.put(
        f"/api/v1/quotes/{listed.json()[0]['id']}", json=simple_quote_payload("900.00")
    )
    assert updated.status_code == 200
    assert client.get(f"/api/v1/jobs/{job['id']}").json()["status"] == "quotes_received"
