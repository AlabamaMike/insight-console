import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from insight_console.main import app
from insight_console.models.user import User
from insight_console.models.deal import Deal
from insight_console.database import Base, engine, SessionLocal
from insight_console.auth import hash_password, create_access_token

client = TestClient(app)

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
        hashed_password=hash_password("testpass123"),
        full_name="Test Investor",
        firm_id="firm-123",
        role="investor"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def auth_headers(test_user: User):
    """Create authentication headers"""
    token = create_access_token({"sub": test_user.email, "user_id": test_user.id})
    return {"Authorization": f"Bearer {token}"}

def test_create_deal(db_session: Session, auth_headers: dict):
    """Test creating a new deal"""
    deal_data = {
        "name": "TechCo Acquisition",
        "target_company": "TechCo Inc",
        "sector": "B2B SaaS",
        "deal_type": "buyout"
    }
    response = client.post("/api/deals", json=deal_data, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "TechCo Acquisition"
    assert data["status"] == "draft"
    assert "id" in data

def test_list_deals(db_session: Session, test_user: User, auth_headers: dict):
    """Test listing deals for a firm"""
    # Create test deals
    deal1 = Deal(
        name="Deal 1",
        target_company="Company 1",
        sector="SaaS",
        deal_type="buyout",
        created_by_id=test_user.id,
        firm_id=test_user.firm_id
    )
    deal2 = Deal(
        name="Deal 2",
        target_company="Company 2",
        sector="Healthcare",
        deal_type="growth",
        created_by_id=test_user.id,
        firm_id=test_user.firm_id
    )
    db_session.add_all([deal1, deal2])
    db_session.commit()

    response = client.get("/api/deals", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] in ["Deal 1", "Deal 2"]

def test_get_deal(db_session: Session, test_user: User, auth_headers: dict):
    """Test getting a specific deal"""
    deal = Deal(
        name="Test Deal",
        target_company="Test Co",
        sector="SaaS",
        deal_type="buyout",
        created_by_id=test_user.id,
        firm_id=test_user.firm_id
    )
    db_session.add(deal)
    db_session.commit()
    db_session.refresh(deal)

    response = client.get(f"/api/deals/{deal.id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Deal"
    assert data["id"] == deal.id
