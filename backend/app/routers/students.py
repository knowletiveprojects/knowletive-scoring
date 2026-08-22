from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from app.models.student import Student
from app.models.score import Score
from app.models.reward import Reward
from app.schemas.student import StudentCreate, StudentResponse, RewardCreate, RewardResponse
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from app.models.batch import Batch

router = APIRouter(prefix="/students", tags=["Students"])

class PhotoUpdate(BaseModel):
    photo: Optional[str] = None

class StudentUpdate(BaseModel):
    name: str
    photo: Optional[str] = None

@router.post("/", response_model=StudentResponse)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    existing = db.query(Student).filter(Student.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    batch = db.query(Batch).filter(Batch.id == payload.batch_id).first()
    if not batch:
        raise HTTPException(status_code=400, detail="Invalid batch_id")
    student = Student(**payload.dict())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

@router.get("/", response_model=List[StudentResponse])
def get_all_students(
    batch_id: Optional[int] = None,
    all_batches: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(Student)
    if all_batches:
        return query.all()
    if batch_id is not None:
        return query.filter(Student.batch_id == batch_id).all()
    active_ids = [b.id for b in db.query(Batch).filter(Batch.is_active == True).all()]
    return query.filter(Student.batch_id.in_(active_ids)).all()

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.post("/login")
def student_login(email: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.email == email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.patch("/{student_id}/photo")
def update_photo(student_id: int, payload: PhotoUpdate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.photo = payload.photo
    db.commit()
    db.refresh(student)
    return student

@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    student.name = payload.name

    if payload.photo is not None:
        student.photo = payload.photo

    db.commit()
    db.refresh(student)

    return student

@router.delete("/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.query(Score).filter(Score.student_id == student_id).delete()
    db.query(Reward).filter(Reward.student_id == student_id).delete()
    db.delete(student)
    db.commit()
    return {"message": "Student deleted"}

# ── REWARDS ──
@router.post("/rewards/give", response_model=RewardResponse)
def give_reward(payload: RewardCreate, db: Session = Depends(get_db)):
    reward = Reward(
        student_id=payload.student_id,
        type=payload.type,
        title=payload.title,
        date=payload.date or date.today()
    )
    db.add(reward)
    db.commit()
    db.refresh(reward)
    return reward

@router.get("/rewards/student/{student_id}")
def get_student_rewards(student_id: int, db: Session = Depends(get_db)):
    rewards = (
        db.query(Reward)
        .filter(Reward.student_id == student_id)
        .order_by(Reward.date.desc())
        .all()
    )
    return rewards

@router.get("/rewards/all")
def get_all_rewards(db: Session = Depends(get_db)):
    results = (
        db.query(Student.name, Reward.type, Reward.title, Reward.date)
        .join(Reward, Reward.student_id == Student.id)
        .order_by(Reward.date.desc())
        .limit(50)
        .all()
    )
    return [{"name": r.name, "type": r.type, "title": r.title, "date": str(r.date)} for r in results]