from __future__ import annotations

import io
import json
import os
from collections import Counter
from typing import AsyncGenerator, List

import pandas as pd
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from auth import create_access_token, get_current_user, hash_password, verify_password
from database import get_db
from ml.predict import predict_sentiment
from models import Analysis, User
from rate_limit import AuthRateLimitMiddleware

APP_VERSION = "3.0.0"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
MAX_BATCH_ROWS = int(os.getenv("MAX_BATCH_ROWS", "1000"))
MAX_BATCH_FILE_BYTES = int(os.getenv("MAX_BATCH_FILE_BYTES", str(10 * 1024 * 1024)))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
AUTH_RATE_LIMIT = int(os.getenv("AUTH_RATE_LIMIT", "5"))
AUTH_RATE_WINDOW_SECONDS = int(os.getenv("AUTH_RATE_WINDOW_SECONDS", "60"))

app = FastAPI(
    title="Social Sentiment Intelligence API",
    version=APP_VERSION,
    description="Sentiment intelligence API with machine learning, authentication, analytics, and persistent history.",
)
app.add_middleware(
    AuthRateLimitMiddleware,
    limit=max(1, AUTH_RATE_LIMIT),
    window_seconds=max(1, AUTH_RATE_WINDOW_SECONDS),
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.path.startswith("/auth/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    if ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class SentimentResponse(BaseModel):
    sentiment: str
    confidence: float
    method: str
    cleaned_text: str
    original_text: str | None = None


class BatchSentimentResponse(BaseModel):
    results: List[dict]
    summary: dict
    metadata: dict


def _validate_and_analyze(text_value: str) -> dict:
    cleaned = text_value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(cleaned) > 5000:
        raise HTTPException(status_code=400, detail="Text exceeds the 5000-character limit.")
    return {"original_text": cleaned, **predict_sentiment(cleaned)}


async def _read_upload_with_limit(file: UploadFile) -> bytes:
    chunks: list[bytes] = []
    total = 0
    chunk_size = 1024 * 1024
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_BATCH_FILE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"CSV file is too large. Maximum supported size: {MAX_BATCH_FILE_BYTES} bytes.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


def _analysis_to_dict(analysis: Analysis) -> dict:
    return {
        "id": analysis.id,
        "text": analysis.text,
        "cleaned_text": analysis.cleaned_text,
        "sentiment": analysis.sentiment,
        "confidence": analysis.confidence,
        "method": analysis.method,
        "created_at": analysis.created_at.isoformat(),
    }


@app.get("/")
def read_root():
    return {"name": "Social Sentiment Intelligence API", "version": APP_VERSION, "status": "ok", "docs": "/docs"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "version": APP_VERSION, "database": "ready"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database is not ready.") from exc


@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    email = str(request.email).lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(name=request.name.strip(), email=email, password_hash=hash_password(request.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "user": {"id": user.id, "name": user.name, "email": user.email},
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
    }


@app.post("/auth/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(request.email).lower()).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return {
        "user": {"id": user.id, "name": user.name, "email": user.email},
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
    }


@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "created_at": current_user.created_at.isoformat(),
    }


@app.post("/analyze/text", response_model=SentimentResponse)
def analyze_text(request: TextRequest):
    return SentimentResponse(**_validate_and_analyze(request.text))


@app.post("/analyses/text", response_model=SentimentResponse)
def analyze_and_save_text(
    request: TextRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = _validate_and_analyze(request.text)
    db.add(
        Analysis(
            user_id=current_user.id,
            text=result["original_text"],
            cleaned_text=result["cleaned_text"],
            sentiment=result["sentiment"],
            confidence=result["confidence"],
            method=result["method"],
        )
    )
    db.commit()
    return SentimentResponse(**result)


@app.get("/analyses/history")
def analysis_history(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    limit = max(1, min(limit, 100))
    analyses = (
        db.query(Analysis)
        .filter(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
        .limit(limit)
        .all()
    )
    return {"items": [_analysis_to_dict(item) for item in analyses], "count": len(analyses)}


@app.get("/analyses/dashboard")
def analysis_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    analyses = db.query(Analysis).filter(Analysis.user_id == current_user.id).all()
    counts = Counter(item.sentiment for item in analyses)
    total = len(analyses)
    return {
        "total_analyses": total,
        "positive": counts["positive"],
        "negative": counts["negative"],
        "neutral": counts["neutral"],
        "average_confidence": round(sum(item.confidence for item in analyses) / total, 4) if total else 0,
    }


@app.delete("/analyses/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id, Analysis.user_id == current_user.id).first()
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    db.delete(analysis)
    db.commit()


@app.post("/analyze/batch", response_model=BatchSentimentResponse)
async def analyze_batch(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    try:
        contents = await _read_upload_with_limit(file)
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded CSV is empty.")
        df = pd.read_csv(io.BytesIO(contents))
        if df.empty:
            raise HTTPException(status_code=400, detail="Uploaded CSV contains no rows.")
        if len(df) > MAX_BATCH_ROWS:
            raise HTTPException(
                status_code=413,
                detail=f"CSV contains {len(df)} rows. Maximum supported rows: {MAX_BATCH_ROWS}.",
            )
        columns = {str(column).strip().lower(): column for column in df.columns}
        text_column = next(
            (columns[c] for c in ("text", "tweet", "content", "message") if c in columns),
            None,
        )
        if text_column is None:
            strings = df.select_dtypes(include=["object", "string"]).columns.tolist()
            if not strings:
                raise HTTPException(status_code=400, detail="Could not find a text column in the CSV.")
            text_column = strings[0]

        results = []
        counts = Counter({"positive": 0, "negative": 0, "neutral": 0})
        skipped = 0
        for value in df[text_column].tolist():
            item = "" if pd.isna(value) else str(value).strip()
            if not item:
                skipped += 1
                continue
            result = _validate_and_analyze(item)
            counts[result["sentiment"]] += 1
            results.append(result)

        total = len(results)
        summary = {
            "positive": counts["positive"],
            "negative": counts["negative"],
            "neutral": counts["neutral"],
            "total": total,
        }
        return BatchSentimentResponse(
            results=results,
            summary=summary,
            metadata={
                "file_name": filename,
                "text_column": str(text_column),
                "rows_received": len(df),
                "rows_analyzed": total,
                "rows_skipped": skipped,
                "percentages": {
                    key: round((value / total) * 100, 2) if total else 0 for key, value in counts.items()
                },
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unexpected error while processing the CSV.") from exc


@app.get("/metrics")
def get_metrics():
    path = os.path.join(os.path.dirname(__file__), "ml", "metrics.json")
    if not os.path.exists(path):
        return {"message": "Metrics not found. Train the model first."}
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


@app.get("/wordcloud")
def get_wordcloud():
    return [
        {"text": "amazing", "value": 10},
        {"text": "great", "value": 9},
        {"text": "love", "value": 8},
        {"text": "happy", "value": 7},
        {"text": "good", "value": 6},
        {"text": "terrible", "value": 6},
        {"text": "worst", "value": 5},
    ]
