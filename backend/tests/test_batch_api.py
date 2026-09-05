import os

os.environ.setdefault("AUTH_RATE_LIMIT", "100")
os.environ.setdefault("AUTH_RATE_WINDOW_SECONDS", "60")
os.environ.setdefault("SECRET_KEY", "ci-test-secret-key")
os.environ.setdefault("ENVIRONMENT", "test")

import main as main_module
from fastapi.testclient import TestClient

client = TestClient(main_module.app)


def test_batch_rejects_non_csv_upload() -> None:
    response = client.post(
        "/analyze/batch",
        files={"file": ("notes.txt", b"text\nhello\n", "text/plain")},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Only CSV files are supported."


def test_batch_accepts_text_column(monkeypatch) -> None:
    monkeypatch.setattr(
        main_module,
        "predict_sentiment",
        lambda text: {
            "sentiment": "positive",
            "confidence": 0.95,
            "method": "test_model",
            "cleaned_text": text.lower(),
        },
    )
    response = client.post(
        "/analyze/batch",
        files={"file": ("sample.csv", b"text\nI love this\nThis is great\n", "text/csv")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["summary"] == {"positive": 2, "negative": 0, "neutral": 0, "total": 2}
    assert payload["metadata"]["rows_received"] == 2
    assert payload["metadata"]["rows_analyzed"] == 2
    assert payload["metadata"]["rows_skipped"] == 0
    assert payload["metadata"]["text_column"] == "text"
    assert len(payload["results"]) == 2


def test_batch_enforces_row_limit(monkeypatch) -> None:
    monkeypatch.setattr(main_module, "MAX_BATCH_ROWS", 1)
    response = client.post(
        "/analyze/batch",
        files={"file": ("rows.csv", b"text\nfirst\nsecond\n", "text/csv")},
    )
    assert response.status_code == 413
    assert response.json()["detail"] == "CSV contains 2 rows. Maximum supported rows: 1."


def test_batch_reports_missing_text_column() -> None:
    response = client.post(
        "/analyze/batch",
        files={"file": ("numbers.csv", b"id,score\n1,10\n2,20\n", "text/csv")},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Could not find a text column in the CSV."
