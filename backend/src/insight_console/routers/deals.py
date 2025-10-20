from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from insight_console.database import get_db
from insight_console.models.deal import Deal, DealStatus
from insight_console.models.user import User
from insight_console.schemas.deal import DealCreate, DealResponse
from insight_console.auth import verify_token

router = APIRouter(prefix="/api/deals", tags=["deals"])

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
