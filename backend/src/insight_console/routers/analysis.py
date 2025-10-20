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
