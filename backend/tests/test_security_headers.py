import os

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
