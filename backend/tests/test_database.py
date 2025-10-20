import pytest
from sqlalchemy import text
from insight_console.database import get_db, engine

def test_database_connection():
    """Test database connection is established"""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        assert result.scalar() == 1

def test_get_db_session():
    """Test get_db yields a valid session"""
    db_gen = get_db()
    db = next(db_gen)
    assert db is not None
    # Cleanup
    try:
        next(db_gen)
    except StopIteration:
        pass
