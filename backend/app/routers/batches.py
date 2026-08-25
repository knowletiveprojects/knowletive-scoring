from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from app.models.batch import Batch
from app.schemas.batch import BatchCreate, BatchResponse
from typing import List

router = APIRouter(prefix="/batches", tags=["Batches"])


@router.get("/", response_model=List[BatchResponse])
def get_all_batches(db: Session = Depends(get_db)):
    return db.query(Batch).order_by(Batch.created_at.desc()).all()


@router.get("/active", response_model=List[BatchResponse])
def get_active_batches(db: Session = Depends(get_db)):
    """Multiple batches can be active at once."""
    return db.query(Batch).filter(Batch.is_active == True).all()


@router.post("/", response_model=BatchResponse)
def create_batch(payload: BatchCreate, db: Session = Depends(get_db)):
    """Starting a new batch does NOT close any existing batch — they can run side by side.
    Prevents creating a duplicate: an active batch with the same name (case-insensitive)."""
    existing = (
        db.query(Batch)
        .filter(Batch.is_active == True)
        .filter(Batch.name.ilike(payload.name.strip()))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"An active batch named '{payload.name}' already exists."
        )

    batch = Batch(name=payload.name.strip(), is_active=True)
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.patch("/{batch_id}/end", response_model=BatchResponse)
def end_batch(batch_id: int, db: Session = Depends(get_db)):
    """Mark a batch as finished once it actually ends."""
    from datetime import datetime
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    batch.is_active = False
    batch.end_date = datetime.utcnow()
    db.commit()
    db.refresh(batch)
    return batch