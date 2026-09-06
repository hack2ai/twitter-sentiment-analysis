import uuid

import pytest
from fastapi.testclient import TestClient

from auth import DEVELOPMENT_SECRET_KEY, validate_secret_key
from main import app


client = TestClient(app)


def test_register_login_and_me():
    email = f"test-{uuid.uuid4().hex}@example.com"
    password = "StrongPassword123"

    register = client.post(
        "/auth/register",
        json={"name": "Test User", "email": email, "password": password},
    )
    assert register.status_code == 201
    token = register.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email

    login = client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    assert login.json()["token_type"] == "bearer"


def test_protected_route_requires_token():
    response = client.get("/analyses/history")
    assert response.status_code in {401, 403}


@pytest.mark.parametrize("secret_key", ["", "   ", DEVELOPMENT_SECRET_KEY])
def test_production_requires_a_unique_secret_key(secret_key: str):
    with pytest.raises(RuntimeError, match="SECRET_KEY must be set to a strong unique value"):
        validate_secret_key("production", secret_key)


def test_production_accepts_a_unique_secret_key():
    validate_secret_key("production", "a-strong-unique-production-secret")


def test_non_production_allows_development_secret_key():
    validate_secret_key("development", DEVELOPMENT_SECRET_KEY)
