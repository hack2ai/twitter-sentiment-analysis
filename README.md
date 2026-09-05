# Twitter Sentiment AI

A full-stack NLP application for analyzing social-media text and visualizing sentiment intelligence. The project combines a Next.js frontend with a FastAPI machine-learning backend and includes authentication, persistent user history, CSV batch analysis, model evaluation, a keyword word cloud, and a real-time Server-Sent Events demo.

## Highlights

- **Single-text sentiment analysis** with sentiment, confidence, cleaned text, and model information.
- **Batch CSV analysis** with automatic text-column detection and configurable row and file-size limits.
- **Interactive analytics** with sentiment distribution, confidence distribution, model metrics, and confusion matrix.
- **Trending sentiment keywords** through a backend-powered word cloud.
- **Real-time sentiment stream** using Server-Sent Events (SSE).
- **Authentication** with registration, login, JWT-based protected routes, and per-user analysis history.
- **Persistent history** with dashboard totals, average confidence, search/export UI, and analysis deletion.
- **Request protection** with configurable authentication rate limiting.
- **Database migrations** managed through Alembic with an initial schema revision.
- **Docker Compose** setup for running the frontend and backend together with persistent backend data storage.
- **Environment-based configuration** for API origin, CORS, JWT settings, rate limits, database URL, and batch limits.

## Architecture

```text
                       +----------------------+
                       |   Next.js Frontend   |
                       | TypeScript + Tailwind|
                       +----------+-----------+
                                  |
                    REST API + Server-Sent Events
                                  |
                       +----------v-----------+
                       |    FastAPI Backend   |
                       +----------+-----------+
                                  |
             +--------------------+--------------------+
             |                    |                    |
             v                    v                    v
      Authentication        NLP / ML Pipeline     Analytics APIs
      JWT + bcrypt          TF-IDF + classifier    Metrics + word cloud
             |                    |                    |
             +--------------------+--------------------+
                                  |
                                  v
                         SQLAlchemy database
                         User analysis history
                                  |
                                  v
                         Alembic migrations
```

## Tech Stack

### Frontend

- Next.js 14
- React
- TypeScript
- Tailwind CSS
- Recharts
- Lucide React

### Backend

- Python 3.12
- FastAPI
- Uvicorn
- Pandas
- Pydantic
- SQLAlchemy
- Alembic
- SQLite-compatible database configuration

### Machine Learning & NLP

- Scikit-learn
- TF-IDF feature extraction
- Scikit-learn sentiment classifier
- spaCy preprocessing
- NLTK preprocessing
- VADER fallback

### Authentication & Security

- JWT bearer authentication
- bcrypt password hashing
- Configurable CORS
- Pydantic request validation
- Batch row and file-size limits
- Authentication rate limiting
- Production secret validation
- Non-root backend container

### DevOps

- Docker
- Docker Compose
- GitHub Actions CI
- Dependabot dependency updates
- Render deployment blueprint
- Environment variables for runtime and build-time configuration

## Project Structure

```text
twitter-sentiment-analysis/
├── backend/
│   ├── ml/
│   ├── tests/
│   ├── dataset/
│   ├── migrations/
│   │   ├── versions/
│   │   │   └── 20260905_0001_initial_schema.py
│   │   ├── env.py
│   │   └── README
│   ├── data/
│   │   └── .gitkeep
│   ├── auth.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── rate_limit.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── package.json
│   └── .env.example
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   └── dependabot.yml
├── docker-compose.yml
├── render.yaml
└── README.md
```

## Run with Docker

From the repository root:

```bash
docker compose up --build
```

Frontend:

```text
http://localhost:3000
```

Backend API:

```text
http://localhost:8000
```

Swagger documentation:

```text
http://localhost:8000/docs
```

Stop the stack:

```bash
docker compose down
```

The backend container applies Alembic migrations before starting FastAPI. Compose persists the SQLite-compatible backend data under the `sentiment_data` volume mounted at `/app/data`.

The Compose configuration supports `ENVIRONMENT`, `FRONTEND_ORIGIN`, `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `MAX_BATCH_ROWS`, `MAX_BATCH_FILE_BYTES`, `AUTH_RATE_LIMIT`, `AUTH_RATE_WINDOW_SECONDS`, and the frontend `NEXT_PUBLIC_API_URL` build argument. The default batch file-size limit is `10485760` bytes (10 MiB).

## Run Locally Without Docker

### Backend

```bash
cd backend
python -m venv venv
```

Activate the virtual environment, then install dependencies:

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

Create the environment file from the example:

```bash
copy .env.example .env
```

Initialize the database schema with Alembic:

```bash
alembic upgrade head
```

Then start the API:

```bash
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

The frontend runs on port `3000` by default.

## Database Migrations

Alembic is the schema migration mechanism used by the project.

From `backend/`:

```bash
alembic upgrade head
```

For future schema changes:

```bash
alembic revision --autogenerate -m "describe schema change"
alembic upgrade head
```

Review generated migrations before applying them to a production database.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API information and version |
| GET | `/health` | Health check |
| POST | `/auth/register` | Create an account and return a JWT |
| POST | `/auth/login` | Authenticate an existing account |
| GET | `/auth/me` | Return the authenticated user |
| POST | `/analyze/text` | Analyze a single text without saving |
| POST | `/analyses/text` | Analyze and save a result for the authenticated user |
| GET | `/analyses/history` | Return the authenticated user's saved analyses |
| GET | `/analyses/dashboard` | Return authenticated-user dashboard totals |
| DELETE | `/analyses/{analysis_id}` | Delete one saved analysis owned by the authenticated user |
| POST | `/analyze/batch` | Analyze a CSV dataset |
| POST | `/analyze/analytics` | Return batch analytics and top terms |
| GET | `/metrics` | Return model evaluation metrics |
| GET | `/wordcloud` | Return trending keyword data |
| GET | `/analyze/stream` | Stream simulated sentiment results through SSE |

## CSV Batch Format

The batch endpoint automatically looks for one of these columns, case-insensitively:

```text
text
tweet
content
message
```

If none of those columns exists, the backend falls back to the first string/object column. Empty rows are skipped, and the default maximum is `1000` rows and `10 MiB` per request. The limits are configurable with `MAX_BATCH_ROWS` and `MAX_BATCH_FILE_BYTES`.

Example:

```csv
text
I absolutely love this application!
The new update is amazing.
This product is terrible.
The experience is okay, nothing special.
```

## Model Evaluation

The Overview dashboard displays the model metrics exposed by the backend, including:

- Accuracy
- Precision
- Recall
- F1 score
- Confusion matrix

For the current demonstration model, the repository exposes metrics generated from its included evaluation data. For production use, retrain and evaluate on a representative labeled dataset and report dataset provenance and per-class performance.

## Authentication Flow

```text
Register
   ↓
JWT access token
   ↓
Authenticated dashboard
   ↓
Analyze & save
   ↓
User-specific history
   ↓
Dashboard statistics / search / export / delete
```

Passwords are hashed with bcrypt before storage, protected routes require a bearer JWT, and authentication endpoints are rate-limited through configurable environment variables.

## CI / Quality Checks

GitHub Actions validates both application layers on pushes and pull requests.

### Backend

```bash
python -m compileall -q .
python -c "from main import app; assert app.title"
alembic upgrade head
pytest -q
```

### Frontend

```bash
npm ci
npm run lint
npm run build
```

Dependabot is configured to check Python and npm dependency updates weekly.

## Deployment

The repository includes `render.yaml` for a two-service Render deployment: one Docker web service for the FastAPI backend and one Docker web service for the Next.js frontend.

Before production deployment:

1. Set `ENVIRONMENT=production`.
2. Use a strong unique `SECRET_KEY`.
3. Set the frontend `NEXT_PUBLIC_API_URL` to the public backend URL.
4. Set backend `FRONTEND_ORIGIN` to the public frontend URL.
5. Verify `/health`, authentication, analysis, batch processing, and SSE streaming after deployment.
6. Confirm the database is backed by persistent production storage rather than ephemeral local storage.

The Render blueprint is prepared in the repository, but deployment still requires completing the hosting-provider account setup.

## Notes for Development

The project is designed as a local portfolio/demo application. The included stream is a simulated SSE feed rather than a live X/Twitter API integration. The included model and metrics are also demonstration-oriented; production deployment should use a properly curated dataset, reproducible training, model versioning, persistent production storage, and a production secret-management strategy.

## Author

Built and maintained as an NLP, machine-learning, and full-stack engineering portfolio project.
