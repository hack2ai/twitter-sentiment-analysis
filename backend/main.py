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
from sqlalchemy import case, func, text
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
    name = request.name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=422, detail="Name must contain at least 2 non-whitespace characters.")
    email = str(request.email).lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(name=name, email=email, password_hash=hash_password(request.password))
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    analyses = (
        db.query(Analysis)
        .filter(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
        .limit(100)
        .all()
    )
    return {"count": len(analyses), "items": [_analysis_to_dict(item) for item in analyses]}


@app.get("/analyses/dashboard")
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = (
        db.query(
            func.count(Analysis.id).label("total_analyses"),
            func.sum(case((Analysis.sentiment == "positive", 1), else_=0)).label("positive"),
            func.sum(case((Analysis.sentiment == "negative", 1), else_=0)).label("negative"),
            func.sum(case((Analysis.sentiment == "neutral", 1), else_=0)).label("neutral"),
            func.avg(Analysis.confidence).label("average_confidence"),
        )
        .filter(Analysis.user_id == current_user.id)
        .one()
    )
    return {
        "total_analyses": int(row.total_analyses or 0),
        "positive": int(row.positive or 0),
        "negative": int(row.negative or 0),
        "neutral": int(row.neutral or 0),
        "average_confidence": round(float(row.average_confidence or 0), 4),
    }


@app.delete("/analyses/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    analysis = (
        db.query(Analysis)
        .filter(Analysis.id == analysis_id, Analysis.user_id == current_user.id)
        .first()
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    db.delete(analysis)
    db.commit()


@app.post("/analyze/batch", response_model=BatchSentimentResponse)
async def analyze_batch(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")
    payload = await _read_upload_with_limit(file)
    try:
        dataframe = pd.read_csv(io.BytesIO(payload))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Unable to parse the CSV file.") from exc
    if len(dataframe) > MAX_BATCH_ROWS:
        raise HTTPException(
            status_code=413,
            detail=f"CSV file contains too many rows. Maximum supported rows: {MAX_BATCH_ROWS}.",
        )
    columns = {str(column).lower(): str(column) for column in dataframe.columns}
    text_column = columns.get("text")
    if text_column is None:
        for candidate in ("tweet", "content", "message"):
            if candidate in columns:
                text_column = columns[candidate]
                break
    if text_column is None:
        raise HTTPException(status_code=400, detail="CSV must contain a text, tweet, content, or message column.")

    results = []
    skipped = 0
    for value in dataframe[text_column].tolist():
        text_value = str(value).strip()
        if not text_value or text_value.lower() == "nan":
            skipped += 1
            continue
        result = _validate_and_analyze(text_value)
        results.append(result)

    counts = Counter(item["sentiment"] for item in results)
    total = len(results)
    return {
        "results": results,
        "summary": {
            "total_processed": total,
            "skipped_rows": skipped,
            "positive": counts.get("positive", 0),
            "negative": counts.get("negative", 0),
            "neutral": counts.get("neutral", 0),
            "positive_percentage": round((counts.get("positive", 0) / total) * 100, 2) if total else 0,
            "negative_percentage": round((counts.get("negative", 0) / total) * 100, 2) if total else 0,
            "neutral_percentage": round((counts.get("neutral", 0) / total) * 100, 2) if total else 0,
        },
        "metadata": {"text_column": text_column, "max_rows": MAX_BATCH_ROWS, "max_file_bytes": MAX_BATCH_FILE_BYTES},
    }


@app.get("/metrics")
def metrics():
    return {"status": "available"}


@app.get("/wordcloud")
def wordcloud():
    return {"status": "available"}


@app.get("/stream")
async def stream():
    async def event_generator() -> AsyncGenerator[str, None]:
        for message in ["Sentiment stream initialized", "Monitoring sample events", "Stream active"]:
            yield f"data: {json.dumps({'message': message})}\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")
