import uuid

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def register_user() -> tuple[str, str, str]:
    suffix = uuid.uuid4().hex[:10]
    email = f"ci-{suffix}@example.com"
    password = "TestPassword123!"
    response = client.post(
        "/auth/register",
        json={"name": "CI User", "email": email, "password": password},
    )
    assert response.status_code == 201
    payload = response.json()
    return email, password, payload["access_token"]


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    assert payload["database"] == "ready"


def test_register_login_and_me() -> None:
    email, password, token = register_user()

    login = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login.status_code == 200
    assert login.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_wrong_password_returns_401() -> None:
    email, _, _ = register_user()
    response = client.post(
        "/auth/login",
        json={"email": email, "password": "DefinitelyWrong123!"},
    )
    assert response.status_code == 401


def test_protected_dashboard_requires_authentication() -> None:
    response = client.get("/analyses/dashboard")
    assert response.status_code in (401, 403)


def test_save_history_dashboard_and_delete() -> None:
    _, _, token = register_user()
    headers = {"Authorization": f"Bearer {token}"}

    before = client.get("/analyses/dashboard", headers=headers)
    assert before.status_code == 200
    before_stats = before.json()

    saved = client.post(
        "/analyses/text",
        headers=headers,
        json={"text": "I love this amazing application!"},
    )
    assert saved.status_code == 200
    saved_payload = saved.json()
    assert saved_payload["sentiment"] in {"positive", "negative", "neutral"}
    assert 0 <= saved_payload["confidence"] <= 1

    history = client.get("/analyses/history", headers=headers)
    assert history.status_code == 200
    history_payload = history.json()
    assert history_payload["count"] == 1
    analysis_id = history_payload["items"][0]["id"]

    after = client.get("/analyses/dashboard", headers=headers)
    assert after.status_code == 200
    after_stats = after.json()
    assert after_stats["total_analyses"] == before_stats["total_analyses"] + 1

    deleted = client.delete(f"/analyses/{analysis_id}", headers=headers)
    assert deleted.status_code == 204

    history_after_delete = client.get("/analyses/history", headers=headers)
    assert history_after_delete.status_code == 200
    assert history_after_delete.json()["count"] == 0


def test_analysis_isolation_between_users() -> None:
    _, _, token_a = register_user()
    _, _, token_b = register_user()
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    saved = client.post(
        "/analyses/text",
        headers=headers_a,
        json={"text": "This belongs to user A."},
    )
    assert saved.status_code == 200

    history_a = client.get("/analyses/history", headers=headers_a)
    history_b = client.get("/analyses/history", headers=headers_b)
    assert history_a.status_code == 200
    assert history_b.status_code == 200
    assert history_a.json()["count"] == 1
    assert history_b.json()["count"] == 0

    analysis_id = history_a.json()["items"][0]["id"]
    forbidden_delete = client.delete(f"/analyses/{analysis_id}", headers=headers_b)
    assert forbidden_delete.status_code == 404


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
