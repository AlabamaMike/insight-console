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
