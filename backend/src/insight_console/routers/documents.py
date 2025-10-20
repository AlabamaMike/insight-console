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
