from sqlalchemy import Column, Integer, String, Date, DateTime, ARRAY, Text
from sqlalchemy.sql import func
from database import Base

class StudyMaterial(Base):
    __tablename__ = "study_material"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    topic_name = Column(String(255), nullable=False)
    video_recorded = Column(String(10), default="")
    video_access = Column(String(10), default="")
    programs_given = Column(Integer, default=0)
    programs_submitted = Column(Integer, default=0)
    notes = Column(ARRAY(Text), default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
