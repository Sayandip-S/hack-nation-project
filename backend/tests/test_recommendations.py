"""Deterministic rankings, recommendations, details, and workflow tests."""

from fastapi.testclient import TestClient

from tests.test_negotiations import negotiation_payload
from tests.test_provider_calls import (
    create_batch,
    create_confirmed_job,
    create_three_providers,
)
from tests.test_quotes import create_quote_for_call, simple_quote_payload


def prepare_job(client: TestClient) -> tuple[dict, list[dict]]:
    job = create_confirmed_job(client)
    calls = create_batch(client, job["id"], create_three_providers(client)).json()
    return job, calls


def add_quotes(
    client: TestClient, calls: list[dict], totals: list[str]
) -> list[dict]:
    return [
        create_quote_for_call(client, call, simple_quote_payload(total)).json()
        for call, total in zip(calls, totals, strict=True)
    ]


def stable_ranking_fields(rankings: list[dict]) -> list[dict]:
    ignored = {"id", "created_at", "updated_at"}
    return [
        {key: value for key, value in ranking.items() if key not in ignored}
        for ranking in rankings
    ]


def test_ranking_requires_at_least_one_quote(client: TestClient) -> None:
    job, _ = prepare_job(client)

    response = client.post(f"/api/v1/jobs/{job['id']}/rank")

    assert response.status_code == 409
    assert client.get(f"/api/v1/jobs/{job['id']}/rankings").json() == []


def test_one_quote_receives_full_price_score(client: TestClient) -> None:
    job, calls = prepare_job(client)
    quote = add_quotes(client, calls[:1], ["900.00"])[0]

    response = client.post(f"/api/v1/jobs/{job['id']}/rank")

    rankings = response.json()
    assert response.status_code == 200
    assert len(rankings) == 1
    assert rankings[0]["quote_id"] == quote["id"]
    assert rankings[0]["rank"] == 1
    assert rankings[0]["price_score"] == "100.00"
    assert rankings[0]["completeness_score"] == "30.00"
    assert rankings[0]["total_score"] == "61.00"
    assert (
        client.get(f"/api/v1/jobs/{job['id']}").json()["status"]
        == "recommendation_ready"
    )


def test_three_quotes_rank_by_weighted_scores(client: TestClient) -> None:
    job, calls = prepare_job(client)
    quotes = add_quotes(client, calls, ["920.00", "790.00", "850.00"])

    response = client.post(f"/api/v1/jobs/{job['id']}/rank")

    rankings = response.json()
    assert response.status_code == 200
    assert [ranking["quote_id"] for ranking in rankings] == [
        quotes[1]["id"],
        quotes[2]["id"],
        quotes[0]["id"],
    ]
    assert [ranking["rank"] for ranking in rankings] == [1, 2, 3]
    assert [ranking["price_score"] for ranking in rankings] == [
        "100.00",
        "53.85",
        "0.00",
    ]


def test_latest_negotiated_price_is_used(client: TestClient) -> None:
    job, calls = prepare_job(client)
    quotes = add_quotes(client, calls, ["920.00", "790.00", "850.00"])
    negotiation = client.post(
        f"/api/v1/provider-calls/{calls[0]['id']}/negotiations",
        json=negotiation_payload(
            quotes[1]["id"], requested_total="770.00", after_total="780.00"
        ),
    )
    assert negotiation.status_code == 201

    rankings = client.post(f"/api/v1/jobs/{job['id']}/rank").json()

    assert rankings[0]["provider_id"] == calls[0]["provider_id"]
    assert rankings[0]["final_price"] == "780.00"
    assert rankings[0]["negotiation_score"] == "100.00"


def test_equal_scores_use_provider_name_then_id_and_repeat_deterministically(
    client: TestClient,
) -> None:
    job, calls = prepare_job(client)
    add_quotes(client, calls, ["800.00", "800.00", "800.00"])

    first = client.post(f"/api/v1/jobs/{job['id']}/rank").json()
    second = client.post(f"/api/v1/jobs/{job['id']}/rank").json()
    listed = client.get(f"/api/v1/jobs/{job['id']}/rankings").json()

    assert [ranking["provider_id"] for ranking in first] == [
        call["provider_id"]
        for call in sorted(calls, key=lambda call: call["provider"]["name"])
    ]
    assert stable_ranking_fields(first) == stable_ranking_fields(second)
    assert stable_ranking_fields(second) == stable_ranking_fields(listed)
    assert len(second) == 3


def test_recommendation_always_uses_rank_one_and_completes_job(
    client: TestClient,
) -> None:
    job, calls = prepare_job(client)
    add_quotes(client, calls, ["920.00", "790.00", "850.00"])
    rank_one = client.post(f"/api/v1/jobs/{job['id']}/rank").json()[0]

    response = client.post(f"/api/v1/jobs/{job['id']}/recommendation")
    repeated = client.post(f"/api/v1/jobs/{job['id']}/recommendation")

    recommendation = response.json()
    assert response.status_code == 200
    assert recommendation["recommended_provider_id"] == rank_one["provider_id"]
    assert recommendation["recommended_quote_id"] == rank_one["quote_id"]
    assert recommendation["status"] == "final"
    assert recommendation["original_price"] == "790.00"
    assert recommendation["final_price"] == "790.00"
    assert recommendation["total_savings"] == "0.00"
    assert repeated.json()["id"] == recommendation["id"]
    assert (
        client.get(f"/api/v1/jobs/{job['id']}").json()["status"] == "completed"
    )
    assert (
        client.get(f"/api/v1/jobs/{job['id']}/recommendation").json()["id"]
        == recommendation["id"]
    )


def test_recommendation_requires_existing_rankings(client: TestClient) -> None:
    job, calls = prepare_job(client)
    add_quotes(client, calls[:1], ["800.00"])

    response = client.post(f"/api/v1/jobs/{job['id']}/recommendation")

    assert response.status_code == 409


def test_details_endpoint_returns_evidence_and_workflow_summary(
    client: TestClient,
) -> None:
    job, calls = prepare_job(client)
    intake = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/text",
        json={"text": "Move a two-bedroom apartment."},
    )
    assert intake.status_code == 201
    call_update = client.patch(
        f"/api/v1/provider-calls/{calls[0]['id']}",
        json={
            "status": "completed",
            "transcript": [{"speaker": "provider", "text": "Quote supplied."}],
            "recording_url": "https://example.com/call.mp3",
        },
    )
    assert call_update.status_code == 200
    add_quotes(client, calls, ["920.00", "790.00", "850.00"])
    client.post(f"/api/v1/jobs/{job['id']}/rank")
    client.post(f"/api/v1/jobs/{job['id']}/recommendation")

    response = client.get(f"/api/v1/jobs/{job['id']}/details")

    body = response.json()
    workflow = body["workflow_summary"]
    assert response.status_code == 200
    assert body["job"]["id"] == job["id"]
    assert len(body["intakes"]) == 1
    assert body["specification"]["status"] == "confirmed"
    assert len(body["provider_calls"]) == 3
    assert len(body["providers"]) == 3
    assert len(body["transcripts"]) == 1
    assert len(body["recording_references"]) == 1
    assert len(body["quotes"]) == 3
    assert all(
        [item["sequence"] for item in quote["items"]] == [1]
        for quote in body["quotes"]
    )
    assert len(body["rankings"]) == 3
    assert body["recommendation"]["recommended_quote_id"] == body["rankings"][0][
        "quote_id"
    ]
    assert workflow == {
        "current_status": "completed",
        "intake_received": True,
        "specification_confirmed": True,
        "provider_call_count": 3,
        "completed_call_count": 3,
        "quote_count": 3,
        "all_three_quotes_received": True,
        "negotiation_count": 0,
        "has_genuine_negotiation": False,
        "ranking_ready": True,
        "recommendation_ready": True,
        "missing_steps": ["genuine_negotiation"],
    }
