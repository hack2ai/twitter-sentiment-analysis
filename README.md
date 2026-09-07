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
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License" />
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

The inference layer first attempts to use the persisted custom scikit-learn model and falls back to VADER when a custom model artifact is unavailable.

## AI Tools Used

AI-assisted development was used throughout the project workflow for architecture decisions, implementation support, debugging, security hardening, documentation, and code-review-style iteration.

### Primary AI development assistant

- **ChatGPT (GPT-5.6 Luna)** — used to assist with project architecture, code implementation, debugging, testing strategy, security improvements, CI/CD troubleshooting, deployment-readiness work, and documentation.

### Important distinction

The application's **runtime sentiment intelligence is not powered by ChatGPT/OpenAI**. The production application uses the repository's machine-learning inference pipeline based on scikit-learn artifacts with a VADER fallback.

## Project Structure

```text
twitter-sentiment-analysis/
├── backend/
│   ├── dataset/
│   ├── data/
│   ├── migrations/
│   ├── ml/
│   ├── tests/
│   ├── auth.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── rate_limit.py
│   ├── requirements.txt
│   ├── alembic.ini
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── .github/
├── docker-compose.yml
├── render.yaml
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
└── README.md
```

## Application Workflow

```text
User
  │
  ├── Analyze one text ───────────────► FastAPI ──► ML inference
  ├── Upload CSV ─────────────────────► Batch pipeline
  ├── Login/Register ─────────────────► JWT authentication
  └── View history/dashboard ◄──────── Database

Dashboard
  ├── Metrics endpoint
  ├── Word-cloud endpoint
  └── SSE stream endpoint
```

## Local Development

### Docker Compose

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

### Run Without Docker

#### Backend

```bash
cd backend
python -m venv venv
pip install -r requirements.txt
python -m spacy download en_core_web_sm
alembic upgrade head
uvicorn main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Configuration

### Backend

| Variable | Purpose | Default / Example |
|---|---|---|
| `ENVIRONMENT` | Runtime mode | `development` |
| `DATABASE_URL` | Database connection | Required in production |
| `SECRET_KEY` | JWT signing secret | Use a unique secret in production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT lifetime | `1440` |
| `FRONTEND_ORIGIN` | Allowed browser origin | `http://localhost:3000` |
| `MAX_BATCH_ROWS` | Maximum CSV rows | `1000` |
| `MAX_BATCH_FILE_BYTES` | Maximum CSV upload size | `10485760` |

### Frontend

```text
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Reference

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/health` | Database-backed health check | No |
| `POST` | `/auth/register` | Register a user | No |
| `POST` | `/auth/login` | Authenticate and return JWT | No |
| `GET` | `/auth/me` | Current user | Yes |
| `POST` | `/analyze/text` | Analyze text | No |
| `POST` | `/analyses/text` | Analyze and save | Yes |
| `GET` | `/analyses/history` | User analysis history | Yes |
| `GET` | `/analyses/dashboard` | User analytics | Yes |
| `POST` | `/analyze/batch` | Analyze CSV | No |
| `GET` | `/metrics` | Model metrics | No |
| `GET` | `/wordcloud` | Keyword data | No |
| `GET` | `/stream` | SSE sentiment stream | No |

## Security

- JWT bearer authentication
- bcrypt password hashing
- Pydantic validation
- Strict CORS policy
- Security headers and production HSTS
- Authentication rate limiting
- Batch upload size and row limits
- User-isolated analysis history
- Production database and secret validation

## Testing & Quality

GitHub Actions validates:

- Backend compilation and tests
- Alembic migrations
- Frontend linting and production build
- CodeQL security analysis
- Dependabot dependency updates

## Deployment

The repository includes Docker, Docker Compose, and a Render Blueprint. Production deployment requires a persistent PostgreSQL database, a production `DATABASE_URL`, a strong `SECRET_KEY`, and correct frontend/backend public URLs.

## Limitations & Future Improvements

- The SSE stream is dataset-backed rather than direct X/Twitter ingestion.
- Production ML can be improved with reproducible training, model versioning, monitoring, and a representative labeled dataset.
- A future release can integrate a supported real-time social-media data provider.

## License

This project is licensed under the **MIT License**. You are free to use, copy, modify, distribute, and build upon this project, provided that the original copyright and license notice are included.

See the [LICENSE](LICENSE) file for the complete license text.

## Author

**Pankaj Kumar**  
Full-Stack Developer • Machine Learning • NLP • Cybersecurity

Repository: [hack2ai/twitter-sentiment-analysis](https://github.com/hack2ai/twitter-sentiment-analysis)
