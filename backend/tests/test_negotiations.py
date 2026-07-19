"""Genuine leverage, savings, outcome, and negotiation-state tests."""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from tests.test_quotes import (
    create_quote_for_call,
    prepare_calls,
    simple_quote_payload,
)


def prepare_three_quotes(client: TestClient) -> tuple[dict, list[dict], list[dict]]:
    job, calls = prepare_calls(client)
    quotes = [
        create_quote_for_call(client, call, simple_quote_payload(total)).json()
        for call, total in zip(calls, ["920.00", "790.00", "850.00"], strict=True)
    ]
    return job, calls, quotes


def negotiation_payload(competing_quote_id: str | None, **overrides) -> dict:
    return {
        "leverage_type": "competing_quote",
        "leverage_description": "Another provider supplied a lower stored quote.",
        "competing_quote_id": competing_quote_id,
        "before_total": "920.00",
        "requested_total": "780.00",
        "after_total": "810.00",
        "before_terms": {"packing_materials_included": False},
        "after_terms": {"packing_materials_included": True},
        "outcome": "price_and_terms_improved",
        **overrides,
    }


def test_negotiation_requires_stored_quote(client: TestClient) -> None:
    _, calls = prepare_calls(client)

    response = client.post(
        f"/api/v1/provider-calls/{calls[0]['id']}/negotiations",
        json=negotiation_payload(str(uuid4())),
    )

    assert response.status_code == 404


def test_create_negotiation_with_genuine_competing_quote(client: TestClient) -> None:
    job, calls, quotes = prepare_three_quotes(client)

    response = client.post(
        f"/api/v1/provider-calls/{calls[0]['id']}/negotiations",
        json=negotiation_payload(quotes[1]["id"]),
    )

    body = response.json()
    assert response.status_code == 201
    assert body["job_id"] == job["id"]
    assert body["provider_id"] == calls[0]["provider_id"]
    assert body["quote_id"] == quotes[0]["id"]
    assert body["competing_quote_id"] == quotes[1]["id"]
    assert body["savings_amount"] == "110.00"
    assert body["savings_percentage"] == "11.96"
    assert body["requested_total"] == "780.00"
    assert (
        client.get(f"/api/v1/jobs/{job['id']}").json()["status"]
        == "negotiation_complete"
    )

    listed = client.get(f"/api/v1/jobs/{job['id']}/negotiations")
    assert listed.status_code == 200
    assert listed.json()[0]["provider"]["id"] == calls[0]["provider_id"]
    assert listed.json()[0]["competing_quote"]["id"] == quotes[1]["id"]


def test_reject_same_provider_competing_quote(client: TestClient) -> None:
    _, calls, quotes = prepare_three_quotes(client)

    response = client.post(
        f"/api/v1/provider-calls/{calls[0]['id']}/negotiations",
        json=negotiation_payload(quotes[0]["id"]),
    )

    assert response.status_code == 409


def test_reject_competing_quote_from_another_job(client: TestClient) -> None:
    _, calls, _ = prepare_three_quotes(client)
    _, _, other_quotes = prepare_three_quotes(client)

    response = client.post(
        f"/api/v1/provider-calls/{calls[0]['id']}/negotiations",
        json=negotiation_payload(other_quotes[1]["id"]),
    )

    assert response.status_code == 409


def test_competing_leverage_requires_quote_id(client: TestClient) -> None:
    _, calls, _ = prepare_three_quotes(client)

    response = client.post(
        f"/api/v1/provider-calls/{calls[0]['id']}/negotiations",
        json=negotiation_payload(None),
    )

    assert response.status_code == 422


def test_before_total_must_match_stored_quote(client: TestClient) -> None:
    _, calls, quotes = prepare_three_quotes(client)

    response = client.post(
        f"/api/v1/provider-calls/{calls[0]['id']}/negotiations",
        json=negotiation_payload(quotes[1]["id"], before_total="900.00"),
    )

    assert response.status_code == 409


@pytest.mark.parametrize(
    "overrides",
    [
        {"after_total": "920.00", "outcome": "price_reduced"},
        {"after_total": "930.00", "outcome": "terms_improved"},
        {"leverage_description": "   "},
    ],
)
def test_reject_invalid_negotiation_evidence(
    client: TestClient, overrides: dict
) -> None:
    _, calls, quotes = prepare_three_quotes(client)

    response = client.post(
        f"/api/v1/provider-calls/{calls[0]['id']}/negotiations",
        json=negotiation_payload(quotes[1]["id"], **overrides),
    )

    assert response.status_code == 422


@pytest.mark.parametrize("outcome", ["no_change", "terms_improved", "rejected"])
def test_allow_equal_total_without_price_reduction(
    client: TestClient, outcome: str
) -> None:
    job, calls, quotes = prepare_three_quotes(client)
    payload = {
        "leverage_type": "flexible_date",
        "leverage_description": "A flexible date was offered as leverage.",
        "before_total": "920.00",
        "after_total": "920.00",
        "outcome": outcome,
    }

    response = client.post(
        f"/api/v1/provider-calls/{calls[0]['id']}/negotiations", json=payload
    )

    assert response.status_code == 201
    assert response.json()["savings_amount"] == "0.00"
    assert response.json()["savings_percentage"] == "0.00"
    assert (
        client.get(f"/api/v1/jobs/{job['id']}").json()["status"]
        == "negotiation_complete"
    )
