from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import io
from typing import List

from ml.predict import predict_sentiment

app = FastAPI(title="Twitter Sentiment Analysis API", version="1.0")

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextRequest(BaseModel):
    text: str

class SentimentResponse(BaseModel):
    sentiment: str
    confidence: float
    method: str
    cleaned_text: str

class BatchSentimentResponse(BaseModel):
    results: List[dict]
    summary: dict

@app.get("/")
def read_root():
    return {"message": "Welcome to Twitter Sentiment Analysis API"}

@app.post("/analyze/text", response_model=SentimentResponse)
def analyze_text(request: TextRequest):
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
        
    result = predict_sentiment(request.text)
    return SentimentResponse(**result)

@app.post("/analyze/batch", response_model=BatchSentimentResponse)
async def analyze_batch(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
        
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Check if 'text' column exists
        if 'text' not in df.columns and 'tweet' not in df.columns:
             # try to guess the text column, usually the first string column
             text_cols = df.select_dtypes(include=['object']).columns
             if len(text_cols) > 0:
                 text_col = text_cols[0]
             else:
                 raise HTTPException(status_code=400, detail="Could not find a 'text' column in the CSV.")
        else:
             text_col = 'text' if 'text' in df.columns else 'tweet'
             
        results = []
        summary = {"positive": 0, "negative": 0, "neutral": 0, "total": 0}
        
        # Process first 100 rows to prevent timeout on large files
        for index, row in df.head(100).iterrows():
            text = str(row[text_col])
            res = predict_sentiment(text)
            
            summary[res["sentiment"]] += 1
            summary["total"] += 1
            
            results.append({
                "original_text": text,
                **res
            })
            
        return BatchSentimentResponse(results=results, summary=summary)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.get("/metrics")
def get_metrics():
    import os
    import json
    metrics_path = os.path.join(os.path.dirname(__file__), "ml", "metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            return json.load(f)
    return {"message": "Metrics not found. Train the model first."}

@app.get("/wordcloud")
def get_wordcloud_data():
    # Return a mocked set of words for the word cloud demonstration
    # In a real app, this would query the database for recent tweets
    return [
        {"text": "love", "value": 64},
        {"text": "amazing", "value": 55},
        {"text": "terrible", "value": 42},
        {"text": "worst", "value": 38},
        {"text": "good", "value": 31},
        {"text": "great", "value": 28},
        {"text": "happy", "value": 24},
        {"text": "sad", "value": 20},
        {"text": "angry", "value": 18},
        {"text": "awesome", "value": 16},
        {"text": "bad", "value": 15},
        {"text": "excellent", "value": 12},
        {"text": "beautiful", "value": 10},
        {"text": "ugly", "value": 8},
        {"text": "perfect", "value": 7}
    ]

from typing import AsyncGenerator
from fastapi.responses import StreamingResponse
import asyncio
import random

async def simulate_stream() -> AsyncGenerator[str, None]:
    sample_tweets = [
        "Just tried the new feature, it's amazing! 🔥",
        "I'm very disappointed with the current service.",
        "Nothing special to say today.",
        "Absolutely love this product!",
        "This is terrible, I want a refund.",
        "The interface is so clean and beautiful.",
        "Why is it so slow today? Annoying.",
        "Okay experience, could be better."
    ]
    for _ in range(20): # Simulate 20 real-time tweets
        await asyncio.sleep(random.uniform(1.0, 3.0)) # Random delay
        text = random.choice(sample_tweets)
        res = predict_sentiment(text)
        yield f"data: {json.dumps({'text': text, **res})}\n\n"

@app.get("/analyze/stream")
async def analyze_stream():
    return StreamingResponse(simulate_stream(), media_type="text/event-stream")
