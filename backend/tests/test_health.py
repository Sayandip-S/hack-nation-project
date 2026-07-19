"""Root and health endpoint tests."""

import pytest
from fastapi.testclient import TestClient

from app import main as main_module


def test_root_returns_existing_response(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Backend is running"}


def test_health_reports_connected_database(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}


def test_health_returns_safe_unhealthy_response(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(main_module, "database_is_healthy", lambda _engine: False)

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {"status": "unhealthy", "database": "disconnected"}
