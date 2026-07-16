from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class UserBase(BaseModel):
    id: str
    name: str
    role: Optional[str] = "Student"
    department: Optional[str] = "Engineering"

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    created_at: datetime
    photo_path: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class AttendanceBase(BaseModel):
    user_id: str
    status: Optional[str] = "Present"

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceResponse(BaseModel):
    id: int
    user_id: str
    timestamp: datetime
    date: date
    status: str
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)

class DailyStats(BaseModel):
    date: str
    total_present: int
    total_late: int

class AnalyticsResponse(BaseModel):
    total_users: int
    today_attendance_count: int
    today_attendance_percentage: float
    daily_trends: List[DailyStats]
    department_stats: dict  # { "Engineering": 12, "HR": 4, ... }
