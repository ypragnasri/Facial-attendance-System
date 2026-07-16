import os
import cv2
import numpy as np

# Paths to the model files
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

YUNET_MODEL_PATH = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")
SFACE_MODEL_PATH = os.path.join(MODELS_DIR, "face_recognition_sface_2021dec.onnx")

class FaceEngine:
    def __init__(self):
        # Verify model paths exist
        if not os.path.exists(YUNET_MODEL_PATH) or not os.path.exists(SFACE_MODEL_PATH):
            raise FileNotFoundError(
                "YuNet or SFace models not found. Please run the model downloader first."
            )

        # Initialize YuNet Detector
        # We start with a dummy size of 320x320 and update it dynamically on each image
        self.detector = cv2.FaceDetectorYN.create(
            model=YUNET_MODEL_PATH,
            config="",
            input_size=(320, 320),
            score_threshold=0.6,
            nms_threshold=0.3,
            top_k=5000
        )

        # Initialize SFace Recognizer
        self.recognizer = cv2.FaceRecognizerSF.create(
            model=SFACE_MODEL_PATH,
            config=""
        )

    def detect_faces(self, frame: np.ndarray):
        """
        Detects faces in a frame and returns bounding boxes and keypoints.
        """
        h, w = frame.shape[:2]
        self.detector.setInputSize((w, h))
        retval, faces = self.detector.detect(frame)
        if retval and faces is not None:
            return faces
        return []

    def get_encoding(self, frame: np.ndarray, face_features) -> np.ndarray:
        """
        Aligns the face and extracts a 128-dimensional embedding as a float32 array.
        """
        # Align the face using SFace recognizer alignCrop
        aligned_face = self.recognizer.alignCrop(frame, face_features)
        # Extract features
        feat = self.recognizer.feature(aligned_face)
        # Reshape to a simple 1D array of 128 floats and cast explicitly to float32
        return feat.flatten().astype(np.float32)

    def compare_faces(self, encoding1: np.ndarray, encoding2: np.ndarray) -> bool:
        """
        Compares two face encodings using cosine similarity (or L2 norm if preferred).
        SFace Cosine similarity threshold is >= 0.36 for matching.
        """
        # Built-in SFace match calculates similarity/distance
        # Reshape encodings back to 2D (1, 128) as required by SFace match function
        e1 = encoding1.reshape(1, -1)
        e2 = encoding2.reshape(1, -1)
        similarity = self.recognizer.match(e1, e2, cv2.FaceRecognizerSF_FR_COSINE)
        return similarity >= 0.36

    def find_best_match(self, query_encoding: np.ndarray, registered_users) -> tuple:
        """
        Compares query encoding against all registered users.
        Returns (matched_user_id, confidence_score) or (None, 0.0) if no match matches the threshold.
        """
        if not registered_users:
            return None, 0.0

        best_user_id = None
        best_similarity = -1.0

        # Run vectorized matching or loop match
        for user in registered_users:
            # Reconstruct the stored float32 encoding from database BLOB bytes
            stored_encoding = np.frombuffer(user.face_encoding, dtype=np.float32)
            
            # Compute cosine similarity using OpenCV or NumPy
            dot_product = np.dot(query_encoding, stored_encoding)
            norm_q = np.linalg.norm(query_encoding)
            norm_s = np.linalg.norm(stored_encoding)
            similarity = dot_product / (norm_q * norm_s) if (norm_q > 0 and norm_s > 0) else 0.0
            
            # OpenCV SFace Cosine threshold recommendation is >= 0.36
            if similarity >= 0.36 and similarity > best_similarity:
                best_similarity = similarity
                best_user_id = user.id

        return best_user_id, float(best_similarity)

# Singleton face engine
face_engine = None

def get_face_engine():
    global face_engine
    if face_engine is None:
        face_engine = FaceEngine()
    return face_engine
