# Social Sentiment Intelligence

A modern full-stack NLP application for analyzing social-media text and classifying sentiment as **Positive**, **Negative**, or **Neutral**.

The project combines a Next.js analytics dashboard with a FastAPI machine-learning service and supports single-text analysis, CSV batch processing, model evaluation, and live streaming demonstrations.

## Key Features

- **Single Text Analysis** — classify individual posts with confidence scores.
- **Batch CSV Analysis** — upload datasets and analyze up to 1,000 rows per request.
- **Smart Column Detection** — automatically recognizes `text`, `tweet`, `content`, or `message` columns.
- **Data-Driven Analytics** — sentiment counts, percentages, sentiment index, and top terms.
- **Model Metrics Dashboard** — accuracy, precision, recall, F1 score, and confusion matrix.
- **Live Demo Stream** — Server-Sent Events for streaming sentiment results.
- **Production-Oriented Configuration** — environment-based API URLs, configurable CORS, and batch limits.
- **Interactive UI** — Next.js, Tailwind CSS, Recharts, and Lucide icons.

## Architecture

```text
Next.js Frontend
      |
      | REST + Server-Sent Events
      v
FastAPI Backend
      |
      +--> NLP Preprocessing
      |
      +--> TF-IDF Vectorizer
      |
      +--> Scikit-Learn Classifier
      |
      +--> Analytics + Metrics
```

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Recharts
- Lucide React

### Backend
- FastAPI
- Uvicorn
- Pandas
- Pydantic

### Machine Learning & NLP
- Scikit-learn
- TF-IDF
- Logistic Regression / Naive Bayes / Linear SVM / Random Forest
- SpaCy
- NLTK
- VADER fallback

## Project Structure

```text
twitter-sentiment-analysis/
├── frontend/                 # Next.js dashboard
│   ├── src/app
│   ├── src/components
│   ├── src/lib
│   └── .env.example
├── backend/                  # FastAPI service
│   ├── ml/                   # preprocessing, training and prediction
│   ├── dataset/
│   ├── main.py
│   └── .env.example
└── README.md
```

## Run Locally

### 1. Backend

```bash
cd backend
python -m venv venv
```

Activate the environment and install dependencies:

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

Create your environment file:

```bash
copy .env.example .env
```

Start the API:

```bash
uvicorn main:app --reload --port 8000
```

API documentation will be available at `/docs`.

### 2. Frontend

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

The dashboard runs on port 3000 by default.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service health check |
| POST | `/analyze/text` | Analyze one text input |
| POST | `/analyze/batch` | Analyze a CSV dataset |
| POST | `/analyze/analytics` | Generate data-driven sentiment analytics |
| GET | `/metrics` | Retrieve model evaluation metrics |
| GET | `/analyze/stream` | Live sentiment demonstration stream |

## Important Model Note

The current repository's original training script uses a small demonstration dataset. For a portfolio-grade or production-grade model, the next recommended upgrade is training and evaluating on a properly split, diverse labeled sentiment dataset and reporting macro-F1, per-class metrics, and dataset provenance.

## Recommended Next Upgrades

1. Replace the demo training data with a real labeled sentiment dataset.
2. Add cross-validation and reproducible experiment tracking.
3. Add model versioning and training metadata.
4. Add database-backed analysis history.
5. Add authentication and user dashboards.
6. Deploy the frontend and backend with separate environment configurations.
7. Add Docker and GitHub Actions CI.
8. Upgrade to transformer-based sentiment models for stronger contextual understanding.

## Author

Built and maintained by the project owner as an NLP and full-stack machine-learning portfolio project.
