import os
import uuid

os.environ.setdefault("AUTH_RATE_LIMIT", "100")
os.environ.setdefault("AUTH_RATE_WINDOW_SECONDS", "60")
os.environ.setdefault("SECRET_KEY", "ci-test-secret-key")
os.environ.setdefault("ENVIRONMENT", "test")

from fastapi.testclient import TestClient

import main as main_module

client = TestClient(main_module.app)


def test_auth_responses_are_not_cached() -> None:
    response = client.post(
        "/auth/login",
        json={"email": "missing@example.com", "password": "not-a-real-password"},
    )
    assert response.status_code == 401
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["pragma"] == "no-cache"


def test_production_responses_include_hsts(monkeypatch) -> None:
    monkeypatch.setattr(main_module, "ENVIRONMENT", "production")
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers["strict-transport-security"] == "max-age=31536000; includeSubDomains"


def test_duplicate_registration_returns_conflict() -> None:
    email = f"duplicate-{uuid.uuid4().hex[:10]}@example.com"
    payload = {"name": "Duplicate Test", "email": email, "password": "TestPassword123!"}

    first = client.post("/auth/register", json=payload)
    assert first.status_code == 201

    duplicate = client.post("/auth/register", json=payload)
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "An account with this email already exists."
