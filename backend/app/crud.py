import datetime
from typing import Optional
from sqlalchemy import desc, func, Integer
from sqlalchemy.orm import Session
from . import models, schemas

# --- USER CRUD ---

def get_user_by_id(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate, face_encoding: bytes, photo_path: Optional[str] = None):
    db_user = models.User(
        id=user.id,
        name=user.name,
        role=user.role,
        department=user.department,
        face_encoding=face_encoding,
        photo_path=photo_path
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- ATTENDANCE CRUD ---

def check_attendance_exists(db: Session, user_id: str, for_date: datetime.date):
    """
    Checks if attendance was already logged for this user on the given date.
    """
    return db.query(models.Attendance).filter(
        models.Attendance.user_id == user_id,
        models.Attendance.date == for_date
    ).first() is not None

def log_attendance(db: Session, user_id: str, status: str = "Present"):
    """
    Logs a new attendance record.
    """
    db_attendance = models.Attendance(
        user_id=user_id,
        status=status,
        timestamp=datetime.datetime.now(),
        date=datetime.date.today()
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

def get_attendance_records(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[datetime.date] = None,
    end_date: Optional[datetime.date] = None,
    user_id: Optional[str] = None,
    search_name: Optional[str] = None
):
    """
    Queries attendance records with flexible filters.
    """
    query = db.query(models.Attendance).join(models.User)
    
    if start_date:
        query = query.filter(models.Attendance.date >= start_date)
    if end_date:
        query = query.filter(models.Attendance.date <= end_date)
    if user_id:
        query = query.filter(models.Attendance.user_id == user_id)
    if search_name:
        query = query.filter(models.User.name.icontains(search_name))
        
    return query.order_by(desc(models.Attendance.timestamp)).offset(skip).limit(limit).all()

# --- ANALYTICS ---

def get_analytics(db: Session) -> dict:
    """
    Retrieves aggregated dashboard statistics.
    """
    today = datetime.date.today()
    
    # 1. Total Registered Users
    total_users = db.query(func.count(models.User.id)).scalar() or 0
    
    # 2. Today's Attendance count
    today_attendance_count = db.query(func.count(models.Attendance.id)).filter(
        models.Attendance.date == today
    ).scalar() or 0
    
    # 3. Attendance Percentage
    today_attendance_percentage = 0.0
    if total_users > 0:
        today_attendance_percentage = round((today_attendance_count / total_users) * 100, 2)
        
    # 4. Daily Trends (last 14 days)
    two_weeks_ago = today - datetime.timedelta(days=14)
    trends_query = db.query(
        models.Attendance.date,
        func.count(models.Attendance.id).label("total_present"),
        func.sum(func.cast(models.Attendance.status == "Late", Integer)).label("total_late")
    ).filter(
        models.Attendance.date >= two_weeks_ago
    ).group_by(
        models.Attendance.date
    ).order_by(
        models.Attendance.date
    ).all()
    
    daily_trends = []
    for row in trends_query:
        daily_trends.append({
            "date": row[0].strftime("%Y-%m-%d") if row[0] else "",
            "total_present": row[1] or 0,
            "total_late": row[2] or 0
        })
        
    # 5. Department Stats (Total users per department)
    dept_query = db.query(
        models.User.department,
        func.count(models.User.id)
    ).group_by(
        models.User.department
    ).all()
    
    department_stats = {}
    for row in dept_query:
        dept_name = row[0] or "Unknown"
        department_stats[dept_name] = row[1]

    return {
        "total_users": total_users,
        "today_attendance_count": today_attendance_count,
        "today_attendance_percentage": today_attendance_percentage,
        "daily_trends": daily_trends,
        "department_stats": department_stats
    }
