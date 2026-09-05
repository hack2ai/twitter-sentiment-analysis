import os

os.environ.setdefault("AUTH_RATE_LIMIT", "100")
os.environ.setdefault("AUTH_RATE_WINDOW_SECONDS", "60")
os.environ.setdefault("SECRET_KEY", "ci-test-secret-key")
os.environ.setdefault("ENVIRONMENT", "test")

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_cors_allows_configured_origin_and_required_headers() -> None:
    response = client.options(
        "/analyze/text",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert response.headers["access-control-allow-credentials"] == "true"
    assert "POST" in response.headers["access-control-allow-methods"]
    allowed_headers = response.headers["access-control-allow-headers"].lower()
    assert "authorization" in allowed_headers
    assert "content-type" in allowed_headers
    assert "accept" in allowed_headers


def test_cors_does_not_grant_access_to_unconfigured_origin() -> None:
    response = client.get(
        "/health",
        headers={"Origin": "https://evil.example"},
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
