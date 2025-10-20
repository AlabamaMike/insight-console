import pytest
import io
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
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def test_user(db_session: Session):
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
def test_deal(db_session: Session, test_user: User):
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
    return deal

@pytest.fixture
def auth_headers(test_user: User):
    token = create_access_token({"sub": test_user.email, "user_id": test_user.id})
    return {"Authorization": f"Bearer {token}"}

def test_upload_document(db_session: Session, test_deal: Deal, auth_headers: dict):
    """Test uploading a document to a deal"""
    file_content = b"This is a test PDF content"
    files = {
        "file": ("test_memo.pdf", io.BytesIO(file_content), "application/pdf")
    }
    response = client.post(
        f"/api/deals/{test_deal.id}/documents",
        files=files,
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["filename"] == "test_memo.pdf"
    assert data["deal_id"] == test_deal.id

def test_list_documents(db_session: Session, test_deal: Deal, auth_headers: dict):
    """Test listing documents for a deal"""
    # Upload a document first
    files = {
        "file": ("memo.pdf", io.BytesIO(b"content"), "application/pdf")
    }
    client.post(
        f"/api/deals/{test_deal.id}/documents",
        files=files,
        headers=auth_headers
    )

    response = client.get(
        f"/api/deals/{test_deal.id}/documents",
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["filename"] == "memo.pdf"
