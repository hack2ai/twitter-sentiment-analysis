from __future__ import annotations

import io
import json
import os
from collections import Counter
from typing import AsyncGenerator, List

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ml.predict import predict_sentiment

APP_VERSION = "2.0.0"
MAX_BATCH_ROWS = int(os.getenv("MAX_BATCH_ROWS", "1000"))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

app = FastAPI(
    title="Social Sentiment Intelligence API",
    version=APP_VERSION,
    description="Production-ready sentiment analysis API for single text, batch CSV, analytics, and live demo streaming.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


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


def _validate_and_analyze(text: str) -> dict:
    cleaned = text.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(cleaned) > 5000:
        raise HTTPException(status_code=400, detail="Text exceeds the 5000-character limit.")
    result = predict_sentiment(cleaned)
    return {"original_text": cleaned, **result}


@app.get("/")
def read_root():
    return {
        "name": "Social Sentiment Intelligence API",
        "version": APP_VERSION,
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "version": APP_VERSION}


@app.post("/analyze/text", response_model=SentimentResponse)
def analyze_text(request: TextRequest):
    return SentimentResponse(**_validate_and_analyze(request.text))


@app.post("/analyze/batch", response_model=BatchSentimentResponse)
async def analyze_batch(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded CSV is empty.")

        df = pd.read_csv(io.BytesIO(contents))
        if df.empty:
            raise HTTPException(status_code=400, detail="Uploaded CSV contains no rows.")
        if len(df) > MAX_BATCH_ROWS:
            raise HTTPException(
                status_code=413,
                detail=f"CSV contains {len(df)} rows. Maximum supported rows per upload: {MAX_BATCH_ROWS}.",
            )

        lower_to_original = {str(column).strip().lower(): column for column in df.columns}
        text_column = None
        for candidate in ("text", "tweet", "content", "message"):
            if candidate in lower_to_original:
                text_column = lower_to_original[candidate]
                break

        if text_column is None:
            string_columns = df.select_dtypes(include=["object", "string"]).columns.tolist()
            if not string_columns:
                raise HTTPException(status_code=400, detail="Could not find a text column in the CSV.")
            text_column = string_columns[0]

        results: list[dict] = []
        counts = Counter({"positive": 0, "negative": 0, "neutral": 0})
        skipped = 0

        for value in df[text_column].tolist():
            text = "" if pd.isna(value) else str(value).strip()
            if not text:
                skipped += 1
                continue
            result = _validate_and_analyze(text)
            counts[result["sentiment"]] += 1
            results.append(result)

        total_analyzed = len(results)
        summary = {
            "positive": counts["positive"],
            "negative": counts["negative"],
            "neutral": counts["neutral"],
            "total": total_analyzed,
        }
        percentages = {
            "positive": round((counts["positive"] / total_analyzed) * 100, 2) if total_analyzed else 0,
            "negative": round((counts["negative"] / total_analyzed) * 100, 2) if total_analyzed else 0,
            "neutral": round((counts["neutral"] / total_analyzed) * 100, 2) if total_analyzed else 0,
        }

        return BatchSentimentResponse(
            results=results,
            summary=summary,
            metadata={
                "file_name": filename,
                "text_column": str(text_column),
                "rows_received": len(df),
                "rows_analyzed": total_analyzed,
                "rows_skipped": skipped,
                "percentages": percentages,
            },
        )
    except HTTPException:
        raise
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded.") from exc
    except pd.errors.ParserError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unexpected error while processing the CSV.") from exc


@app.get("/metrics")
def get_metrics():
    metrics_path = os.path.join(os.path.dirname(__file__), "ml", "metrics.json")
    if not os.path.exists(metrics_path):
        return {"message": "Metrics not found. Train the model first."}
    with open(metrics_path, "r", encoding="utf-8") as file:
        return json.load(file)


@app.post("/analyze/analytics")
async def analyze_analytics(file: UploadFile = File(...)):
    batch = await analyze_batch(file)
    positive = batch.summary["positive"]
    negative = batch.summary["negative"]
    neutral = batch.summary["neutral"]
    total = batch.summary["total"]
    score = round(((positive - negative) / total) * 100, 2) if total else 0

    words = Counter()
    for item in batch.results:
        words.update(item["cleaned_text"].split())

    return {
        "summary": batch.summary,
        "metadata": batch.metadata,
        "sentiment_index": score,
        "top_terms": [{"text": word, "value": count} for word, count in words.most_common(30)],
    }


async def simulate_stream() -> AsyncGenerator[str, None]:
    import asyncio
    import random

    sample_posts = [
        "Just tried the new feature and it is amazing!",
        "I am disappointed with the latest update.",
        "The experience is okay, nothing special.",
        "Absolutely love this product!",
        "This is frustrating and needs improvement.",
        "The interface looks clean and easy to use.",
    ]

    for _ in range(20):
        await asyncio.sleep(random.uniform(0.8, 2.0))
        text = random.choice(sample_posts)
        result = _validate_and_analyze(text)
        yield f"data: {json.dumps(result)}\n\n"


@app.get("/analyze/stream")
async def analyze_stream():
    return StreamingResponse(
        simulate_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
