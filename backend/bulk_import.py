import os
import sys
import cv2
import numpy as np
from sqlalchemy.orm import Session

# Add backend root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import models, schemas, crud, database
from app.recognition import get_face_engine

def bulk_import_faces(dataset_dir: str):
    """
    Scans a directory of images and imports them into the system.
    Expects filenames in the format: ID_Name.jpg (e.g., EMP101_John_Doe.jpg or 401_Jane_Smith.png)
    """
    if not os.path.exists(dataset_dir):
        print(f"Error: Directory '{dataset_dir}' does not exist.")
        return

    db = database.SessionLocal()
    engine = get_face_engine()
    
    # Target directory for photos served by API
    photos_dir = os.path.join(os.path.dirname(__file__), "data", "photos")
    os.makedirs(photos_dir, exist_ok=True)

    print(f"Scanning directory: {dataset_dir} for face images...")
    imported_count = 0
    failed_count = 0

    valid_extensions = (".jpg", ".jpeg", ".png")
    for filename in os.listdir(dataset_dir):
        if not filename.lower().endswith(valid_extensions):
            continue
            
        file_path = os.path.join(dataset_dir, filename)
        base_name, _ = os.path.splitext(filename)
        
        # Parse ID and Name (split on first underscore)
        if "_" in base_name:
            user_id, name = base_name.split("_", 1)
            # Clean up underscores in name
            name = name.replace("_", " ").title()
        else:
            # Fallback if no underscore: use filename as name and hash as ID
            user_id = f"USER_{hash(base_name) % 100000}"
            name = base_name.replace("-", " ").title()
            
        print(f"Processing image for User ID: {user_id}, Name: {name}...")
        
        # Check if user already exists
        db_user = crud.get_user_by_id(db, user_id=user_id)
        if db_user:
            print(f" - Skip: User {user_id} already registered.")
            continue

        # Load image
        img = cv2.imread(file_path)
        if img is None:
            print(f" - Error: Could not read image at {file_path}")
            failed_count += 1
            continue

        # Detect face & extract encoding
        try:
            faces = engine.detect_faces(img)
            if len(faces) == 0:
                print(f" - Warning: No face detected in {filename}. Skipping.")
                failed_count += 1
                continue
            if len(faces) > 1:
                print(f" - Warning: Multiple faces detected in {filename}. Please use single face images. Skipping.")
                failed_count += 1
                continue
                
            encoding = engine.get_encoding(img, faces[0])
            
            # Save reference photo
            photo_filename = f"{user_id}.jpg"
            dest_photo_path = os.path.join(photos_dir, photo_filename)
            cv2.imwrite(dest_photo_path, img)
            photo_url_path = f"/static/photos/{photo_filename}"
            
            # Save to Database
            user_schema = schemas.UserCreate(
                id=user_id,
                name=name,
                role="Student" if user_id.startswith(("STU", "stu")) else "Employee",
                department="Engineering"
            )
            encoding_bytes = encoding.astype(np.float32).tobytes()
            crud.create_user(db, user=user_schema, face_encoding=encoding_bytes, photo_path=photo_url_path)
            
            print(f" - Success: Registered {name}.")
            imported_count += 1
            
        except Exception as e:
            print(f" - Error processing {filename}: {e}")
            failed_count += 1

    db.close()
    print(f"\nBulk Import completed successfully! Imported: {imported_count}, Failed: {failed_count}.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python bulk_import.py <path_to_dataset_directory>")
        print("Example: python bulk_import.py C:/Users/varunsai/Downloads/lfw_crop")
    else:
        bulk_import_faces(sys.argv[1])
