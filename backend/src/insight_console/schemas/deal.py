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
