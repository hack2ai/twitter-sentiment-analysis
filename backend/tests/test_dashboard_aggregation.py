import os
import uuid

os.environ.setdefault("AUTH_RATE_LIMIT", "100")
os.environ.setdefault("AUTH_RATE_WINDOW_SECONDS", "60")
os.environ.setdefault("SECRET_KEY", "ci-test-secret-key")
os.environ.setdefault("ENVIRONMENT", "test")

import main as main_module
from fastapi.testclient import TestClient

from models import Analysis

client = TestClient(main_module.app)


def test_dashboard_aggregation_counts_sentiments_and_average_confidence(monkeypatch) -> None:
    suffix = uuid.uuid4().hex[:10]
    email = f"dashboard-{suffix}@example.com"
    password = "TestPassword123!"

    register = client.post(
        "/auth/register",
        json={"name": "Dashboard User", "email": email, "password": password},
    )
    assert register.status_code == 201
    token = register.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    user_id = register.json()["user"]["id"]
    db = next(main_module.get_db())
    try:
        db.add_all(
            [
                Analysis(
                    user_id=user_id,
                    text="positive example",
                    cleaned_text="positive example",
                    sentiment="positive",
                    confidence=0.80,
                    method="test_model",
                ),
                Analysis(
                    user_id=user_id,
                    text="negative example",
                    cleaned_text="negative example",
                    sentiment="negative",
                    confidence=0.60,
                    method="test_model",
                ),
                Analysis(
                    user_id=user_id,
                    text="neutral example",
                    cleaned_text="neutral example",
                    sentiment="neutral",
                    confidence=1.00,
                    method="test_model",
                ),
            ]
        )
        db.commit()
    finally:
        db.close()

    response = client.get("/analyses/dashboard", headers=headers)
    assert response.status_code == 200
    assert response.json() == {
        "total_analyses": 3,
        "positive": 1,
        "negative": 1,
        "neutral": 1,
        "average_confidence": 0.8,
    }
