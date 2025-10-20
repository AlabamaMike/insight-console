import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, JSON, Text, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from insight_console.database import Base

class SynthesisStatus(str, enum.Enum):
    """Synthesis generation status"""
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"

class InvestmentRecommendation(str, enum.Enum):
    """Investment recommendation types"""
    STRONG_BUY = "strong_buy"
    BUY = "buy"
    HOLD = "hold"
    PASS = "pass"
    STRONG_PASS = "strong_pass"

class Synthesis(Base):
    """Synthesis model for compiled deal analysis and recommendations"""

    __tablename__ = "syntheses"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, unique=True)
    status = Column(SQLEnum(SynthesisStatus), default=SynthesisStatus.PENDING, nullable=False)

    # Executive Summary
    executive_summary = Column(Text)  # High-level overview
    key_insights = Column(JSON, default=list)  # List of key findings

    # Investment Recommendation
    recommendation = Column(SQLEnum(InvestmentRecommendation))
    recommendation_rationale = Column(Text)  # Why this recommendation

    # Confidence Scoring (0-100)
    overall_confidence = Column(Float)  # Overall confidence score
    confidence_by_dimension = Column(JSON, default=dict)  # Confidence per workflow

    # Risk Assessment
    key_risks = Column(JSON, default=list)  # Major risks identified
    risk_mitigation = Column(JSON, default=list)  # Suggested mitigations

    # Opportunities
    key_opportunities = Column(JSON, default=list)  # Major opportunities
    value_creation_levers = Column(JSON, default=list)  # How to create value

    # Deal Metrics Summary
    deal_score = Column(Float)  # Overall deal score (0-100)
    dimension_scores = Column(JSON, default=dict)  # Scores by analysis dimension

    # Compiled Findings
    compiled_findings = Column(JSON, default=dict)  # All workflow findings consolidated
    cross_workflow_insights = Column(JSON, default=list)  # Insights across workflows

    # Next Steps
    recommended_next_steps = Column(JSON, default=list)  # What to do next
    information_gaps = Column(JSON, default=list)  # What info is missing

    # Metadata
    workflows_included = Column(JSON, default=list)  # Which workflows were synthesized
    error_message = Column(Text)  # If failed, what went wrong

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))

    # Relationships
    deal = relationship("Deal", backref="synthesis")
