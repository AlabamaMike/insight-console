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
