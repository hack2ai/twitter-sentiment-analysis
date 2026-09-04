from __future__ import annotations

import os
import pickle
from pathlib import Path

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from ml.preprocess import clean_text

MODEL_DIR = Path(__file__).resolve().parent
MODEL_PATH = MODEL_DIR / "sentiment_model.pkl"
VECTORIZER_PATH = MODEL_DIR / "vectorizer.pkl"

vader_analyzer = SentimentIntensityAnalyzer()
model = None
vectorizer = None


def load_custom_model() -> bool:
    global model, vectorizer
    if not MODEL_PATH.exists():
        return False
    try:
        with open(MODEL_PATH, "rb") as file:
            model = pickle.load(file)
        if VECTORIZER_PATH.exists():
            with open(VECTORIZER_PATH, "rb") as file:
                vectorizer = pickle.load(file)
        print("Custom sentiment model loaded successfully.")
        return True
    except Exception as exc:
        print(f"Error loading sentiment model: {exc}")
        model = None
        vectorizer = None
        return False


load_custom_model()


def predict_sentiment(text: str) -> dict:
    cleaned_text = clean_text(text)
    inference_text = cleaned_text or text.strip()

    if model is not None:
        # New training pipeline stores a full sklearn Pipeline.
        if hasattr(model, "named_steps"):
            prediction = model.predict([inference_text])[0]
            confidence = 1.0
            if hasattr(model, "predict_proba"):
                probabilities = model.predict_proba([inference_text])[0]
                confidence = float(max(probabilities))
        elif vectorizer is not None:
            vectorized = vectorizer.transform([inference_text])
            prediction = model.predict(vectorized)[0]
            confidence = 1.0
            if hasattr(model, "predict_proba"):
                probabilities = model.predict_proba(vectorized)[0]
                confidence = float(max(probabilities))
        else:
            prediction = None
            confidence = 0.0

        if prediction is not None:
            return {
                "sentiment": str(prediction),
                "confidence": confidence,
                "method": "custom_ml_pipeline",
                "cleaned_text": cleaned_text,
            }

    scores = vader_analyzer.polarity_scores(inference_text)
    compound = scores["compound"]
    if compound >= 0.05:
        sentiment = "positive"
    elif compound <= -0.05:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    return {
        "sentiment": sentiment,
        "confidence": max(abs(float(compound)), 0.5 if compound == 0 else 0.0),
        "method": "vader_fallback",
        "cleaned_text": cleaned_text,
    }
