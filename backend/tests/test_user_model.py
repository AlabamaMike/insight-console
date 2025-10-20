import pytest
from sqlalchemy.orm import Session
from insight_console.models.user import User
from insight_console.database import Base, engine, SessionLocal

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test"""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

def test_create_user(db_session: Session):
    """Test creating a user in the database"""
    user = User(
        email="test@example.com",
        hashed_password="fakehash123",
        full_name="Test User",
        firm_id="firm-123",
        role="investor"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.is_active is True

def test_user_email_unique(db_session: Session):
    """Test that user emails must be unique"""
    user1 = User(
        email="test@example.com",
        hashed_password="hash1",
        full_name="User 1",
        firm_id="firm-123"
    )
    user2 = User(
        email="test@example.com",
        hashed_password="hash2",
        full_name="User 2",
        firm_id="firm-123"
    )
    db_session.add(user1)
    db_session.commit()

    db_session.add(user2)
    with pytest.raises(Exception):  # IntegrityError
        db_session.commit()
