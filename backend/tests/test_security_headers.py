import os

os.environ.setdefault("AUTH_RATE_LIMIT", "100")
os.environ.setdefault("AUTH_RATE_WINDOW_SECONDS", "60")
os.environ.setdefault("SECRET_KEY", "ci-test-secret-key")
os.environ.setdefault("ENVIRONMENT", "test")

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_auth_responses_are_not_cached() -> None:
    response = client.post(
        "/auth/login",
        json={"email": "missing@example.com", "password": "not-a-real-password"},
    )
    assert response.status_code == 401
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["pragma"] == "no-cache"
