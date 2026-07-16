import datetime
from sqlalchemy import BLOB, Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)  # Student/Employee ID or UUID
    name = Column(String, nullable=False)
    role = Column(String, nullable=True)               # e.g., Student, Employee
    department = Column(String, nullable=True)         # e.g., Engineering, HR
    face_encoding = Column(BLOB, nullable=False)       # 128-dimensional vector as binary float32 bytes
    photo_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    attendance_records = relationship("Attendance", back_populates="user", cascade="all, delete-orphan")

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.now)
    date = Column(Date, default=datetime.date.today, index=True) # Date component for duplicate checking
    status = Column(String, default="Present") # Present, Late, etc.

    user = relationship("User", back_populates="attendance_records")
