import os
import cv2
import json
import base64
import numpy as np
from datetime import date
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import models, schemas, crud, database
from .recognition import get_face_engine

# Initialize database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Facial Recognition Attendance API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Photo directory for visual reference
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS_DIR = os.path.join(BASE_DIR, "data", "photos")
os.makedirs(PHOTOS_DIR, exist_ok=True)

# Mount photos directory to serve reference photos
app.mount("/static/photos", StaticFiles(directory=PHOTOS_DIR), name="photos")

# --- REST ENDPOINTS ---

@app.post("/api/register", response_model=schemas.UserResponse)
def register_user(
    id: str = Form(...),
    name: str = Form(...),
    role: Optional[str] = Form("Student"),
    department: Optional[str] = Form("Engineering"),
    photo: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    # 1. Check if user already exists
    db_user = crud.get_user_by_id(db, user_id=id)
    if db_user:
        raise HTTPException(status_code=400, detail="User ID already registered")
        
    # 2. Read and decode the uploaded image file
    try:
        photo_bytes = photo.file.read()
        nparr = np.frombuffer(photo_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file format")
        
    # 3. Detect faces and extract encoding
    try:
        engine = get_face_engine()
        faces = engine.detect_faces(img)
        
        if len(faces) == 0:
            raise HTTPException(status_code=400, detail="No face detected in the photo. Please submit a clear face image.")
        if len(faces) > 1:
            raise HTTPException(status_code=400, detail="Multiple faces detected. Please upload an image with exactly one face.")
            
        # Extract 128D embedding
        encoding = engine.get_encoding(img, faces[0])
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to process facial features: {str(e)}")
        
    # 4. Save image file locally
    photo_filename = f"{id}.jpg"
    photo_path = os.path.join(PHOTOS_DIR, photo_filename)
    cv2.imwrite(photo_path, img)
    photo_url_path = f"/static/photos/{photo_filename}"
    
    # 5. Save user profile to database (cast to float32 and serialize to bytes)
    user_schema = schemas.UserCreate(id=id, name=name, role=role, department=department)
    encoding_bytes = encoding.astype(np.float32).tobytes()
    
    new_user = crud.create_user(db, user=user_schema, face_encoding=encoding_bytes, photo_path=photo_url_path)
    return new_user

@app.get("/api/users", response_model=List[schemas.UserResponse])
def read_users(db: Session = Depends(database.get_db)):
    return crud.get_users(db)

@app.get("/api/attendance", response_model=List[schemas.AttendanceResponse])
def get_attendance(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None,
    name: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    s_date = date.fromisoformat(start_date) if start_date else None
    e_date = date.fromisoformat(end_date) if end_date else None
    return crud.get_attendance_records(
        db, start_date=s_date, end_date=e_date, user_id=user_id, search_name=name
    )

@app.get("/api/analytics", response_model=schemas.AnalyticsResponse)
def get_analytics(db: Session = Depends(database.get_db)):
    analytics_data = crud.get_analytics(db)
    return analytics_data


# --- WEBSOCKET REAL-TIME MATCHING & LOGGING ---

@app.websocket("/api/ws/recognize")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Establish local database session inside connection scope
    db = database.SessionLocal()
    engine = get_face_engine()
    
    # Cache user encodings on connection start to avoid per-frame DB queries
    users_cache = db.query(models.User).all()
    
    # Maintain user dictionary for O(1) details lookup after match
    users_dict = {user.id: user for user in users_cache}
    
    try:
        while True:
            # Expect client to stream JSON strings
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            # Check for encoding update command (if a user is registered, frontend signals to reload cache)
            if payload.get("command") == "reload_cache":
                users_cache = db.query(models.User).all()
                users_dict = {user.id: user for user in users_cache}
                await websocket.send_json({"status": "cache_reloaded"})
                continue
                
            image_data_uri = payload.get("image")
            if not image_data_uri:
                await websocket.send_json({"error": "No image payload"})
                continue
                
            # Decode base64 frame
            try:
                if "," in image_data_uri:
                    header, encoded = image_data_uri.split(",", 1)
                else:
                    encoded = image_data_uri
                image_bytes = base64.b64decode(encoded)
                nparr = np.frombuffer(image_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if frame is None:
                    continue
            except Exception:
                await websocket.send_json({"error": "Failed to decode base64 image"})
                continue
                
            # 1. Detect faces in frame
            faces = engine.detect_faces(frame)
            
            response_results = []
            
            # 2. Extract and match encoding for each face
            for face in faces:
                # bounding box is faces[0:4]: [x, y, w, h]
                bbox = [int(val) for val in face[0:4]]
                x, y, w, h = bbox
                
                try:
                    encoding = engine.get_encoding(frame, face)
                    matched_user_id, confidence = engine.find_best_match(encoding, users_cache)
                    
                    if matched_user_id:
                        user = users_dict[matched_user_id]
                        
                        # 3. Handle Attendance Logging (Strictly once per day)
                        today_date = date.today()
                        attendance_marked = False
                        
                        # Check duplicate logic
                        already_logged = crud.check_attendance_exists(db, matched_user_id, today_date)
                        if not already_logged:
                            crud.log_attendance(db, user_id=matched_user_id, status="Present")
                            attendance_marked = True
                            
                        response_results.append({
                            "status": "recognized",
                            "user_id": user.id,
                            "name": user.name,
                            "role": user.role,
                            "department": user.department,
                            "bbox": bbox,
                            "confidence": confidence,
                            "attendance_marked": attendance_marked,
                            "already_logged": already_logged
                        })
                    else:
                        response_results.append({
                            "status": "unknown",
                            "bbox": bbox
                        })
                except Exception as e:
                    # Silent log to avoid breaking loop on crop errors
                    response_results.append({
                        "status": "error",
                        "bbox": bbox,
                        "message": str(e)
                    })
                    
            # Send results back to frontend client
            await websocket.send_json({
                "results": response_results
            })
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        db.close()
