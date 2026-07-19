"""Provider CRUD and validation tests."""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient


def create_provider(client: TestClient, name: str = "Dresden Movers GmbH") -> dict:
    response = client.post(
        "/api/v1/providers",
        json={
            "name": name,
            "phone": "+491701234567",
            "email": "quotes@example.com",
            "website": "https://example.com",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_create_and_retrieve_provider(client: TestClient) -> None:
    provider = create_provider(client)

    response = client.get(f"/api/v1/providers/{provider['id']}")

    assert response.status_code == 200
    assert response.json() == provider
    assert provider["name"] == "Dresden Movers GmbH"


def test_list_providers_deterministically_and_honor_limit(client: TestClient) -> None:
    create_provider(client, "Zulu Movers")
    alpha = create_provider(client, "Alpha Movers")

    response = client.get("/api/v1/providers", params={"limit": 1})

    assert response.status_code == 200
    assert [provider["id"] for provider in response.json()] == [alpha["id"]]


def test_patch_provider(client: TestClient) -> None:
    provider = create_provider(client)

    response = client.patch(
        f"/api/v1/providers/{provider['id']}",
        json={"name": "  Updated Movers  ", "phone": None},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated Movers"
    assert response.json()["phone"] is None


def test_reject_blank_provider_name(client: TestClient) -> None:
    response = client.post("/api/v1/providers", json={"name": "   "})

    assert response.status_code == 422


def test_reject_invalid_provider_email(client: TestClient) -> None:
    response = client.post(
        "/api/v1/providers", json={"name": "Mover", "email": "invalid"}
    )

    assert response.status_code == 422


def test_reject_invalid_provider_website(client: TestClient) -> None:
    response = client.post(
        "/api/v1/providers",
        json={"name": "Mover", "website": "ftp://example.com"},
    )

    assert response.status_code == 422


@pytest.mark.parametrize("phone", ["01701234567", "+49-170-123", "+abc"])
def test_reject_malformed_provider_phone(client: TestClient, phone: str) -> None:
    response = client.post("/api/v1/providers", json={"name": "Mover", "phone": phone})

    assert response.status_code == 422


def test_provider_phone_is_optional(client: TestClient) -> None:
    response = client.post("/api/v1/providers", json={"name": "Manual Provider"})

    assert response.status_code == 201
    assert response.json()["phone"] is None


def test_missing_provider_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/v1/providers/{uuid4()}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Provider not found"}
