import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_DATABASE_URL = f"sqlite:///{DATA_DIR / 'sentiment.db'}"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()
CONFIGURED_DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


def validate_database_url(environment: str, database_url: str) -> None:
    if environment.strip().lower() == "production" and not database_url.strip():
        raise RuntimeError("DATABASE_URL must be set when ENVIRONMENT=production.")


validate_database_url(ENVIRONMENT, CONFIGURED_DATABASE_URL)
DATABASE_URL = CONFIGURED_DATABASE_URL or DEFAULT_DATABASE_URL

url = make_url(DATABASE_URL)
connect_args = {"check_same_thread": False} if url.get_backend_name() == "sqlite" else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
