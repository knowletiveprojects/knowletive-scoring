from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from app.routers import students, scores, attendance, interpersonal_skills, project_updates, study_material
from app.models.student import Student
from app.models.score import Score
from app.models.reward import Reward
from app.models.attendance import Attendance
from app.models.interpersonal_skill import InterpersonalSkill
from app.models.study_material import StudyMaterial
from sqlalchemy import text
from app.models.batch import Batch
from app.routers import students, scores, attendance, interpersonal_skills, project_updates, study_material, batches




Base.metadata.create_all(bind=engine)

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE daily_scores ADD COLUMN IF NOT EXISTS suggestion TEXT"))
        conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS photo TEXT"))
        conn.execute(text("ALTER TABLE project_updates ADD COLUMN IF NOT EXISTS technology VARCHAR"))
        conn.execute(text("ALTER TABLE project_updates ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE project_updates ADD COLUMN IF NOT EXISTS faculty_remark VARCHAR"))
        conn.execute(text("ALTER TABLE project_updates ADD COLUMN IF NOT EXISTS reviewer_name VARCHAR"))
        conn.execute(text("ALTER TABLE daily_scores ADD COLUMN IF NOT EXISTS score_type VARCHAR DEFAULT 'daily'"))
        conn.execute(text("UPDATE daily_scores SET score_type = 'daily' WHERE score_type IS NULL"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS interpersonal_skills (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                week INTEGER NOT NULL,
                communication INTEGER DEFAULT 0,
                dressing INTEGER DEFAULT 0,
                gestures INTEGER DEFAULT 0,
                time_management INTEGER DEFAULT 0,
                posture INTEGER DEFAULT 0,
                teamwork INTEGER DEFAULT 0,
                confidence INTEGER DEFAULT 0,
                leadership INTEGER DEFAULT 0,
                UNIQUE(student_id, week)
            )
        """))
        conn.commit()
except:
    pass

app = FastAPI(title="Knowletive Scoring API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(students.router)
app.include_router(scores.router)
app.include_router(attendance.router)
app.include_router(interpersonal_skills.router)
app.include_router(project_updates.router)
app.include_router(study_material.router)
app.include_router(batches.router)


@app.get("/")
def root():
    return {"message": "Knowletive Scoring API is running 🚀"}