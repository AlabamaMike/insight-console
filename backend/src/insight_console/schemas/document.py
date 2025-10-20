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
