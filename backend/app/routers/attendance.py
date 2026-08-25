from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from app.models.attendance import Attendance
from app.models.student import Student
from app.schemas.attendance import AttendanceCreate, AttendanceResponse, BulkAttendanceCreate
from typing import List, Optional
from datetime import date

router = APIRouter(prefix="/attendance", tags=["Attendance"])


def calc_pct(records):
    present  = sum(1   for r in records if r.status == "present")
    half_day = sum(0.5 for r in records if r.status == "half_day")
    absent   = sum(1   for r in records if r.status == "absent")
    holiday  = sum(1   for r in records if r.status == "holiday")
    marked   = present + len([r for r in records if r.status == "half_day"]) + absent + holiday
    effective = present + half_day
    pct = round((effective / marked) * 100) if marked > 0 else 0
    return {
        "present":  int(present),
        "half_day": len([r for r in records if r.status == "half_day"]),
        "absent":   int(absent),
        "holiday":  int(holiday),
        "marked":   int(marked),
        "pct":      int(pct),
    }


@router.get("/", response_model=List[AttendanceResponse])
def get_all_attendance(batch_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Attendance)
    if batch_id is not None:
        query = query.join(Student, Attendance.student_id == Student.id).filter(Student.batch_id == batch_id)
    return query.all()


@router.get("/date/{date}", response_model=List[dict])
def get_attendance_by_date(date: date, batch_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = (
        db.query(Attendance, Student.name)
        .join(Student, Attendance.student_id == Student.id)
        .filter(Attendance.date == date)
    )
    if batch_id is not None:
        query = query.filter(Student.batch_id == batch_id)
    results = query.all()
    return [
        {
            "id": a.id,
            "student_id": a.student_id,
            "student_name": name,
            "date": str(a.date),
            "status": a.status,
        }
        for a, name in results
    ]


@router.get("/student/{student_id}", response_model=List[AttendanceResponse])
def get_student_attendance(student_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Attendance)
        .filter(Attendance.student_id == student_id)
        .order_by(Attendance.date)
        .all()
    )


@router.get("/summary", response_model=List[dict])
def get_attendance_summary(batch_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Student)
    if batch_id is not None:
        query = query.filter(Student.batch_id == batch_id)
    students = query.all()
    result = []
    for s in students:
        records = db.query(Attendance).filter(Attendance.student_id == s.id).all()
        stats = calc_pct(records)
        result.append({
            "student_id":   s.id,
            "student_name": s.name,
            **stats,
        })
    return result


@router.post("/mark", response_model=AttendanceResponse)
def mark_attendance(payload: AttendanceCreate, db: Session = Depends(get_db)):
    existing = db.query(Attendance).filter(
        Attendance.student_id == payload.student_id,
        Attendance.date == payload.date,
    ).first()
    if existing:
        existing.status = payload.status
        db.commit()
        db.refresh(existing)
        return existing
    record = Attendance(**payload.dict())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/mark-bulk")
def mark_bulk_attendance(payload: BulkAttendanceCreate, db: Session = Depends(get_db)):
    updated = []
    for rec in payload.records:
        existing = db.query(Attendance).filter(
            Attendance.student_id == rec.student_id,
            Attendance.date == payload.date,
        ).first()
        if existing:
            existing.status = rec.status
            updated.append(existing)
        else:
            new_rec = Attendance(
                student_id=rec.student_id,
                date=payload.date,
                status=rec.status,
            )
            db.add(new_rec)
            updated.append(new_rec)
    db.commit()
    return {"message": f"{len(updated)} records saved", "date": str(payload.date)}


@router.delete("/{attendance_id}")
def delete_attendance(attendance_id: int, db: Session = Depends(get_db)):
    record = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    return {"message": "Deleted"}