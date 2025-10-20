# Insight Console MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-powered PE deal analysis platform where investors upload deal materials, AI agents conduct research workflows, and synthesis agents compile findings into actionable reports.

**Architecture:** FastAPI backend with PostgreSQL database, React/Next.js frontend, Claude Agent SDK for workflow orchestration, hybrid deployment ready (containerized). Phase 1-2 MVP includes core plumbing, authentication, single workflow (competitive analysis), and basic UI.

**Tech Stack:** Python 3.11+, FastAPI, PostgreSQL, SQLAlchemy, Anthropic Claude SDK, React/Next.js, TypeScript, Docker

---

## Phase 1: Project Foundation & Core Plumbing

### Task 1: Initialize Backend Project Structure

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/src/insight_console/__init__.py`
- Create: `backend/src/insight_console/main.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/.env.example`
- Create: `backend/Dockerfile`
- Create: `backend/.gitignore`

**Step 1: Create backend directory structure**

```bash
mkdir -p backend/src/insight_console backend/tests
cd backend
```

**Step 2: Write pyproject.toml**

Create `backend/pyproject.toml`:

```toml
[project]
name = "insight-console"
version = "0.1.0"
description = "AI-powered PE deal analysis platform"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "sqlalchemy>=2.0.25",
    "psycopg2-binary>=2.9.9",
    "alembic>=1.13.1",
    "pydantic>=2.5.3",
    "pydantic-settings>=2.1.0",
    "anthropic>=0.18.0",
    "python-multipart>=0.0.6",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "httpx>=0.26.0",
    "pytest>=7.4.4",
    "pytest-asyncio>=0.23.3",
]

[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.build_meta"

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

**Step 3: Write main.py with health check**

Create `backend/src/insight_console/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Insight Console API",
    description="AI-powered PE deal analysis platform",
    version="0.1.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "insight-console"}
```

**Step 4: Write .env.example**

Create `backend/.env.example`:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/insight_console

# API Keys
ANTHROPIC_API_KEY=your_api_key_here

# Security
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=development
```

**Step 5: Write Dockerfile**

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY pyproject.toml .
COPY src/ src/

# Install Python dependencies
RUN pip install --no-cache-dir -e .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "insight_console.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 6: Write .gitignore**

Create `backend/.gitignore`:

```
__pycache__/
*.py[cod]
*$py.class
.env
.venv
venv/
*.egg-info/
.pytest_cache/
.coverage
htmlcov/
dist/
build/
```

**Step 7: Initialize Python package**

Create `backend/src/insight_console/__init__.py`:

```python
"""Insight Console - AI-powered PE deal analysis platform"""
__version__ = "0.1.0"
```

Create `backend/tests/__init__.py` (empty file)

**Step 8: Write test for health check**

Create `backend/tests/test_main.py`:

```python
import pytest
from fastapi.testclient import TestClient
from insight_console.main import app

client = TestClient(app)

def test_health_check():
    """Test health check endpoint returns healthy status"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "insight-console"
    }
```

**Step 9: Run test to verify it passes**

```bash
cd backend
pip install -e .
pytest tests/test_main.py::test_health_check -v
```

Expected: PASS

**Step 10: Commit**

```bash
git init
git add .
git commit -m "feat: initialize backend project structure with FastAPI"
```

---

### Task 2: Database Configuration & Connection

**Files:**
- Create: `backend/src/insight_console/database.py`
- Create: `backend/src/insight_console/config.py`
- Create: `backend/tests/test_database.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`

**Step 1: Write failing test for database connection**

Create `backend/tests/test_database.py`:

```python
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
```

**Step 2: Run test to verify it fails**

```bash
pytest tests/test_database.py -v
```

Expected: FAIL (module not found)

**Step 3: Write config.py for settings**

Create `backend/src/insight_console/config.py`:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/insight_console"

    # API Keys
    anthropic_api_key: str = ""

    # Security
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Environment
    environment: str = "development"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

settings = Settings()
```

**Step 4: Write database.py**

Create `backend/src/insight_console/database.py`:

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Create database engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # Verify connections before using
    echo=settings.environment == "development"
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """
    Dependency for getting database sessions.
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Step 5: Set up PostgreSQL for testing**

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: insight_console
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Step 6: Start database and run tests**

```bash
docker-compose up -d postgres
pytest tests/test_database.py -v
```

Expected: PASS

**Step 7: Initialize Alembic for migrations**

```bash
cd backend
alembic init alembic
```

**Step 8: Configure Alembic**

Edit `backend/alembic.ini`, find the line starting with `sqlalchemy.url` and replace with:

```ini
# sqlalchemy.url = driver://user:pass@localhost/dbname
# Use env var instead - configured in alembic/env.py
```

Edit `backend/alembic/env.py`, replace the imports and config sections:

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from insight_console.database import Base
from insight_console.config import settings

# Import all models here so Alembic can detect them
# from insight_console.models import deal, user, workflow  # Will add later

config = context.config

# Override sqlalchemy.url with settings
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# ... rest of the file remains the same
```

**Step 9: Commit**

```bash
git add .
git commit -m "feat: add database configuration and Alembic setup"
```

---

### Task 3: User Model & Authentication

**Files:**
- Create: `backend/src/insight_console/models/__init__.py`
- Create: `backend/src/insight_console/models/user.py`
- Create: `backend/src/insight_console/auth.py`
- Create: `backend/tests/test_user_model.py`
- Create: `backend/tests/test_auth.py`
- Create: `backend/alembic/versions/001_create_users_table.py`

**Step 1: Write failing test for User model**

Create `backend/tests/test_user_model.py`:

```python
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
```

**Step 2: Run test to verify it fails**

```bash
pytest tests/test_user_model.py -v
```

Expected: FAIL (module not found)

**Step 3: Write User model**

Create `backend/src/insight_console/models/__init__.py`:

```python
"""Database models"""
from .user import User

__all__ = ["User"]
```

Create `backend/src/insight_console/models/user.py`:

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from insight_console.database import Base

class User(Base):
    """User model for authentication and authorization"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    firm_id = Column(String, index=True, nullable=False)  # PE firm identifier
    role = Column(String, default="consultant")  # investor, consultant, expert
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

**Step 4: Create migration**

```bash
cd backend
alembic revision -m "create users table"
```

Edit the generated file in `backend/alembic/versions/` to add:

```python
"""create users table

Revision ID: 001
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('firm_id', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_firm_id'), 'users', ['firm_id'], unique=False)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_firm_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
```

**Step 5: Run migration and tests**

```bash
alembic upgrade head
pytest tests/test_user_model.py -v
```

Expected: PASS

**Step 6: Write failing test for authentication**

Create `backend/tests/test_auth.py`:

```python
import pytest
from insight_console.auth import (
    hash_password,
    verify_password,
    create_access_token,
    verify_token
)

def test_hash_password():
    """Test password hashing"""
    password = "testpassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert len(hashed) > 20

def test_verify_password():
    """Test password verification"""
    password = "testpassword123"
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

def test_create_access_token():
    """Test JWT token creation"""
    data = {"sub": "test@example.com", "user_id": 1}
    token = create_access_token(data)
    assert isinstance(token, str)
    assert len(token) > 20

def test_verify_token():
    """Test JWT token verification"""
    data = {"sub": "test@example.com", "user_id": 1}
    token = create_access_token(data)
    payload = verify_token(token)
    assert payload["sub"] == "test@example.com"
    assert payload["user_id"] == 1

def test_verify_invalid_token():
    """Test that invalid tokens raise errors"""
    with pytest.raises(Exception):
        verify_token("invalid.token.here")
```

**Step 7: Run test to verify it fails**

```bash
pytest tests/test_auth.py -v
```

Expected: FAIL (module not found)

**Step 8: Write auth.py**

Create `backend/src/insight_console/auth.py`:

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")
```

**Step 9: Run tests to verify they pass**

```bash
pytest tests/test_auth.py -v
```

Expected: PASS

**Step 10: Commit**

```bash
git add .
git commit -m "feat: add User model and authentication utilities"
```

---

### Task 4: Deal Model & Workspace Schema

**Files:**
- Create: `backend/src/insight_console/models/deal.py`
- Create: `backend/tests/test_deal_model.py`
- Create: `backend/alembic/versions/002_create_deals_table.py`

**Step 1: Write failing test for Deal model**

Create `backend/tests/test_deal_model.py`:

```python
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
```

**Step 2: Run test to verify it fails**

```bash
pytest tests/test_deal_model.py -v
```

Expected: FAIL (module not found)

**Step 3: Write Deal model**

Create `backend/src/insight_console/models/deal.py`:

```python
import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from insight_console.database import Base

class DealStatus(str, enum.Enum):
    """Deal workflow status"""
    DRAFT = "draft"
    ANALYZING = "analyzing"
    SYNTHESIS = "synthesis"
    READY = "ready"
    ARCHIVED = "archived"

class Deal(Base):
    """Deal model representing a PE investment opportunity"""

    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    target_company = Column(String)
    sector = Column(String)  # B2B SaaS, Healthcare, Manufacturing, etc.
    deal_type = Column(String)  # buyout, growth, add-on
    status = Column(SQLEnum(DealStatus), default=DealStatus.DRAFT, nullable=False)

    # Scope extracted by AI
    key_questions = Column(JSON, default=list)  # List of questions
    hypotheses = Column(JSON, default=list)  # List of hypotheses to test

    # Ownership
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    firm_id = Column(String, index=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
```

**Step 4: Update models __init__.py**

Edit `backend/src/insight_console/models/__init__.py`:

```python
"""Database models"""
from .user import User
from .deal import Deal, DealStatus

__all__ = ["User", "Deal", "DealStatus"]
```

**Step 5: Create migration**

```bash
cd backend
alembic revision -m "create deals table"
```

Edit the generated file to add:

```python
"""create deals table

Revision ID: 002
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '002'
down_revision = '001'  # Previous migration
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'deals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('target_company', sa.String(), nullable=True),
        sa.Column('sector', sa.String(), nullable=True),
        sa.Column('deal_type', sa.String(), nullable=True),
        sa.Column('status', sa.Enum('DRAFT', 'ANALYZING', 'SYNTHESIS', 'READY', 'ARCHIVED', name='dealstatus'), nullable=False),
        sa.Column('key_questions', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('hypotheses', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('firm_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_deals_firm_id'), 'deals', ['firm_id'], unique=False)
    op.create_index(op.f('ix_deals_id'), 'deals', ['id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_deals_id'), table_name='deals')
    op.drop_index(op.f('ix_deals_firm_id'), table_name='deals')
    op.drop_table('deals')
```

**Step 6: Run migration and tests**

```bash
alembic upgrade head
pytest tests/test_deal_model.py -v
```

Expected: PASS

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add Deal model and schema"
```

---

### Task 5: Deal API Endpoints

**Files:**
- Create: `backend/src/insight_console/routers/__init__.py`
- Create: `backend/src/insight_console/routers/deals.py`
- Create: `backend/src/insight_console/schemas/deal.py`
- Create: `backend/tests/test_deals_api.py`

**Step 1: Write failing test for create deal endpoint**

Create `backend/tests/test_deals_api.py`:

```python
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
```

**Step 2: Run test to verify it fails**

```bash
pytest tests/test_deals_api.py -v
```

Expected: FAIL (endpoints not found)

**Step 3: Write Pydantic schemas**

Create `backend/src/insight_console/schemas/__init__.py`:

```python
"""Pydantic schemas for API request/response validation"""
```

Create `backend/src/insight_console/schemas/deal.py`:

```python
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class DealBase(BaseModel):
    """Base deal schema"""
    name: str = Field(..., min_length=1, max_length=200)
    target_company: Optional[str] = None
    sector: Optional[str] = None
    deal_type: Optional[str] = None

class DealCreate(DealBase):
    """Schema for creating a deal"""
    pass

class DealResponse(DealBase):
    """Schema for deal response"""
    id: int
    status: str
    key_questions: List[str] = []
    hypotheses: List[str] = []
    created_by_id: int
    firm_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
```

**Step 4: Write deals router**

Create `backend/src/insight_console/routers/__init__.py`:

```python
"""API routers"""
```

Create `backend/src/insight_console/routers/deals.py`:

```python
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from insight_console.database import get_db
from insight_console.models.deal import Deal, DealStatus
from insight_console.models.user import User
from insight_console.schemas.deal import DealCreate, DealResponse
from insight_console.auth import verify_token

router = APIRouter(prefix="/api/deals", tags=["deals"])

def get_current_user(
    token: str = Depends(lambda: "fake-token-for-now"),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user (simplified for MVP)"""
    # TODO: Implement proper OAuth2 token extraction
    # For now, extract from Authorization header manually
    payload = verify_token(token.replace("Bearer ", ""))
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
def create_deal(
    deal_data: DealCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new deal"""
    deal = Deal(
        name=deal_data.name,
        target_company=deal_data.target_company,
        sector=deal_data.sector,
        deal_type=deal_data.deal_type,
        created_by_id=current_user.id,
        firm_id=current_user.firm_id,
        status=DealStatus.DRAFT
    )
    db.add(deal)
    db.commit()
    db.refresh(deal)
    return deal

@router.get("", response_model=List[DealResponse])
def list_deals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all deals for the current user's firm"""
    deals = db.query(Deal).filter(Deal.firm_id == current_user.firm_id).all()
    return deals

@router.get("/{deal_id}", response_model=DealResponse)
def get_deal(
    deal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific deal"""
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.firm_id == current_user.firm_id
    ).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal
```

**Step 5: Register router in main.py**

Edit `backend/src/insight_console/main.py` to add:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import deals

app = FastAPI(
    title="Insight Console API",
    description="AI-powered PE deal analysis platform",
    version="0.1.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(deals.router)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "insight-console"}
```

**Step 6: Fix authentication dependency**

Update `backend/src/insight_console/routers/deals.py` to properly extract token:

```python
from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import Optional

# ... existing imports ...

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.replace("Bearer ", "")
    try:
        payload = verify_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ... rest remains the same ...
```

**Step 7: Run tests to verify they pass**

```bash
pytest tests/test_deals_api.py -v
```

Expected: PASS

**Step 8: Commit**

```bash
git add .
git commit -m "feat: add Deal API endpoints (create, list, get)"
```

---

## Phase 2: Scope Extraction & Single Workflow

### Task 6: Document Upload & Storage

**Files:**
- Create: `backend/src/insight_console/models/document.py`
- Create: `backend/src/insight_console/routers/documents.py`
- Create: `backend/src/insight_console/schemas/document.py`
- Create: `backend/tests/test_documents.py`
- Create: `backend/alembic/versions/003_create_documents_table.py`
- Create: `backend/uploads/.gitkeep`

**Step 1: Write failing test for document upload**

Create `backend/tests/test_documents.py`:

```python
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
```

**Step 2: Run test to verify it fails**

```bash
pytest tests/test_documents.py -v
```

Expected: FAIL

**Step 3: Write Document model**

Create `backend/src/insight_console/models/document.py`:

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from insight_console.database import Base

class Document(Base):
    """Document model for files uploaded to deals"""

    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)  # Path in storage
    file_size = Column(BigInteger)  # Size in bytes
    mime_type = Column(String)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    deal = relationship("Deal", backref="documents")
    uploaded_by = relationship("User")
```

Update `backend/src/insight_console/models/__init__.py`:

```python
"""Database models"""
from .user import User
from .deal import Deal, DealStatus
from .document import Document

__all__ = ["User", "Deal", "DealStatus", "Document"]
```

**Step 4: Create migration**

```bash
alembic revision -m "create documents table"
```

Edit the generated migration:

```python
"""create documents table

Revision ID: 003
"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('deal_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('uploaded_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['deal_id'], ['deals.id'], ),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_documents_id'), 'documents', ['id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_documents_id'), table_name='documents')
    op.drop_table('documents')
```

**Step 5: Run migration**

```bash
alembic upgrade head
```

**Step 6: Write document schemas**

Create `backend/src/insight_console/schemas/document.py`:

```python
from datetime import datetime
from pydantic import BaseModel

class DocumentResponse(BaseModel):
    """Schema for document response"""
    id: int
    deal_id: int
    filename: str
    file_size: int
    mime_type: str
    uploaded_by_id: int
    created_at: datetime

    class Config:
        from_attributes = True
```

**Step 7: Write documents router**

Create `backend/src/insight_console/routers/documents.py`:

```python
import os
import shutil
from typing import List
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from insight_console.database import get_db
from insight_console.models.deal import Deal
from insight_console.models.document import Document
from insight_console.models.user import User
from insight_console.schemas.document import DocumentResponse
from insight_console.routers.deals import get_current_user

router = APIRouter(prefix="/api/deals/{deal_id}/documents", tags=["documents"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    deal_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a document to a deal"""
    # Verify deal exists and user has access
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.firm_id == current_user.firm_id
    ).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Create deal-specific directory
    deal_dir = UPLOAD_DIR / f"deal_{deal_id}"
    deal_dir.mkdir(exist_ok=True)

    # Save file
    file_path = deal_dir / file.filename
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Get file size
    file_size = file_path.stat().st_size

    # Create document record
    document = Document(
        deal_id=deal_id,
        filename=file.filename,
        file_path=str(file_path),
        file_size=file_size,
        mime_type=file.content_type,
        uploaded_by_id=current_user.id
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    deal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all documents for a deal"""
    # Verify deal exists and user has access
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.firm_id == current_user.firm_id
    ).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    documents = db.query(Document).filter(Document.deal_id == deal_id).all()
    return documents
```

**Step 8: Register router in main.py**

Edit `backend/src/insight_console/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import deals, documents

app = FastAPI(
    title="Insight Console API",
    description="AI-powered PE deal analysis platform",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(deals.router)
app.include_router(documents.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "insight-console"}
```

**Step 9: Create uploads directory**

```bash
mkdir -p backend/uploads
touch backend/uploads/.gitkeep
```

Add to `backend/.gitignore`:

```
uploads/*
!uploads/.gitkeep
```

**Step 10: Run tests**

```bash
pytest tests/test_documents.py -v
```

Expected: PASS

**Step 11: Commit**

```bash
git add .
git commit -m "feat: add document upload and storage"
```

---

### Task 7: Scope Extraction Agent with Claude

**Files:**
- Create: `backend/src/insight_console/agents/__init__.py`
- Create: `backend/src/insight_console/agents/scope_extractor.py`
- Create: `backend/tests/test_scope_extraction.py`
- Create: `backend/src/insight_console/routers/analysis.py`

**Step 1: Write failing test for scope extraction**

Create `backend/tests/test_scope_extraction.py`:

```python
import pytest
from insight_console.agents.scope_extractor import ScopeExtractor

@pytest.fixture
def scope_extractor():
    return ScopeExtractor()

def test_extract_scope_from_text(scope_extractor: ScopeExtractor):
    """Test extracting scope from investment memo text"""
    memo_text = """
    Investment Memo: TechCo Acquisition

    We are evaluating TechCo, a B2B SaaS company with $10M ARR growing at 60% YoY.

    Key questions:
    1. Can they sustain 40%+ growth rates?
    2. What is the competitive landscape?
    3. Are unit economics improving?

    Hypotheses:
    - Enterprise expansion can drive higher NRR
    - CAC payback will improve with sales efficiency
    """

    result = scope_extractor.extract_scope(memo_text, sector="B2B SaaS", deal_type="buyout")

    assert "key_questions" in result
    assert len(result["key_questions"]) >= 2
    assert "hypotheses" in result
    assert len(result["hypotheses"]) >= 1
    assert "recommended_workflows" in result

def test_extract_scope_handles_empty_text(scope_extractor: ScopeExtractor):
    """Test that scope extraction handles empty or minimal text"""
    result = scope_extractor.extract_scope("", sector="Healthcare", deal_type="growth")

    # Should still return structure with defaults
    assert "key_questions" in result
    assert "hypotheses" in result
    assert "recommended_workflows" in result
```

**Step 2: Run test to verify it fails**

```bash
pytest tests/test_scope_extraction.py -v
```

Expected: FAIL (module not found)

**Step 3: Write ScopeExtractor agent**

Create `backend/src/insight_console/agents/__init__.py`:

```python
"""AI agents for workflow orchestration"""
from .scope_extractor import ScopeExtractor

__all__ = ["ScopeExtractor"]
```

Create `backend/src/insight_console/agents/scope_extractor.py`:

```python
import json
from typing import Dict, List
from anthropic import Anthropic
from insight_console.config import settings

class ScopeExtractor:
    """Agent for extracting analysis scope from investment materials"""

    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)

    def extract_scope(self, text: str, sector: str, deal_type: str) -> Dict:
        """
        Extract key questions, hypotheses, and recommended workflows
        from investment memo or deal materials.
        """
        if not text.strip():
            # Return defaults for empty input
            return self._get_default_scope(sector, deal_type)

        prompt = f"""You are analyzing materials for a PE {deal_type} deal in the {sector} sector.

Extract the following from the provided text:
1. Key questions the investor wants answered
2. Hypotheses to test
3. Recommended analysis workflows

Text:
{text}

Return your response as JSON with this structure:
{{
    "key_questions": ["question 1", "question 2", ...],
    "hypotheses": ["hypothesis 1", "hypothesis 2", ...],
    "recommended_workflows": ["competitive_analysis", "market_sizing", "unit_economics", "management_assessment", "financial_benchmarking"]
}}

Only include workflows that are relevant to the questions and sector."""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )

            # Extract text content
            content = response.content[0].text

            # Parse JSON
            result = json.loads(content)

            return result
        except Exception as e:
            # Fallback to defaults on error
            print(f"Error extracting scope: {e}")
            return self._get_default_scope(sector, deal_type)

    def _get_default_scope(self, sector: str, deal_type: str) -> Dict:
        """Return default scope when extraction fails or no text provided"""
        defaults = {
            "key_questions": [
                f"What is the competitive landscape in {sector}?",
                "What are the growth prospects and market dynamics?",
                "Are the unit economics attractive?"
            ],
            "hypotheses": [
                "The company has a defensible market position",
                "There is a clear path to profitability"
            ],
            "recommended_workflows": [
                "competitive_analysis",
                "market_sizing",
                "unit_economics",
                "financial_benchmarking"
            ]
        }
        return defaults
```

**Step 4: Run tests**

Note: This test requires a valid Anthropic API key. For CI/CD, you may want to mock the API.

```bash
export ANTHROPIC_API_KEY=your_key_here
pytest tests/test_scope_extraction.py -v
```

Expected: PASS (if API key is valid) or can skip with `@pytest.mark.skipif`

**Step 5: Add analysis endpoint to trigger scope extraction**

Create `backend/src/insight_console/routers/analysis.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from insight_console.database import get_db
from insight_console.models.deal import Deal, DealStatus
from insight_console.models.document import Document
from insight_console.models.user import User
from insight_console.agents.scope_extractor import ScopeExtractor
from insight_console.routers.deals import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/deals/{deal_id}/analysis", tags=["analysis"])

class StartAnalysisResponse(BaseModel):
    """Response for starting analysis"""
    message: str
    deal_id: int
    status: str
    scope: dict

@router.post("/start", response_model=StartAnalysisResponse)
async def start_analysis(
    deal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start analysis for a deal by extracting scope from uploaded documents
    and preparing workflows.
    """
    # Get deal
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.firm_id == current_user.firm_id
    ).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Get documents
    documents = db.query(Document).filter(Document.deal_id == deal_id).all()
    if not documents:
        raise HTTPException(
            status_code=400,
            detail="No documents uploaded. Please upload deal materials first."
        )

    # Extract text from documents (simplified - just read first doc for MVP)
    # TODO: Implement proper PDF/DOCX text extraction
    first_doc = documents[0]
    try:
        with open(first_doc.file_path, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read(10000)  # First 10k chars
    except Exception:
        text = ""

    # Extract scope
    extractor = ScopeExtractor()
    scope = extractor.extract_scope(
        text=text,
        sector=deal.sector or "Unknown",
        deal_type=deal.deal_type or "buyout"
    )

    # Update deal with extracted scope
    deal.key_questions = scope["key_questions"]
    deal.hypotheses = scope["hypotheses"]
    deal.status = DealStatus.ANALYZING
    db.commit()
    db.refresh(deal)

    return StartAnalysisResponse(
        message="Analysis started. Scope extracted successfully.",
        deal_id=deal.id,
        status=deal.status.value,
        scope=scope
    )
```

**Step 6: Register router**

Edit `backend/src/insight_console/main.py`:

```python
from .routers import deals, documents, analysis

# ... existing code ...

app.include_router(deals.router)
app.include_router(documents.router)
app.include_router(analysis.router)
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add scope extraction agent with Claude"
```

---

### Task 8: Workflow Model & Competitive Analysis Skill

**Files:**
- Create: `backend/src/insight_console/models/workflow.py`
- Create: `backend/src/insight_console/skills/competitive_analysis.py`
- Create: `backend/tests/test_workflow_model.py`
- Create: `backend/alembic/versions/004_create_workflows_table.py`

**Step 1: Write failing test for Workflow model**

Create `backend/tests/test_workflow_model.py`:

```python
import pytest
from sqlalchemy.orm import Session
from insight_console.models.workflow import Workflow, WorkflowStatus, WorkflowType
from insight_console.models.user import User
from insight_console.models.deal import Deal
from insight_console.database import Base, engine, SessionLocal

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
        hashed_password="hash",
        full_name="Test User",
        firm_id="firm-123"
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

def test_create_workflow(db_session: Session, test_deal: Deal):
    """Test creating a workflow"""
    workflow = Workflow(
        deal_id=test_deal.id,
        workflow_type=WorkflowType.COMPETITIVE_ANALYSIS,
        status=WorkflowStatus.PENDING
    )
    db_session.add(workflow)
    db_session.commit()
    db_session.refresh(workflow)

    assert workflow.id is not None
    assert workflow.workflow_type == WorkflowType.COMPETITIVE_ANALYSIS
    assert workflow.status == WorkflowStatus.PENDING
    assert workflow.findings == {}
```

**Step 2: Run test to verify it fails**

```bash
pytest tests/test_workflow_model.py -v
```

Expected: FAIL

**Step 3: Write Workflow model**

Create `backend/src/insight_console/models/workflow.py`:

```python
import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, JSON, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from insight_console.database import Base

class WorkflowType(str, enum.Enum):
    """Types of analysis workflows"""
    COMPETITIVE_ANALYSIS = "competitive_analysis"
    MARKET_SIZING = "market_sizing"
    UNIT_ECONOMICS = "unit_economics"
    MANAGEMENT_ASSESSMENT = "management_assessment"
    FINANCIAL_BENCHMARKING = "financial_benchmarking"

class WorkflowStatus(str, enum.Enum):
    """Workflow execution status"""
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"

class Workflow(Base):
    """Workflow model representing an analysis task"""

    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False)
    workflow_type = Column(SQLEnum(WorkflowType), nullable=False)
    status = Column(SQLEnum(WorkflowStatus), default=WorkflowStatus.PENDING, nullable=False)

    # Progress tracking
    progress_percent = Column(Integer, default=0)  # 0-100
    current_step = Column(String)  # Human-readable current step

    # Results
    findings = Column(JSON, default=dict)  # Structured findings
    sources = Column(JSON, default=list)  # List of sources/citations
    error_message = Column(Text)  # If failed, what went wrong

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))

    # Relationships
    deal = relationship("Deal", backref="workflows")
```

Update `backend/src/insight_console/models/__init__.py`:

```python
"""Database models"""
from .user import User
from .deal import Deal, DealStatus
from .document import Document
from .workflow import Workflow, WorkflowType, WorkflowStatus

__all__ = ["User", "Deal", "DealStatus", "Document", "Workflow", "WorkflowType", "WorkflowStatus"]
```

**Step 4: Create migration**

```bash
alembic revision -m "create workflows table"
```

Edit generated migration:

```python
"""create workflows table

Revision ID: 004
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'workflows',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('deal_id', sa.Integer(), nullable=False),
        sa.Column('workflow_type', sa.Enum('COMPETITIVE_ANALYSIS', 'MARKET_SIZING', 'UNIT_ECONOMICS', 'MANAGEMENT_ASSESSMENT', 'FINANCIAL_BENCHMARKING', name='workflowtype'), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', name='workflowstatus'), nullable=False),
        sa.Column('progress_percent', sa.Integer(), nullable=True),
        sa.Column('current_step', sa.String(), nullable=True),
        sa.Column('findings', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('sources', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['deal_id'], ['deals.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workflows_id'), 'workflows', ['id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_workflows_id'), table_name='workflows')
    op.drop_table('workflows')
```

**Step 5: Run migration and tests**

```bash
alembic upgrade head
pytest tests/test_workflow_model.py -v
```

Expected: PASS

**Step 6: Write competitive analysis skill**

Create `backend/src/insight_console/skills/__init__.py`:

```python
"""Claude skills for workflow execution"""
```

Create `backend/src/insight_console/skills/competitive_analysis.py`:

```python
from typing import Dict, List
from anthropic import Anthropic
from insight_console.config import settings
import json

class CompetitiveAnalysisSkill:
    """
    Claude skill for competitive analysis.
    Analyzes competitors, market positioning, and competitive dynamics.
    """

    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)

    def execute(
        self,
        company_name: str,
        sector: str,
        key_questions: List[str],
        context: str = ""
    ) -> Dict:
        """
        Execute competitive analysis workflow.

        Returns dict with:
        - competitors: List of competitors
        - market_position: Analysis of company's position
        - competitive_dynamics: Key competitive dynamics
        - sources: Citations
        """

        prompt = f"""You are a strategy consultant conducting competitive analysis for a PE deal.

Company: {company_name}
Sector: {sector}

Key Questions:
{chr(10).join(f"- {q}" for q in key_questions if "compet" in q.lower())}

Additional Context:
{context}

Conduct a competitive analysis and return JSON with this structure:
{{
    "competitors": [
        {{"name": "Competitor 1", "description": "Brief description", "market_share": "estimate if known"}},
        ...
    ],
    "market_position": {{
        "positioning": "How the company is positioned",
        "strengths": ["strength 1", "strength 2"],
        "weaknesses": ["weakness 1", "weakness 2"],
        "differentiation": "What makes them different"
    }},
    "competitive_dynamics": {{
        "market_structure": "Description of market structure (fragmented, consolidated, etc.)",
        "key_trends": ["trend 1", "trend 2"],
        "threats": ["threat 1", "threat 2"]
    }},
    "sources": ["source 1", "source 2"]
}}

Base your analysis on general knowledge of the {sector} industry. Note any assumptions."""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text
            result = json.loads(content)

            return result
        except Exception as e:
            return {
                "error": str(e),
                "competitors": [],
                "market_position": {},
                "competitive_dynamics": {},
                "sources": []
            }
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add Workflow model and competitive analysis skill"
```

---

### Task 9: Workflow Execution Endpoint

**Files:**
- Create: `backend/src/insight_console/services/__init__.py`
- Create: `backend/src/insight_console/services/workflow_executor.py`
- Create: `backend/tests/test_workflow_execution.py`

**Step 1: Write failing test for workflow execution**

Create `backend/tests/test_workflow_execution.py`:

```python
import pytest
from sqlalchemy.orm import Session
from insight_console.models.workflow import Workflow, WorkflowStatus, WorkflowType
from insight_console.models.deal import Deal
from insight_console.models.user import User
from insight_console.database import Base, engine, SessionLocal
from insight_console.services.workflow_executor import WorkflowExecutor

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
        email="test@firm.com",
        hashed_password="hash",
        full_name="Test User",
        firm_id="firm-123"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_deal(db_session: Session, test_user: User):
    deal = Deal(
        name="TechCo Deal",
        target_company="TechCo",
        sector="B2B SaaS",
        deal_type="buyout",
        created_by_id=test_user.id,
        firm_id=test_user.firm_id,
        key_questions=["What is the competitive landscape?"]
    )
    db_session.add(deal)
    db_session.commit()
    db_session.refresh(deal)
    return deal

def test_execute_competitive_analysis(db_session: Session, test_deal: Deal):
    """Test executing competitive analysis workflow"""
    workflow = Workflow(
        deal_id=test_deal.id,
        workflow_type=WorkflowType.COMPETITIVE_ANALYSIS,
        status=WorkflowStatus.PENDING
    )
    db_session.add(workflow)
    db_session.commit()
    db_session.refresh(workflow)

    executor = WorkflowExecutor(db_session)
    result = executor.execute_workflow(workflow.id)

    assert result is not None
    assert workflow.status == WorkflowStatus.COMPLETED
    assert workflow.progress_percent == 100
    assert "competitors" in workflow.findings
```

**Step 2: Run test to verify it fails**

```bash
pytest tests/test_workflow_execution.py -v
```

Expected: FAIL

**Step 3: Write WorkflowExecutor service**

Create `backend/src/insight_console/services/__init__.py`:

```python
"""Business logic services"""
```

Create `backend/src/insight_console/services/workflow_executor.py`:

```python
from datetime import datetime
from sqlalchemy.orm import Session
from insight_console.models.workflow import Workflow, WorkflowStatus, WorkflowType
from insight_console.models.deal import Deal
from insight_console.skills.competitive_analysis import CompetitiveAnalysisSkill

class WorkflowExecutor:
    """Service for executing analysis workflows"""

    def __init__(self, db: Session):
        self.db = db

    def execute_workflow(self, workflow_id: int) -> dict:
        """Execute a workflow and update its status"""
        workflow = self.db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        # Update status to running
        workflow.status = WorkflowStatus.RUNNING
        workflow.started_at = datetime.utcnow()
        self.db.commit()

        try:
            # Get deal for context
            deal = self.db.query(Deal).filter(Deal.id == workflow.deal_id).first()

            # Execute appropriate skill based on workflow type
            if workflow.workflow_type == WorkflowType.COMPETITIVE_ANALYSIS:
                result = self._execute_competitive_analysis(workflow, deal)
            else:
                raise NotImplementedError(f"Workflow type {workflow.workflow_type} not yet implemented")

            # Update workflow with results
            workflow.findings = result
            workflow.status = WorkflowStatus.COMPLETED
            workflow.progress_percent = 100
            workflow.completed_at = datetime.utcnow()
            workflow.current_step = "Complete"

            self.db.commit()
            self.db.refresh(workflow)

            return result

        except Exception as e:
            # Mark workflow as failed
            workflow.status = WorkflowStatus.FAILED
            workflow.error_message = str(e)
            self.db.commit()
            raise

    def _execute_competitive_analysis(self, workflow: Workflow, deal: Deal) -> dict:
        """Execute competitive analysis skill"""
        workflow.current_step = "Analyzing competitors"
        workflow.progress_percent = 20
        self.db.commit()

        skill = CompetitiveAnalysisSkill()
        result = skill.execute(
            company_name=deal.target_company or deal.name,
            sector=deal.sector or "Unknown",
            key_questions=deal.key_questions or [],
            context=""
        )

        workflow.progress_percent = 80
        workflow.current_step = "Finalizing analysis"
        self.db.commit()

        return result
```

**Step 4: Run tests**

```bash
pytest tests/test_workflow_execution.py -v
```

Expected: PASS (requires valid API key)

**Step 5: Add API endpoint to trigger workflow execution**

Update `backend/src/insight_console/routers/analysis.py`:

```python
# Add to existing imports
from insight_console.models.workflow import Workflow, WorkflowType, WorkflowStatus
from insight_console.services.workflow_executor import WorkflowExecutor
from typing import List

# Add new schemas
class WorkflowResponse(BaseModel):
    id: int
    workflow_type: str
    status: str
    progress_percent: int
    current_step: str | None
    findings: dict

    class Config:
        from_attributes = True

# Add after start_analysis endpoint
@router.get("/workflows", response_model=List[WorkflowResponse])
async def list_workflows(
    deal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all workflows for a deal"""
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.firm_id == current_user.firm_id
    ).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    workflows = db.query(Workflow).filter(Workflow.deal_id == deal_id).all()
    return workflows

@router.post("/workflows/{workflow_id}/execute", response_model=WorkflowResponse)
async def execute_workflow(
    deal_id: int,
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute a specific workflow"""
    # Verify access
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.firm_id == current_user.firm_id
    ).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.deal_id == deal_id
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Execute workflow
    executor = WorkflowExecutor(db)
    try:
        executor.execute_workflow(workflow_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")

    db.refresh(workflow)
    return workflow
```

**Step 6: Update start_analysis to create workflows**

Update the `start_analysis` function in `backend/src/insight_console/routers/analysis.py`:

```python
@router.post("/start", response_model=StartAnalysisResponse)
async def start_analysis(
    deal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start analysis for a deal by extracting scope from uploaded documents
    and creating workflows.
    """
    # ... existing code to extract scope ...

    # Update deal with extracted scope
    deal.key_questions = scope["key_questions"]
    deal.hypotheses = scope["hypotheses"]
    deal.status = DealStatus.ANALYZING
    db.commit()

    # Create workflows based on recommendations
    for workflow_type_str in scope["recommended_workflows"]:
        try:
            workflow_type = WorkflowType(workflow_type_str)
            workflow = Workflow(
                deal_id=deal.id,
                workflow_type=workflow_type,
                status=WorkflowStatus.PENDING
            )
            db.add(workflow)
        except ValueError:
            # Skip invalid workflow types
            continue

    db.commit()
    db.refresh(deal)

    return StartAnalysisResponse(
        message="Analysis started. Workflows created.",
        deal_id=deal.id,
        status=deal.status.value,
        scope=scope
    )
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add workflow execution service and API endpoints"
```

---

## Phase 1-2 Complete: Next Steps

This implementation plan covers the core foundation (Phase 1) and single workflow capability (Phase 2). You now have:

✅ Backend project structure with FastAPI
✅ PostgreSQL database with models (User, Deal, Document, Workflow)
✅ Authentication utilities
✅ API endpoints for deals, documents, and analysis
✅ Scope extraction agent using Claude
✅ Competitive analysis workflow skill
✅ Workflow execution service

### What's Missing for Full MVP:

**Remaining workflows** (Phase 3):
- Market sizing skill
- Unit economics skill
- Management assessment skill
- Financial benchmarking skill

**Synthesis agent** (Phase 4):
- Multi-workflow synthesis
- Report generation
- Confidence scoring

**Frontend** (Phase 1-5):
- React/Next.js UI
- Dashboard, deal creation, workflow monitoring
- Document upload interface
- Synthesis report viewer

**Production features** (Phase 6):
- Data provider integrations (PitchBook, CapIQ)
- Proper PDF/DOCX text extraction
- Background task queue (Celery/Redis)
- Deployment configs (Docker Compose, K8s)
- Security hardening

---

## Testing the MVP

```bash
# Start database
docker-compose up -d postgres

# Run migrations
cd backend
alembic upgrade head

# Create test user (Python shell)
python -c "
from insight_console.database import SessionLocal
from insight_console.models.user import User
from insight_console.auth import hash_password

db = SessionLocal()
user = User(
    email='test@firm.com',
    hashed_password=hash_password('testpass'),
    full_name='Test User',
    firm_id='firm-123',
    role='investor'
)
db.add(user)
db.commit()
print(f'Created user: {user.email}')
"

# Start server
uvicorn insight_console.main:app --reload

# Test with curl
# Get token (would need login endpoint - not implemented yet)
# Create deal
curl -X POST http://localhost:8000/api/deals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Deal", "target_company": "TestCo", "sector": "SaaS", "deal_type": "buyout"}'
```

---

## Estimated Timeline

**Phase 1 (Tasks 1-5)**: 2-3 weeks
**Phase 2 (Tasks 6-9)**: 2-3 weeks
**Total for MVP backend**: 4-6 weeks

Each task is designed to be completed in 1-2 days with testing.

---
