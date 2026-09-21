from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import date

class Attendance(Base):
    __tablename__ = "attendance"

    id         = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    date       = Column(Date, nullable=False)
    status     = Column(String, nullable=False)  # "present", "absent", "holiday", "half_day"
    reason     = Column(String, nullable=True)    # student-submitted reason for absence (optional)

    student = relationship("Student", back_populates="attendance")

# Also add this line to Student model in app/models/student.py:
# attendance = relationship("Attendance", back_populates="student")