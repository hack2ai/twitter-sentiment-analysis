# Sentiment Model Card

## Purpose
Classify short English social-media style text into `positive`, `negative`, or `neutral` sentiment.

## Training data
The repository includes a small starter dataset only to demonstrate a reproducible pipeline. It is **not sufficient for production claims**. Replace `backend/dataset/sentiment.csv` with a larger, legally usable, labeled dataset before publishing model-performance claims.

Expected columns:

```text
text,sentiment
I love this product,positive
The experience is disappointing,negative
It works as expected,neutral
```

## Evaluation
The training pipeline uses a stratified holdout when class sizes allow it and compares multiple candidates using **macro F1** as the primary model-selection metric. It records accuracy, weighted precision/recall/F1, class distribution, confusion matrix, per-class report, and a model leaderboard.

## Limitations
- English-focused preprocessing.
- Short social-media text can contain sarcasm, irony, slang, and context that classical TF-IDF models may miss.
- Model performance depends strongly on dataset quality and class balance.
- Sentiment labels should not be used as a proxy for mental health, safety, or factual truth.

## Recommended production upgrade
Use a substantially larger dataset, deduplicate near-identical posts, remove train/test leakage, maintain a separate untouched test set, and consider transformer-based models for higher semantic accuracy.
