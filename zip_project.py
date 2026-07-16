import os
import zipfile

def zip_project(src_dir, dest_zip_path):
    exclude_folders = {'node_modules', 'models', 'data', '__pycache__', '.git', '.vite'}
    exclude_files = {'attendance.db', 'facial_recognition_attendance.zip'}

    with zipfile.ZipFile(dest_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(src_dir):
            # Modify dirs in-place to prevent os.walk from recursing into excluded folders
            dirs[:] = [d for d in dirs if d not in exclude_folders]
            
            for file in files:
                if file in exclude_files or file.endswith('.pyc') or file.endswith('.zip'):
                    continue
                file_path = os.path.join(root, file)
                # Compute relative path for zip matching
                arcname = os.path.relpath(file_path, src_dir)
                zipf.write(file_path, arcname)

if __name__ == "__main__":
    src = "C:/Users/varunsai/.gemini/antigravity/scratch/facial_recognition_attendance"
    dest = "C:/Users/varunsai/.gemini/antigravity/brain/3f409691-7aed-4f02-b37f-61f42aa4ba34/facial_recognition_attendance.zip"
    print(f"Creating clean zip archive of {src}...")
    zip_project(src, dest)
    print(f"Zip created successfully at {dest}!")
