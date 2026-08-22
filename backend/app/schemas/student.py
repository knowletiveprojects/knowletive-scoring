from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from typing import Optional


class StudentCreate(BaseModel):
    name: str
    email: EmailStr
    photo: Optional[str] = None
    batch_id: Optional[int] = None


class StudentResponse(BaseModel):
    id: int
    name: str
    email: str
    level: str
    photo: Optional[str] = None
    joined_at: datetime
    batch_id: Optional[int] = None

    class Config:
        from_attributes = True


class RewardCreate(BaseModel):
    student_id: int
    type: str
    title: str
    date: Optional[date] = None


class RewardResponse(BaseModel):
    id: int
    student_id: int
    type: str
    title: str
    date: date