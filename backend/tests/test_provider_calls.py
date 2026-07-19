"""Provider-call batching, retrieval, transcript, and transition tests."""

from datetime import datetime
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.models import Job, Provider, ProviderCall
from tests.test_jobs import create_job
from tests.test_providers import create_provider
from tests.test_specifications import specification_payload


def create_confirmed_job(client: TestClient) -> dict:
    job = create_job(client)
    specification_response = client.put(
        f"/api/v1/jobs/{job['id']}/specification",
        json=specification_payload(),
    )
    assert specification_response.status_code == 201
    confirmation_response = client.post(
        f"/api/v1/jobs/{job['id']}/specification/confirm"
    )
    assert confirmation_response.status_code == 200
    return job


def create_three_providers(client: TestClient) -> list[dict]:
    return [
        create_provider(client, "Alpha Movers"),
        create_provider(client, "Bravo Movers"),
        create_provider(client, "Charlie Movers"),
    ]


def create_batch(client: TestClient, job_id: str, providers: list[dict]):
    return client.post(
        f"/api/v1/jobs/{job_id}/provider-calls/batch",
        json={"provider_ids": [provider["id"] for provider in providers]},
    )


def test_reject_batch_when_job_does_not_exist(client: TestClient) -> None:
    providers = create_three_providers(client)

    response = create_batch(client, str(uuid4()), providers)

    assert response.status_code == 404


def test_reject_batch_before_specification_exists(client: TestClient) -> None:
    job = create_job(client)
    providers = create_three_providers(client)

    response = create_batch(client, job["id"], providers)

    assert response.status_code == 409


def test_reject_batch_before_specification_confirmation(client: TestClient) -> None:
    job = create_job(client)
    client.put(f"/api/v1/jobs/{job['id']}/specification", json=specification_payload())
    providers = create_three_providers(client)

    response = create_batch(client, job["id"], providers)

    assert response.status_code == 409


@pytest.mark.parametrize(
    "provider_ids",
    [
        [str(uuid4()), str(uuid4())],
        [str(uuid4()), str(uuid4()), str(uuid4()), str(uuid4())],
        [str(uuid4())] * 3,
    ],
)
def test_reject_batch_without_exactly_three_distinct_ids(
    client: TestClient, provider_ids: list[str]
) -> None:
    job = create_confirmed_job(client)

    response = client.post(
        f"/api/v1/jobs/{job['id']}/provider-calls/batch",
        json={"provider_ids": provider_ids},
    )

    assert response.status_code == 422


def test_unknown_provider_rejects_batch_atomically(client: TestClient) -> None:
    job = create_confirmed_job(client)
    providers = create_three_providers(client)
    provider_ids = [providers[0]["id"], providers[1]["id"], str(uuid4())]

    response = client.post(
        f"/api/v1/jobs/{job['id']}/provider-calls/batch",
        json={"provider_ids": provider_ids},
    )

    assert response.status_code == 404
    assert client.get(f"/api/v1/jobs/{job['id']}/provider-calls").json() == []


def test_create_exactly_three_calls_and_update_job_status(client: TestClient) -> None:
    job = create_confirmed_job(client)
    providers = create_three_providers(client)

    response = create_batch(client, job["id"], providers)

    assert response.status_code == 201
    calls = response.json()
    assert len(calls) == 3
    assert len({call["provider_id"] for call in calls}) == 3
    assert all(call["status"] == "pending" for call in calls)
    assert all(call["provider"]["name"] for call in calls)
    job_response = client.get(f"/api/v1/jobs/{job['id']}")
    assert job_response.json()["status"] == "calls_in_progress"


def test_identical_batch_is_idempotent_even_when_reordered(client: TestClient) -> None:
    job = create_confirmed_job(client)
    providers = create_three_providers(client)
    first = create_batch(client, job["id"], providers)

    repeated = create_batch(client, job["id"], list(reversed(providers)))

    assert first.status_code == 201
    assert repeated.status_code == 200
    assert {call["id"] for call in repeated.json()} == {
        call["id"] for call in first.json()
    }


def test_conflicting_second_batch_returns_409(client: TestClient) -> None:
    job = create_confirmed_job(client)
    providers = create_three_providers(client)
    create_batch(client, job["id"], providers)
    replacement = create_provider(client, "Delta Movers")

    response = create_batch(
        client, job["id"], [providers[0], providers[1], replacement]
    )

    assert response.status_code == 409


def test_list_and_retrieve_calls_with_provider(client: TestClient) -> None:
    job = create_confirmed_job(client)
    providers = create_three_providers(client)
    created = create_batch(client, job["id"], providers).json()

    listed = client.get(f"/api/v1/jobs/{job['id']}/provider-calls")
    retrieved = client.get(f"/api/v1/provider-calls/{created[0]['id']}")

    assert listed.status_code == 200
    assert [call["id"] for call in listed.json()] == [call["id"] for call in created]
    assert retrieved.status_code == 200
    assert retrieved.json()["provider"]["id"] == retrieved.json()["provider_id"]


def test_existing_job_without_calls_returns_empty_list(client: TestClient) -> None:
    job = create_job(client)

    response = client.get(f"/api/v1/jobs/{job['id']}/provider-calls")

    assert response.status_code == 200
    assert response.json() == []


def test_missing_call_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/v1/provider-calls/{uuid4()}")

    assert response.status_code == 404


def test_call_lifecycle_stores_transcript_and_recording(client: TestClient) -> None:
    job = create_confirmed_job(client)
    providers = create_three_providers(client)
    call = create_batch(client, job["id"], providers).json()[0]

    started = client.patch(
        f"/api/v1/provider-calls/{call['id']}",
        json={"status": "in_progress", "external_call_id": "manual_call_123"},
    )
    assert started.status_code == 200
    assert started.json()["started_at"] is not None
    assert datetime.fromisoformat(started.json()["started_at"]).tzinfo is not None

    completed = client.patch(
        f"/api/v1/provider-calls/{call['id']}",
        json={
            "status": "completed",
            "duration_seconds": 123,
            "elevenlabs_conversation_id": "conv_demo_123",
            "recording_url": "https://example.com/recordings/call.mp3",
            "summary": "Provider supplied a complete quote.",
            "transcript": [
                {"speaker": "agent", "text": "Please provide a quote.", "sequence": 0},
                {
                    "speaker": "provider",
                    "text": "The total is 2200 euros.",
                    "timestamp_seconds": 4.5,
                    "sequence": 1,
                },
            ],
        },
    )

    body = completed.json()
    assert completed.status_code == 200
    assert body["completed_at"] is not None
    assert body["duration_seconds"] == 123
    assert len(body["transcript"]) == 2
    assert body["transcript_text"] == (
        "Agent: Please provide a quote.\nProvider: The total is 2200 euros."
    )
    assert body["recording_url"] == "https://example.com/recordings/call.mp3"
    assert body["elevenlabs_conversation_id"] == "conv_demo_123"


def test_store_explicit_transcript_text(client: TestClient) -> None:
    job = create_confirmed_job(client)
    call = create_batch(client, job["id"], create_three_providers(client)).json()[0]

    response = client.patch(
        f"/api/v1/provider-calls/{call['id']}",
        json={"transcript_text": "Agent: Manual transcript"},
    )

    assert response.status_code == 200
    assert response.json()["transcript_text"] == "Agent: Manual transcript"


@pytest.mark.parametrize(
    "payload",
    [
        {"duration_seconds": -1},
        {"recording_url": "ftp://example.com/call.mp3"},
        {"transcript": [{"speaker": "agent", "text": "   "}]},
    ],
)
def test_reject_invalid_call_data(client: TestClient, payload: dict) -> None:
    job = create_confirmed_job(client)
    call = create_batch(client, job["id"], create_three_providers(client)).json()[0]

    response = client.patch(f"/api/v1/provider-calls/{call['id']}", json=payload)

    assert response.status_code == 422


@pytest.mark.parametrize("immutable_field", ["job_id", "provider_id", "created_at"])
def test_reject_immutable_or_unknown_call_fields(
    client: TestClient, immutable_field: str
) -> None:
    job = create_confirmed_job(client)
    call = create_batch(client, job["id"], create_three_providers(client)).json()[0]

    response = client.patch(
        f"/api/v1/provider-calls/{call['id']}",
        json={immutable_field: str(uuid4())},
    )

    assert response.status_code == 422


def test_completed_call_cannot_return_to_pending(client: TestClient) -> None:
    job = create_confirmed_job(client)
    call = create_batch(client, job["id"], create_three_providers(client)).json()[0]
    client.patch(f"/api/v1/provider-calls/{call['id']}", json={"status": "completed"})

    response = client.patch(
        f"/api/v1/provider-calls/{call['id']}", json={"status": "pending"}
    )

    assert response.status_code == 409


def test_failed_call_does_not_fail_job_and_cannot_restart(client: TestClient) -> None:
    job = create_confirmed_job(client)
    call = create_batch(client, job["id"], create_three_providers(client)).json()[0]

    failed = client.patch(
        f"/api/v1/provider-calls/{call['id']}",
        json={"status": "failed", "error_message": "Provider unavailable"},
    )
    restarted = client.patch(
        f"/api/v1/provider-calls/{call['id']}", json={"status": "in_progress"}
    )

    assert failed.status_code == 200
    assert failed.json()["status"] == "failed"
    assert restarted.status_code == 409
    assert (
        client.get(f"/api/v1/jobs/{job['id']}").json()["status"] == "calls_in_progress"
    )


def test_all_calls_can_complete_while_job_remains_calls_in_progress(
    client: TestClient,
) -> None:
    job = create_confirmed_job(client)
    calls = create_batch(client, job["id"], create_three_providers(client)).json()

    for call in calls:
        response = client.patch(
            f"/api/v1/provider-calls/{call['id']}", json={"status": "completed"}
        )
        assert response.status_code == 200

    listed = client.get(f"/api/v1/jobs/{job['id']}/provider-calls").json()
    assert all(call["status"] == "completed" for call in listed)
    assert (
        client.get(f"/api/v1/jobs/{job['id']}").json()["status"] == "calls_in_progress"
    )


def test_deleting_job_deletes_calls_but_retains_providers(client: TestClient) -> None:
    job = create_confirmed_job(client)
    providers = create_three_providers(client)
    calls = create_batch(client, job["id"], providers).json()

    with client.app.state.session_factory() as db:
        stored_job = db.get(Job, UUID(job["id"]))
        assert stored_job is not None
        db.delete(stored_job)
        db.commit()

        assert db.get(ProviderCall, UUID(calls[0]["id"])) is None
        assert db.get(Provider, UUID(providers[0]["id"])) is not None
