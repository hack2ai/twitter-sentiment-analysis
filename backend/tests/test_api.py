import os

os.environ.setdefault("SECRET_KEY", "test-secret-key")

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_register_login_and_me() -> None:
    email = "ci-user@example.com"
    password = "TestPassword123!"

    register = client.post(
        "/auth/register",
        json={"name": "CI User", "email": email, "password": password},
    )

    if register.status_code == 409:
        login = client.post(
            "/auth/login",
            json={"email": email, "password": password},
        )
    else:
        assert register.status_code == 201
        login = client.post(
            "/auth/login",
            json={"email": email, "password": password},
        )

    assert login.status_code == 200
    token = login.json()["access_token"]
    assert token

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_wrong_password_returns_401() -> None:
    email = "wrong-password@example.com"
    password = "CorrectPassword123!"

    register = client.post(
        "/auth/register",
        json={"name": "Wrong Password", "email": email, "password": password},
    )
    if register.status_code not in (201, 409):
        raise AssertionError(register.text)

    response = client.post(
        "/auth/login",
        json={"email": email, "password": "DefinitelyWrong123!"},
    )
    assert response.status_code == 401


def test_protected_dashboard_requires_authentication() -> None:
    response = client.get("/analyses/dashboard")
    assert response.status_code in (401, 403)


def test_analyze_text() -> None:
    response = client.post(
        "/analyze/text",
        json={"text": "I love this amazing application!"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["sentiment"] in {"positive", "negative", "neutral"}
    assert 0 <= payload["confidence"] <= 1
    assert payload["cleaned_text"]
