from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from insight_console.database import get_db
from insight_console.models.deal import Deal
from insight_console.models.synthesis import Synthesis
from insight_console.models.user import User
from insight_console.services.synthesis_service import SynthesisService
from insight_console.routers.deals import get_current_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/deals/{deal_id}/synthesis", tags=["synthesis"])

class SynthesisResponse(BaseModel):
    """Response schema for synthesis"""
    id: int
    deal_id: int
    status: str
    executive_summary: Optional[str]
    key_insights: list
    recommendation: Optional[str]
    recommendation_rationale: Optional[str]
    overall_confidence: Optional[float]
    confidence_by_dimension: dict
    key_risks: list
    risk_mitigation: list
    key_opportunities: list
    value_creation_levers: list
    deal_score: Optional[float]
    dimension_scores: dict
    cross_workflow_insights: list
    recommended_next_steps: list
    information_gaps: list
    workflows_included: list
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

class GenerateSynthesisResponse(BaseModel):
    """Response for synthesis generation request"""
    message: str
    synthesis_id: int
    status: str

@router.post("/generate", response_model=GenerateSynthesisResponse)
async def generate_synthesis(
    deal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate synthesis report by compiling all completed workflow findings.
    """
    # Verify deal access
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.firm_id == current_user.firm_id
    ).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Generate synthesis
    service = SynthesisService(db)
    try:
        synthesis = service.generate_synthesis(deal_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Synthesis generation failed: {str(e)}"
        )

    return GenerateSynthesisResponse(
        message="Synthesis generated successfully",
        synthesis_id=synthesis.id,
        status=synthesis.status.value
    )

@router.get("", response_model=SynthesisResponse)
async def get_synthesis(
    deal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get synthesis report for a deal.
    """
    # Verify deal access
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.firm_id == current_user.firm_id
    ).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Get synthesis
    synthesis = db.query(Synthesis).filter(Synthesis.deal_id == deal_id).first()
    if not synthesis:
        raise HTTPException(
            status_code=404,
            detail="No synthesis found for this deal. Generate one first."
        )

    return synthesis
