# Twitter Sentiment AI

<p align="center">
  <strong>AI-powered full-stack sentiment intelligence for social-media text</strong>
</p>

<p align="center">
  Analyze individual messages, process CSV datasets, inspect model quality, explore keyword trends, and consume sentiment events through a modern web interface.
</p>

<p align="center">
  <a href="https://github.com/hack2ai/twitter-sentiment-analysis/actions/workflows/ci.yml"><img src="https://github.com/hack2ai/twitter-sentiment-analysis/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/hack2ai/twitter-sentiment-analysis/actions/workflows/codeql.yml"><img src="https://github.com/hack2ai/twitter-sentiment-analysis/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" /></a>
</p>

## Overview

Twitter Sentiment AI is a portfolio-grade NLP application built around a **Next.js + TypeScript frontend** and a **FastAPI + Python machine-learning backend**. It provides single-text inference, batch CSV analysis, model evaluation dashboards, trending keyword visualization, authentication, persistent analysis history, and a Server-Sent Events (SSE) stream.

The application is designed to demonstrate end-to-end software engineering: frontend development, REST APIs, machine-learning inference, database persistence, security controls, automated testing, containerization, CI/CD checks, and deployment configuration.

> **Important:** Despite the repository name, the current live-stream feature is a demo SSE feed backed by the included dataset. It is not a direct integration with the X/Twitter API.

## Features

| Area | Capabilities |
|---|---|
| **Sentiment Analysis** | Positive, negative, or neutral classification with confidence, cleaned text, and inference method |
| **Batch Processing** | CSV upload, automatic text-column detection, row/file-size limits, per-row predictions, summary statistics |
| **Analytics** | Accuracy, precision, recall, F1 score, confusion matrix, sentiment distribution, confidence distribution |
| **Keyword Insights** | Backend-generated trending sentiment keywords and word-cloud visualization |
| **Streaming** | Server-Sent Events endpoint that emits sentiment predictions from the included dataset |
| **Authentication** | Registration, login, JWT bearer tokens, authenticated user profile |
| **History** | Save analyses, search/export in the UI, dashboard totals, average confidence, delete owned analyses |
| **Security** | bcrypt password hashing, validation, CORS policy, security headers, authentication rate limiting, production secret/database checks |
| **Database** | SQLAlchemy persistence with SQLite-compatible local development and PostgreSQL support |
| **Migrations** | Alembic-managed schema migrations with an initial production-ready revision |
| **DevOps** | Docker, Docker Compose, GitHub Actions, CodeQL, Dependabot, Render deployment blueprint |

## Architecture

```text
┌───────────────────────────────────────┐
│          Next.js Frontend             │
│ TypeScript • Tailwind • Recharts      │
└───────────────────┬───────────────────┘
                    │
             REST API + SSE
                    │
┌───────────────────▼───────────────────┐
│            FastAPI Backend            │
│ Auth • Validation • Analysis • APIs   │
└───────────────┬───────────┬───────────┘
                │           │
        ┌───────▼────┐ ┌────▼──────────┐
        │ NLP / ML   │ │ SQLAlchemy DB │
        │ TF-IDF /   │ │ User history  │
        │ Classifier │ │ & analytics   │
        └───────┬────┘ └────┬──────────┘
                │            │
        ┌───────▼────┐ ┌────▼──────────┐
        │ VADER      │ │ Alembic       │
        │ Fallback   │ │ Migrations    │
        └────────────┘ └───────────────┘
```

## Technology Stack

### Frontend

- **Next.js 14** — React application framework
- **React 18** — UI layer
- **TypeScript** — static typing
- **Tailwind CSS** — styling and responsive layout
- **Recharts** — analytics visualizations
- **Lucide React** — interface icons

### Backend

- **Python 3.12**
- **FastAPI** — REST API and SSE delivery
- **Uvicorn** — ASGI server
- **Pandas** — CSV/data processing
- **Pydantic** — request/response validation
- **SQLAlchemy** — ORM and database access
- **Alembic** — database migrations
- **PostgreSQL / SQLite** — production/local database options

### Machine Learning & NLP

- **scikit-learn 1.8.0** — machine-learning pipeline
- **TF-IDF** — text feature representation in the training/inference pipeline
- **Pickle-serialized trained model/vectorizer** — persisted model artifacts
- **NLTK** — NLP preprocessing support
- **spaCy** — NLP preprocessing support
- **VADER Sentiment** — rule-based fallback classifier when the custom model is unavailable
- **TextBlob** — NLP dependency available to the backend

The inference layer first attempts to use the persisted custom scikit-learn model and falls back to VADER when a custom model artifact is unavailable. fileciteturn923file0L2-L2

## AI Tools Used

AI-assisted development was used throughout the project workflow for architecture decisions, implementation support, debugging, security hardening, documentation, and code-review-style iteration.

### Primary AI development assistant

- **ChatGPT (GPT-5.6 Luna)** — used to assist with project architecture, code implementation, debugging, testing strategy, security improvements, CI/CD troubleshooting, deployment-readiness work, and documentation.

### Important distinction

The application's **runtime sentiment intelligence is not powered by ChatGPT/OpenAI**. The production application uses the repository's machine-learning inference pipeline based on scikit-learn artifacts with a VADER fallback. fileciteturn923file0L2-L2

## Project Structure

```text
twitter-sentiment-analysis/
├── backend/
│   ├── dataset/
│   │   ├── sentiment.csv
│   │   └── sample_tweets.csv
│   ├── data/
│   ├── migrations/
│   │   ├── versions/
│   │   │   └── 20260905_0001_initial_schema.py
│   │   ├── env.py
│   │   └── README
│   ├── ml/
│   │   ├── metrics.json
│   │   ├── predict.py
│   │   └── ...model/preprocessing files...
│   ├── tests/
│   ├── auth.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── rate_limit.py
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── codeql.yml
│   └── dependabot.yml
├── docker-compose.yml
├── render.yaml
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

## Application Workflow

```text
User
  │
  ├── Analyze one text ───────────────► FastAPI ──► ML inference
  │                                             │
  ├── Upload CSV ─────────────────────► Batch pipeline
  │                                             │
  ├── Login/Register ─────────────────► JWT authentication
  │                                             │
  └── View history/dashboard ◄──────── Database ◄┘

Dashboard
  ├── Metrics endpoint
  ├── Word-cloud endpoint
  └── SSE stream endpoint
```

## Local Development

### Option 1 — Docker Compose

From the repository root:

```bash
docker compose up --build
```

Open:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

Stop the stack:

```bash
docker compose down
```

The Compose setup persists local backend data in the `sentiment_data` volume. The backend container runs Alembic migrations before starting Uvicorn.

### Option 2 — Run without Docker

#### Backend

```bash
cd backend
python -m venv venv
```

Activate the environment and install dependencies:

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

Create your local environment file:

```bash
copy .env.example .env
```

Run migrations:

```bash
alembic upgrade head
```

Start FastAPI:

```bash
uvicorn main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

The frontend runs on port `3000` by default.

## Environment Configuration

### Backend

The main runtime settings include:

| Variable | Purpose | Default / Example |
|---|---|---|
| `ENVIRONMENT` | Runtime mode | `development` |
| `DATABASE_URL` | Database connection | SQLite fallback locally; required in production |
| `SECRET_KEY` | JWT signing secret | Development placeholder; use a unique secret in production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT lifetime | `1440` |
| `FRONTEND_ORIGIN` | Allowed browser origin | `http://localhost:3000` |
| `MAX_BATCH_ROWS` | Maximum CSV rows | `1000` |
| `MAX_BATCH_FILE_BYTES` | Maximum CSV upload size | `10485760` (10 MiB) |
| `AUTH_RATE_LIMIT` | Authentication requests per window | `5` |
| `AUTH_RATE_WINDOW_SECONDS` | Authentication rate-limit window | `60` |

### Frontend

```text
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Never commit real secrets or production credentials to the repository.

## Database & Migrations

The project uses SQLAlchemy models with Alembic migrations.

Apply the current schema:

```bash
cd backend
alembic upgrade head
```

Create a future migration:

```bash
alembic revision --autogenerate -m "describe schema change"
alembic upgrade head
```

Review generated migrations before applying them to a production database.

## API Reference

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/` | API name, version, and status | No |
| `GET` | `/health` | Database-backed health check | No |
| `POST` | `/auth/register` | Register a user and return JWT | No |
| `POST` | `/auth/login` | Authenticate a user and return JWT | No |
| `GET` | `/auth/me` | Current authenticated user | Yes |
| `POST` | `/analyze/text` | Analyze text without saving | No |
| `POST` | `/analyses/text` | Analyze and persist a user's result | Yes |
| `GET` | `/analyses/history` | Current user's saved analyses | Yes |
| `GET` | `/analyses/dashboard` | Aggregated user statistics | Yes |
| `DELETE` | `/analyses/{analysis_id}` | Delete an owned analysis | Yes |
| `POST` | `/analyze/batch` | Analyze uploaded CSV data | No |
| `GET` | `/metrics` | Model evaluation metrics | No |
| `GET` | `/wordcloud` | Trending keyword data | No |
| `GET` | `/stream` | SSE sentiment event stream | No |

> **Note:** The current backend exposes `/stream` for SSE. The README intentionally avoids documenting the obsolete `/analyze/stream` path.

## CSV Batch Format

The batch endpoint detects a text column case-insensitively using these names:

```text
text
tweet
content
message
```

Example:

```csv
text
I absolutely love this application!
The new update is amazing.
This product is terrible.
The experience is okay, nothing special.
```

Empty rows are skipped. The default limits are **1,000 rows** and **10 MiB**, configurable through `MAX_BATCH_ROWS` and `MAX_BATCH_FILE_BYTES`.

## Security

Security controls currently implemented include:

- JWT bearer authentication for protected routes
- bcrypt password hashing
- Email and request validation through Pydantic
- Strict CORS configuration
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- Restricted `Permissions-Policy`
- Production HSTS header
- Authentication endpoint rate limiting with `Retry-After`
- `Cache-Control: no-store` on authentication responses
- Production validation requiring a non-placeholder JWT secret
- Production validation requiring `DATABASE_URL`
- Non-root backend container execution
- Batch upload size and row limits
- User-isolated analysis history

## Testing & Quality

GitHub Actions validates the application on pushes and pull requests.

### Backend checks

```bash
python -m compileall -q .
python -c "from main import app; assert app.title"
alembic upgrade head
pytest -q
```

### Frontend checks

```bash
npm ci
npm run lint
npm run build
```

### Security analysis

- GitHub CodeQL scans Python and JavaScript/TypeScript code.
- Dependabot checks dependency updates weekly.

## Deployment

The repository includes a Render Blueprint with two web services:

1. **Backend** — Dockerized FastAPI service with `/health` checks and startup migrations.
2. **Frontend** — Dockerized Next.js service with build-time `NEXT_PUBLIC_API_URL` configuration.

Before production deployment:

1. Set `ENVIRONMENT=production`.
2. Provision a persistent PostgreSQL database.
3. Set `DATABASE_URL` on the backend.
4. Use a strong unique `SECRET_KEY`.
5. Set `FRONTEND_ORIGIN` to the public frontend URL.
6. Set `NEXT_PUBLIC_API_URL` to the public backend URL.
7. Run/verify Alembic migrations.
8. Validate `/health`, authentication, single analysis, batch analysis, history, and `/stream`.

Production hosting is intentionally documented separately from local development so the repository remains reproducible and safe to configure.

## Model Evaluation

The dashboard exposes:

- Accuracy
- Precision
- Recall
- F1 score
- Confusion matrix

The repository currently includes demonstration evaluation metrics. For a real production ML deployment, use a representative labeled dataset, document data provenance, track model versions, and report per-class performance.

## AI-Assisted Development Disclosure

This project was developed with AI-assisted engineering support. **ChatGPT (GPT-5.6 Luna)** was used as a development assistant for problem solving, implementation guidance, debugging, security hardening, documentation, and iterative repository maintenance.

The AI assistant should not be confused with the application's runtime ML stack: runtime predictions are produced by the repository's scikit-learn model artifacts or the VADER fallback, not by ChatGPT. fileciteturn923file0L2-L2

## Limitations & Future Improvements

- The SSE stream is a dataset-backed demonstration rather than live X/Twitter ingestion.
- The included model metrics are demonstration-oriented.
- Production deployments should use persistent PostgreSQL storage.
- A production-grade ML lifecycle should include reproducible training, validation datasets, experiment tracking, model versioning, and monitoring.
- A future release could add real-time ingestion from a supported social-media data provider.

## License

No explicit open-source license is currently declared in this repository. Add a `LICENSE` file before distributing the project under a specific open-source license.

## Author

**Pankaj Kumar**  
Full-Stack Developer • Machine Learning • NLP • Cybersecurity

Repository: [hack2ai/twitter-sentiment-analysis](https://github.com/hack2ai/twitter-sentiment-analysis)
