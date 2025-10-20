import pytest
from sqlalchemy.orm import Session
from insight_console.models.deal import Deal, DealStatus
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

@pytest.fixture
def test_user(db_session: Session):
    """Create a test user"""
    user = User(
        email="investor@firm.com",
        hashed_password="hash123",
        full_name="Test Investor",
        firm_id="firm-123",
        role="investor"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

def test_create_deal(db_session: Session, test_user: User):
    """Test creating a deal"""
    deal = Deal(
        name="TechCo Acquisition",
        target_company="TechCo Inc",
        sector="B2B SaaS",
        deal_type="buyout",
        created_by_id=test_user.id,
        firm_id=test_user.firm_id,
        status=DealStatus.DRAFT
    )
    db_session.add(deal)
    db_session.commit()
    db_session.refresh(deal)

    assert deal.id is not None
    assert deal.name == "TechCo Acquisition"
    assert deal.status == DealStatus.DRAFT
    assert deal.created_by_id == test_user.id

def test_deal_status_enum():
    """Test deal status enum values"""
    assert DealStatus.DRAFT == "draft"
    assert DealStatus.ANALYZING == "analyzing"
    assert DealStatus.SYNTHESIS == "synthesis"
    assert DealStatus.READY == "ready"
    assert DealStatus.ARCHIVED == "archived"
