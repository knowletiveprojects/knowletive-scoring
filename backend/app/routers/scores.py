from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from app.models.score import Score
from app.models.student import Student
from app.models.reward import Reward
from app.schemas.score import ScoreCreate, ScoreResponse
from typing import List, Optional
from datetime import date, timedelta
from sqlalchemy import func, text

router = APIRouter(prefix="/scores", tags=["Scores"])


def update_student_level(student_id: int, db: Session):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return
    latest_score = (
        db.query(Score)
        .filter(Score.student_id == student_id, Score.total > 0)
        .order_by(Score.date.desc())
        .first()
    )
    if not latest_score:
        return
    total = latest_score.total
    if total < 50:
        student.level = "Beginner"
    elif total < 75:
        student.level = "Learner"
    elif total < 90:
        student.level = "Achiever"
    else:
        student.level = "Champion"
    db.commit()


@router.post("/", response_model=ScoreResponse)
def submit_score(payload: ScoreCreate, db: Session = Depends(get_db)):
    is_suggestion = payload.total == 0 and payload.suggestion is not None

    if not is_suggestion:
        existing = db.query(Score).filter(
            Score.student_id == payload.student_id,
            Score.date == payload.date,
            Score.score_type == payload.score_type
        ).first()
        if existing and existing.total > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Score already submitted for this student for this {payload.score_type} period!"
            )

    total = (
        payload.attendance + payload.speak_up + payload.activity +
        payload.technical + payload.behavior + payload.initiative
    )
    data = payload.dict()
    data["total"] = total
    score = Score(**data)
    db.add(score)
    db.commit()
    db.refresh(score)

    if not is_suggestion:
        update_student_level(payload.student_id, db)
        if payload.score_type == "daily":
            today = date.today()
            top = (
                db.query(Student.name, Score.total, Score.student_id)
                .join(Score, Score.student_id == Student.id)
                .filter(Score.date == today, Score.total > 0, Score.score_type == "daily")
                .order_by(Score.total.desc())
                .first()
            )
            if top:
                existing_reward = db.query(Reward).filter(
                    Reward.date == today,
                    Reward.type == "daily",
                    Reward.title == "Student of the Day"
                ).first()
                if existing_reward:
                    existing_reward.student_id = top.student_id
                else:
                    reward = Reward(
                        student_id=top.student_id,
                        type="daily",
                        title="Student of the Day",
                        date=today
                    )
                    db.add(reward)
                db.commit()

    return score


@router.get("/leaderboard/today", response_model=List[dict])
def today_leaderboard(batch_id: Optional[int] = None, db: Session = Depends(get_db)):
    today = date.today()
    query = (
        db.query(Student.name, Student.id.label("student_id"), Score.total)
        .join(Score, Score.student_id == Student.id)
        .filter(Score.date == today, Score.total > 0, Score.score_type == "daily")
    )
    if batch_id is not None:
        query = query.filter(Student.batch_id == batch_id)
    results = query.order_by(Score.total.desc()).limit(20).all()
    return [{"name": r.name, "student_id": r.student_id, "total": r.total, "rank": i + 1}
            for i, r in enumerate(results)]


@router.get("/leaderboard/weekly", response_model=List[dict])
def weekly_leaderboard(batch_id: Optional[int] = None, db: Session = Depends(get_db)):
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    query = (
        db.query(
            Student.name,
            Student.id.label("student_id"),
            func.sum(Score.total).label("total")
        )
        .join(Score, Score.student_id == Student.id)
        .filter(
            Score.date >= week_start,
            Score.date <= today,
            Score.total > 0,
            Score.score_type == "daily"  # ✅ sum all daily scores this week
        )
    )
    if batch_id is not None:
        query = query.filter(Student.batch_id == batch_id)
    results = (
        query.group_by(Student.id, Student.name)
        .order_by(func.sum(Score.total).desc())
        .limit(20)
        .all()
    )
    return [{"name": r.name, "student_id": r.student_id, "total": r.total, "rank": i + 1}
            for i, r in enumerate(results)]


@router.get("/leaderboard/monthly", response_model=List[dict])
def monthly_leaderboard(batch_id: Optional[int] = None, db: Session = Depends(get_db)):
    today = date.today()
    month_start = today.replace(day=1)
    query = (
        db.query(
            Student.name,
            Student.id.label("student_id"),
            func.sum(Score.total).label("total")
        )
        .join(Score, Score.student_id == Student.id)
        .filter(
            Score.date >= month_start,
            Score.date <= today,
            Score.total > 0,
            Score.score_type == "daily"  # ✅ sum all daily scores this month
        )
    )
    if batch_id is not None:
        query = query.filter(Student.batch_id == batch_id)
    results = (
        query.group_by(Student.id, Student.name)
        .order_by(func.sum(Score.total).desc())
        .limit(20)
        .all()
    )
    return [{"name": r.name, "student_id": r.student_id, "total": r.total, "rank": i + 1}
            for i, r in enumerate(results)]


@router.get("/student-of-the-day")
def student_of_the_day(batch_id: Optional[int] = None, db: Session = Depends(get_db)):
    today = date.today()
    query = (
        db.query(Student.name, Score.total)
        .join(Score, Score.student_id == Student.id)
        .filter(Score.date == today, Score.score_type == "daily")
    )
    if batch_id is not None:
        query = query.filter(Student.batch_id == batch_id)
    result = query.order_by(Score.total.desc()).first()
    if not result:
        raise HTTPException(status_code=404, detail="No scores today")
    return {"student_of_the_day": result.name, "score": result.total}


@router.get("/debug")
def debug(db: Session = Depends(get_db)):
    results = db.execute(text("SELECT id, score_type FROM daily_scores")).fetchall()
    return [{"id": r[0], "score_type": r[1]} for r in results]


@router.get("/weekly/{student_id}")
def weekly_scores(student_id: int, db: Session = Depends(get_db)):
    scores = (
        db.query(Score)
        .filter(Score.student_id == student_id)
        .order_by(Score.date.desc())
        .limit(7)
        .all()
    )
    return scores


@router.get("/my-scores/{student_id}")
def my_scores(student_id: int, db: Session = Depends(get_db)):
    scores = (
        db.query(Score)
        .filter(Score.student_id == student_id)
        .order_by(Score.date.desc())
        .all()
    )
    return scores


@router.get("/scores/range/{student_id}")
def scores_by_range(student_id: int, range: str = "daily", db: Session = Depends(get_db)):
    today = date.today()
    if range == "weekly":
        start = today - timedelta(days=today.weekday())
    elif range == "monthly":
        start = today.replace(day=1)
    else:
        start = today
    scores = (
        db.query(Score)
        .filter(Score.student_id == student_id, Score.date >= start, Score.total > 0, Score.score_type == range)
        .order_by(Score.date.desc())
        .all()
    )
    return scores


@router.get("/average/{student_id}")
def student_average(student_id: int, days: int = 7, db: Session = Depends(get_db)):
    end = date.today()
    start = end - timedelta(days=days - 1)

    scores = db.query(Score).filter(
        Score.student_id == student_id,
        Score.date >= start,
        Score.date <= end,
        Score.total > 0
    ).order_by(Score.date.desc()).all()

    if not scores:
        return {
            "student_id": student_id, "days": days, "total_sessions": 0,
            "average_total": 0, "average_attendance": 0, "average_speak_up": 0,
            "average_activity": 0, "average_technical": 0, "average_behavior": 0,
            "average_initiative": 0, "scores": []
        }

    count = len(scores)
    return {
        "student_id": student_id, "days": days, "total_sessions": count,
        "average_total":      round(sum(s.total for s in scores) / count, 1),
        "average_attendance": round(sum(s.attendance for s in scores) / count, 1),
        "average_speak_up":   round(sum(s.speak_up for s in scores) / count, 1),
        "average_activity":   round(sum(s.activity for s in scores) / count, 1),
        "average_technical":  round(sum(s.technical for s in scores) / count, 1),
        "average_behavior":   round(sum(s.behavior for s in scores) / count, 1),
        "average_initiative": round(sum(s.initiative for s in scores) / count, 1),
        "scores": [{"date": str(s.date), "total": s.total} for s in scores]
    }


@router.get("/averages/all")
def all_students_average(days: int = 7, batch_id: Optional[int] = None, db: Session = Depends(get_db)):
    end = date.today()
    start = end - timedelta(days=days - 1)

    query = db.query(
        Student.id, Student.name, Student.email, Student.level,
        func.count(Score.id).label("sessions"),
        func.avg(Score.total).label("avg_total"),
        func.avg(Score.attendance).label("avg_attendance"),
        func.avg(Score.speak_up).label("avg_speak_up"),
        func.avg(Score.activity).label("avg_activity"),
        func.avg(Score.technical).label("avg_technical"),
        func.avg(Score.behavior).label("avg_behavior"),
        func.avg(Score.initiative).label("avg_initiative"),
    ).outerjoin(
        Score,
        (Score.student_id == Student.id) & (Score.date >= start) & (Score.date <= end) & (Score.total > 0)
    )
    if batch_id is not None:
        query = query.filter(Student.batch_id == batch_id)

    results = (
        query.group_by(Student.id, Student.name, Student.email, Student.level)
        .order_by(func.avg(Score.total).desc().nulls_last())
        .all()
    )

    return [{
        "id": r.id, "name": r.name, "email": r.email, "level": r.level,
        "sessions":        r.sessions or 0,
        "avg_total":       round(float(r.avg_total or 0), 1),
        "avg_attendance":  round(float(r.avg_attendance or 0), 1),
        "avg_speak_up":    round(float(r.avg_speak_up or 0), 1),
        "avg_activity":    round(float(r.avg_activity or 0), 1),
        "avg_technical":   round(float(r.avg_technical or 0), 1),
        "avg_behavior":    round(float(r.avg_behavior or 0), 1),
        "avg_initiative":  round(float(r.avg_initiative or 0), 1),
    } for r in results]


@router.get("/streak/{student_id}")
def get_streak(student_id: int, db: Session = Depends(get_db)):
    today = date.today()
    streak = 0
    check_date = today

    while True:
        score = db.query(Score).filter(
            Score.student_id == student_id,
            Score.date == check_date,
            Score.attendance > 0
        ).first()
        if not score:
            break
        streak += 1
        check_date = check_date - timedelta(days=1)

    return {"student_id": student_id, "streak": streak}


@router.get("/streaks/all")
def get_all_streaks(batch_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Student)
    if batch_id is not None:
        query = query.filter(Student.batch_id == batch_id)
    students = query.all()
    result = []

    for student in students:
        today = date.today()
        streak = 0
        check_date = today

        while True:
            score = db.query(Score).filter(
                Score.student_id == student.id,
                Score.date == check_date,
                Score.attendance > 0
            ).first()
            if not score:
                break
            streak += 1
            check_date = check_date - timedelta(days=1)

        result.append({
            "student_id": student.id,
            "name": student.name,
            "streak": streak
        })

    return result