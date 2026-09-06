import pytest

from database import validate_database_url


@pytest.mark.parametrize("database_url", ["", "   "])
def test_production_requires_database_url(database_url: str):
    with pytest.raises(RuntimeError, match="DATABASE_URL must be set"):
        validate_database_url("production", database_url)


def test_production_accepts_database_url():
    validate_database_url("production", "postgresql+psycopg://user:password@db:5432/sentiment_db")


def test_non_production_allows_database_fallback():
    validate_database_url("development", "")
