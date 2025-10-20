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
