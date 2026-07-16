import os
import urllib.request

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SFACE_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"

def download_file(url, dest_path):
    print(f"Downloading {url} to {dest_path}...")
    try:
        urllib.request.urlretrieve(url, dest_path)
        print("Download complete.")
    except Exception as e:
        print(f"Failed to download from {url}. Error: {e}")
        # Try master branch raw fallback if main fails
        alt_url = url.replace("/raw/main/", "/raw/master/")
        print(f"Trying alternative URL: {alt_url}")
        try:
            urllib.request.urlretrieve(alt_url, dest_path)
            print("Download complete (alternative URL).")
        except Exception as e2:
            print(f"Alternative download failed: {e2}")
            raise e2

def main():
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    yunet_path = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")
    sface_path = os.path.join(MODELS_DIR, "face_recognition_sface_2021dec.onnx")
    
    if not os.path.exists(yunet_path):
        download_file(YUNET_URL, yunet_path)
    else:
        print("YuNet model already exists.")
        
    if not os.path.exists(sface_path):
        download_file(SFACE_URL, sface_path)
    else:
        print("SFace model already exists.")

if __name__ == "__main__":
    main()
