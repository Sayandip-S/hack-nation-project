"""AI provider abstraction and specification-extraction endpoint tests."""

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.main import create_app
from app.services import ai_providers
from tests.test_jobs import create_job
from tests.test_specifications import specification_payload


def complete_extraction(**overrides: Any) -> dict[str, Any]:
    return {
        "origin_address": "Dresden, Germany",
        "destination_address": "Berlin, Germany",
        "move_date": "2026-07-25",
        "property_type": "apartment",
        "origin_floor": 2,
        "destination_floor": 4,
        "origin_has_elevator": False,
        "destination_has_elevator": True,
        "bedrooms": 2,
        "estimated_volume_m3": 28.5,
        "packing_required": True,
        "disassembly_required": False,
        "reassembly_required": False,
        "storage_required": False,
        "inventory": [{"name": "Sofa", "quantity": 1}],
        "special_items": [{"name": "Piano", "quantity": 1}],
        "access_notes": "Narrow origin staircase",
        "additional_notes": "Customer prefers a morning move",
        "confidence": 0.92,
        "missing_fields": [],
        "clarification_questions": [],
        **overrides,
    }


def live_client(tmp_path: Path, **overrides: Any) -> TestClient:
    settings = Settings(
        database_url=f"sqlite:///{(tmp_path / 'live-test.db').as_posix()}",
        upload_dir=tmp_path / "uploads",
        max_upload_size_mb=1,
        ai_provider="openai",
        ai_mock_mode=False,
        _env_file=None,
        **overrides,
    )
    return TestClient(create_app(settings))


def add_complete_intake(client: TestClient, job_id: str) -> dict[str, Any]:
    response = client.post(
        f"/api/v1/jobs/{job_id}/intakes/text",
        json={
            "text": (
                "Move from Dresden, Germany to Berlin, Germany on 2026-07-25. "
                "It is a 2-bedroom apartment with 20 boxes and 1 sofa. "
                "Packing required."
            )
        },
    )
    assert response.status_code == 201
    return response.json()


def test_mock_extraction_is_deterministic_and_saves_draft(
    client: TestClient,
) -> None:
    job = create_job(client)
    intake = add_complete_intake(client, job["id"])

    first = client.post(f"/api/v1/jobs/{job['id']}/extract-specification")
    second = client.post(f"/api/v1/jobs/{job['id']}/extract-specification")

    assert first.status_code == 200
    assert second.status_code == 200
    first_body = first.json()
    second_body = second.json()
    assert first_body["provider"] == "mock"
    assert first_body["model"] == "deterministic-v1"
    assert first_body["source_intake_id"] == intake["id"]
    assert first_body["specification"]["status"] == "draft"
    assert first_body["specification"]["origin_address"] == "Dresden, Germany"
    assert first_body["extraction"] == second_body["extraction"]
    assert first_body["specification"]["id"] == second_body["specification"]["id"]


def test_extraction_requires_suitable_intake(client: TestClient) -> None:
    job = create_job(client)

    response = client.post(f"/api/v1/jobs/{job['id']}/extract-specification")

    assert response.status_code == 409
    assert response.json() == {
        "detail": "No suitable text intake is available for specification extraction"
    }


def test_extraction_requires_existing_job(client: TestClient) -> None:
    response = client.post(
        "/api/v1/jobs/00000000-0000-0000-0000-000000000000/extract-specification"
    )

    assert response.status_code == 404


def test_live_provider_requires_configuration(tmp_path: Path) -> None:
    with live_client(tmp_path) as client:
        job = create_job(client)
        add_complete_intake(client, job["id"])

        response = client.post(f"/api/v1/jobs/{job['id']}/extract-specification")

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Missing required settings: OPENAI_API_KEY, OPENAI_MODEL"
    }


def test_live_structured_response_uses_mocked_openai_client(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[dict[str, Any]] = []

    class FakeResponses:
        def parse(self, **kwargs: Any) -> SimpleNamespace:
            calls.append(kwargs)
            return SimpleNamespace(output_parsed=complete_extraction())

    class FakeOpenAI:
        def __init__(self, **kwargs: Any) -> None:
            assert kwargs["api_key"] == "test-openai-key"
            assert kwargs["base_url"] is None
            self.responses = FakeResponses()

    monkeypatch.setattr(ai_providers, "OpenAI", FakeOpenAI)
    with live_client(
        tmp_path,
        openai_api_key="test-openai-key",
        openai_model="test-structured-model",
    ) as client:
        job = create_job(client)
        add_complete_intake(client, job["id"])

        response = client.post(f"/api/v1/jobs/{job['id']}/extract-specification")

    assert response.status_code == 200
    assert response.json()["provider"] == "openai"
    assert response.json()["model"] == "test-structured-model"
    assert response.json()["extraction_confidence"] == 0.92
    assert len(calls) == 1
    assert calls[0]["model"] == "test-structured-model"
    assert calls[0]["text_format"] is ai_providers.MovingSpecificationExtraction
    assert calls[0]["store"] is False


def test_malformed_live_provider_output_returns_sanitized_error(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    class FakeResponses:
        def parse(self, **_kwargs: Any) -> SimpleNamespace:
            return SimpleNamespace(
                output_parsed=complete_extraction(
                    inventory=[{"name": "Sofa", "quantity": 0}]
                )
            )

    class FakeOpenAI:
        def __init__(self, **_kwargs: Any) -> None:
            self.responses = FakeResponses()

    monkeypatch.setattr(ai_providers, "OpenAI", FakeOpenAI)
    with live_client(
        tmp_path,
        openai_api_key="test-openai-key",
        openai_model="test-structured-model",
    ) as client:
        job = create_job(client)
        add_complete_intake(client, job["id"])

        response = client.post(f"/api/v1/jobs/{job['id']}/extract-specification")

    assert response.status_code == 502
    assert response.json() == {
        "detail": "AI provider returned an invalid structured response"
    }


def test_confirmed_specification_is_not_overwritten_or_sent_to_provider(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    job = create_job(client)
    add_complete_intake(client, job["id"])
    created = client.put(
        f"/api/v1/jobs/{job['id']}/specification", json=specification_payload()
    )
    client.post(f"/api/v1/jobs/{job['id']}/specification/confirm")

    def fail_if_called(*_args: Any, **_kwargs: Any) -> None:
        raise AssertionError(
            "provider must not be created for a confirmed specification"
        )

    monkeypatch.setattr(ai_providers, "create_ai_provider", fail_if_called)
    response = client.post(f"/api/v1/jobs/{job['id']}/extract-specification")
    stored = client.get(f"/api/v1/jobs/{job['id']}/specification")

    assert response.status_code == 409
    assert response.json() == {"detail": "Confirmed specifications are immutable"}
    assert stored.json()["id"] == created.json()["id"]
    assert stored.json()["status"] == "confirmed"


def test_mock_mode_never_constructs_external_client(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    job = create_job(client)
    add_complete_intake(client, job["id"])
    client.app.state.settings.ai_provider = "openai"
    client.app.state.settings.ai_mock_mode = True

    def fail_if_called(**_kwargs: Any) -> None:
        raise AssertionError("OpenAI client must not be constructed in mock mode")

    monkeypatch.setattr(ai_providers, "OpenAI", fail_if_called)

    response = client.post(f"/api/v1/jobs/{job['id']}/extract-specification")

    assert response.status_code == 200
    assert response.json()["provider"] == "mock"


def test_xai_reuses_openai_client_with_configured_base_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    class FakeOpenAI:
        def __init__(self, **kwargs: Any) -> None:
            captured.update(kwargs)

    monkeypatch.setattr(ai_providers, "OpenAI", FakeOpenAI)
    settings = Settings(
        ai_provider="xai",
        ai_mock_mode=False,
        xai_api_key="test-xai-key",
        xai_model="test-grok-model",
        xai_base_url="https://xai.example.test/v1",
        _env_file=None,
    )

    provider = ai_providers.create_ai_provider(settings)

    assert isinstance(provider, ai_providers.OpenAICompatibleProvider)
    assert provider.provider_name == "xai"
    assert provider.model == "test-grok-model"
    assert captured == {
        "api_key": "test-xai-key",
        "base_url": "https://xai.example.test/v1",
    }


def test_configuration_rejects_unknown_provider() -> None:
    with pytest.raises(ValidationError):
        Settings(ai_provider="unknown", _env_file=None)


def test_configuration_masks_api_keys() -> None:
    settings = Settings(openai_api_key="not-for-logs", _env_file=None)

    assert "not-for-logs" not in repr(settings)
