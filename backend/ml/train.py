from __future__ import annotations

import json
import os
import pickle
from pathlib import Path

import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

try:
    from .preprocess import clean_text
except ImportError:
    from preprocess import clean_text

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET = BASE_DIR.parent / "dataset" / "sentiment.csv"
MODEL_PATH = BASE_DIR / "sentiment_model.pkl"
VECTORIZER_PATH = BASE_DIR / "vectorizer.pkl"
METRICS_PATH = BASE_DIR / "metrics.json"


def load_dataset(path: str | Path | None = None) -> pd.DataFrame:
    dataset_path = Path(path or os.getenv("SENTIMENT_DATASET", DEFAULT_DATASET))
    if not dataset_path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {dataset_path}. Add a CSV containing text and sentiment columns."
        )

    df = pd.read_csv(dataset_path)
    normalized = {str(column).strip().lower(): column for column in df.columns}
    text_column = next((normalized[c] for c in ("text", "tweet", "content", "message") if c in normalized), None)
    label_column = next((normalized[c] for c in ("sentiment", "label", "target") if c in normalized), None)

    if text_column is None or label_column is None:
        raise ValueError("Dataset must contain a text/tweet column and a sentiment/label column.")

    data = df[[text_column, label_column]].rename(columns={text_column: "text", label_column: "sentiment"})
    data = data.dropna().copy()
    data["text"] = data["text"].astype(str).str.strip()
    data["sentiment"] = data["sentiment"].astype(str).str.strip().str.lower()
    data = data[data["text"] != ""]
    data = data[data["sentiment"].isin({"positive", "negative", "neutral"})]

    if data.empty or data["sentiment"].nunique() < 2:
        raise ValueError("Dataset must contain valid examples from at least two sentiment classes.")

    return data.drop_duplicates(subset=["text", "sentiment"])


def build_candidates():
    return {
        "Logistic Regression": Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_features=20000, sublinear_tf=True)),
            ("classifier", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)),
        ]),
        "Multinomial Naive Bayes": Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_features=20000, sublinear_tf=True)),
            ("classifier", MultinomialNB()),
        ]),
        "Calibrated Linear SVM": Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_features=20000, sublinear_tf=True)),
            ("classifier", CalibratedClassifierCV(LinearSVC(class_weight="balanced", random_state=42), cv=3)),
        ]),
    }


def train_models(dataset_path: str | Path | None = None) -> dict:
    print("Loading labeled sentiment dataset...")
    df = load_dataset(dataset_path)
    df["cleaned_text"] = df["text"].apply(clean_text)
    df = df[df["cleaned_text"] != ""]

    X = df["cleaned_text"]
    y = df["sentiment"]

    class_counts = y.value_counts()
    stratify = y if class_counts.min() >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )

    candidates = build_candidates()
    leaderboard = []
    best_name = None
    best_model = None
    best_score = -1.0

    for name, model in candidates.items():
        print(f"Training {name}...")
        model.fit(X_train, y_train)
        predictions = model.predict(X_test)
        macro_f1 = f1_score(y_test, predictions, average="macro", zero_division=0)
        accuracy = accuracy_score(y_test, predictions)
        leaderboard.append({"model": name, "macro_f1": float(macro_f1), "accuracy": float(accuracy)})

        if macro_f1 > best_score:
            best_score = macro_f1
            best_name = name
            best_model = model

    assert best_model is not None
    predictions = best_model.predict(X_test)
    classes = sorted(y.unique().tolist())

    report = classification_report(y_test, predictions, labels=classes, output_dict=True, zero_division=0)
    metrics = {
        "model_name": best_name,
        "dataset": {
            "rows": int(len(df)),
            "train_rows": int(len(X_train)),
            "test_rows": int(len(X_test)),
            "class_distribution": {key: int(value) for key, value in y.value_counts().to_dict().items()},
        },
        "accuracy": float(accuracy_score(y_test, predictions)),
        "precision_weighted": float(precision_score(y_test, predictions, average="weighted", zero_division=0)),
        "recall_weighted": float(recall_score(y_test, predictions, average="weighted", zero_division=0)),
        "f1_score_weighted": float(f1_score(y_test, predictions, average="weighted", zero_division=0)),
        "f1_score_macro": float(f1_score(y_test, predictions, average="macro", zero_division=0)),
        "confusion_matrix": confusion_matrix(y_test, predictions, labels=classes).tolist(),
        "classes": classes,
        "classification_report": report,
        "leaderboard": sorted(leaderboard, key=lambda item: item["macro_f1"], reverse=True),
    }

    # Save the full pipeline for reliable inference and backwards-compatible vectorizer artifacts.
    with open(MODEL_PATH, "wb") as file:
        pickle.dump(best_model, file)
    with open(VECTORIZER_PATH, "wb") as file:
        pickle.dump(best_model.named_steps["tfidf"], file)
    with open(METRICS_PATH, "w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=2)

    print(f"Best model: {best_name}")
    print(f"Macro F1: {metrics['f1_score_macro']:.4f}")
    print(f"Accuracy: {metrics['accuracy']:.4f}")
    return metrics


if __name__ == "__main__":
    train_models()
