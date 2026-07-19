"""Text, document, and voice intake tests."""

from pathlib import Path
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.models import Intake
from app.services import intakes as intake_service
from tests.test_jobs import create_job


def test_add_text_intake_and_update_job_status(client: TestClient) -> None:
    job = create_job(client)

    response = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/text",
        json={"text": "  Move one sofa and twenty boxes.  "},
    )

    assert response.status_code == 201
    assert response.json()["intake_type"] == "text"
    assert response.json()["raw_text"] == "Move one sofa and twenty boxes."
    assert client.get(f"/api/v1/jobs/{job['id']}").json()["status"] == "intake_received"


def test_reject_blank_text_intake(client: TestClient) -> None:
    job = create_job(client)

    response = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/text", json={"text": "   "}
    )

    assert response.status_code == 422


def test_upload_uses_generated_safe_relative_filename(client: TestClient) -> None:
    job = create_job(client)

    response = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/upload",
        files={"file": ("../../proposal.exe", b"moving details", "text/plain")},
    )

    assert response.status_code == 201
    intake = response.json()
    relative_path = Path(intake["file_path"])
    assert intake["intake_type"] == "document"
    assert intake["original_filename"] == "proposal.exe"
    assert not relative_path.is_absolute()
    assert ".." not in relative_path.parts
    assert relative_path.parent == Path(job["id"])
    assert relative_path.suffix == ".txt"
    UUID(relative_path.stem)
    stored_path = client.app.state.settings.upload_dir / relative_path
    assert stored_path.read_bytes() == b"moving details"

    with client.app.state.session_factory() as db:
        stored_intake = db.get(Intake, UUID(intake["id"]))
        assert stored_intake is not None
        assert stored_intake.file_path == relative_path.as_posix()


def test_reject_unsupported_upload_without_leaving_file(client: TestClient) -> None:
    job = create_job(client)

    response = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/upload",
        files={"file": ("malware.exe", b"binary", "application/octet-stream")},
    )

    assert response.status_code == 415
    assert not (client.app.state.settings.upload_dir / job["id"]).exists()


def test_reject_empty_upload_and_clean_partial_file(client: TestClient) -> None:
    job = create_job(client)

    response = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/upload",
        files={"file": ("empty.txt", b"", "text/plain")},
    )

    assert response.status_code == 400
    job_directory = client.app.state.settings.upload_dir / job["id"]
    assert list(job_directory.iterdir()) == []


def test_reject_oversized_upload_and_clean_partial_file(client: TestClient) -> None:
    job = create_job(client)

    response = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/upload",
        files={"file": ("large.txt", b"x" * (1024 * 1024 + 1), "text/plain")},
    )

    assert response.status_code == 413
    job_directory = client.app.state.settings.upload_dir / job["id"]
    assert list(job_directory.iterdir()) == []


def test_database_failure_removes_stored_upload(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    job = create_job(client)

    def fail_to_save(*_args, **_kwargs):
        raise SQLAlchemyError("simulated database failure")

    monkeypatch.setattr(intake_service, "_save_intake", fail_to_save)

    response = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/upload",
        files={"file": ("move.txt", b"moving details", "text/plain")},
    )

    assert response.status_code == 500
    job_directory = client.app.state.settings.upload_dir / job["id"]
    assert list(job_directory.iterdir()) == []


def test_save_voice_reference(client: TestClient) -> None:
    job = create_job(client)

    response = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/voice-reference",
        json={
            "conversation_id": "conv_demo_123",
            "transcript": "Move from Dresden to Berlin",
        },
    )

    assert response.status_code == 201
    assert response.json()["intake_type"] == "voice"
    assert response.json()["external_reference"] == "conv_demo_123"


def test_reject_voice_intake_without_reference_or_transcript(
    client: TestClient,
) -> None:
    job = create_job(client)

    response = client.post(f"/api/v1/jobs/{job['id']}/intakes/voice-reference", json={})

    assert response.status_code == 422


def test_list_intakes_oldest_first(client: TestClient) -> None:
    job = create_job(client)
    first = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/text", json={"text": "First intake"}
    ).json()
    second = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/voice-reference",
        json={"conversation_id": "second"},
    ).json()

    response = client.get(f"/api/v1/jobs/{job['id']}/intakes")

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [first["id"], second["id"]]
    assert [item["sequence"] for item in response.json()] == [1, 2]


def test_intake_sequences_are_scoped_per_job(client: TestClient) -> None:
    first_job = create_job(client, title="First move")
    second_job = create_job(client, title="Second move")

    first_job_intake = client.post(
        f"/api/v1/jobs/{first_job['id']}/intakes/text",
        json={"text": "First job intake"},
    )
    second_job_intake = client.post(
        f"/api/v1/jobs/{second_job['id']}/intakes/text",
        json={"text": "Second job intake"},
    )

    assert first_job_intake.json()["sequence"] == 1
    assert second_job_intake.json()["sequence"] == 1


def test_client_cannot_override_intake_sequence(client: TestClient) -> None:
    job = create_job(client)

    first = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/text",
        json={"text": "First intake", "sequence": 99},
    )
    second = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/voice-reference",
        json={"conversation_id": "second", "sequence": 99},
    )

    assert first.json()["sequence"] == 1
    assert second.json()["sequence"] == 2


def test_all_intake_types_share_sequence_assignment(client: TestClient) -> None:
    job = create_job(client)

    text = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/text",
        json={"text": "Text intake"},
    )
    document = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/upload",
        files={"file": ("move.txt", b"Document intake", "text/plain")},
    )
    voice = client.post(
        f"/api/v1/jobs/{job['id']}/intakes/voice-reference",
        json={"conversation_id": "voice-intake"},
    )

    assert [
        text.json()["sequence"],
        document.json()["sequence"],
        voice.json()["sequence"],
    ] == [1, 2, 3]


def test_intake_requires_existing_job(client: TestClient) -> None:
    response = client.post(
        f"/api/v1/jobs/{uuid4()}/intakes/text", json={"text": "Move details"}
    )

    assert response.status_code == 404
