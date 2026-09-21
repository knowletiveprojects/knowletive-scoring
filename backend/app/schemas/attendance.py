from pydantic import BaseModel
from datetime import date
from typing import Optional, List

class AttendanceCreate(BaseModel):
    student_id: int
    date: date
    status: str  # "present", "absent", "holiday", "half_day"

class AttendanceUpdate(BaseModel):
    status: str

class AttendanceReasonUpdate(BaseModel):
    reason: str

class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    date: date
    status: str
    reason: Optional[str] = None

    class Config:
        from_attributes = True

class BulkAttendanceCreate(BaseModel):
    date: date
    records: List[AttendanceCreate]