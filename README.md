# AI-Powered Facial Recognition Attendance System

A modern, high-performance, real-time attendance tracking platform built with **FastAPI**, **React.js (Vite)**, and **SQLite**, utilizing state-of-the-art deep learning face detection and recognition.

## 🚀 Key Features
- **Deep Learning CV Stack**: Powered by **YuNet** (ultra-lightweight face detector) and **SFace** (128-dimensional face recognizer CNN), running entirely on CPU.
- **Real-Time Streaming**: Uses persistent **FastAPI WebSockets** for low-latency frame streaming, processing face detection and recognition at 7–10 FPS.
- **Throttled Webcam Feeding**: Throttles frame captures in React to protect backend CPU and compresses canvases to 0.7 quality JPEG.
- **Vector Storage**: Employs serialized NumPy float32 encodings stored in a local SQLite database, calculating Cosine Similarity/Euclidean distance in real-time.
- **Premium Glassmorphic UI**: Beautiful dark-mode dashboard styled with custom Vanilla CSS variables, containing interactive charts (Chart.js) and real-time logs.
- **Report Exports**: One-click client-side CSV download filterable by student name or date range.

---

## 🛠️ Tech Stack
- **Backend**: FastAPI, Uvicorn, WebSockets, SQLAlchemy, SQLite, OpenCV, NumPy, Pydantic.
- **Frontend**: React.js, Vite, Chart.js, Lucide Icons, Vanilla CSS.

---

## 📂 Project Structure
```
facial_recognition_attendance/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI server with WebSocket handlers
│   │   ├── database.py      # SQLite connection & session
│   │   ├── models.py        # SQLAlchemy models (User, Attendance)
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── recognition.py   # YuNet & SFace wrappers + distance calculations
│   │   └── crud.py          # Database operations
│   ├── models/              # Store YuNet and SFace ONNX models
│   ├── data/                # SQLite DB and registration photos
│   ├── requirements.txt     # Python backend dependencies
│   ├── download_models.py   # Model downloader helper
│   └── run.py               # Launcher script
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── CameraFeed.jsx     # Live WebSocket camera stream and canvas overlay
    │   │   ├── RegisterForm.jsx   # User details registration Form
    │   │   ├── Analytics.jsx      # Chart.js reports
    │   │   └── AttendanceLogs.jsx # History log filtering & CSV download
    │   ├── App.jsx          # Main tabs router
    │   ├── main.jsx
    │   └── index.css        # Premium custom CSS (Dark Glassmorphism)
    ├── package.json
    └── vite.config.js
```

---

## 💻 Setup & Run Instructions

### Prerequisites
- Python 3.9+
- Node.js v18+

### Step 1: Run Backend
1. Open a terminal and navigate to the backend:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: If you run into compiler issues on greenlet, use `pip install greenlet --only-binary :all:` first)*
3. Run the model downloader to fetch ONNX files:
   ```bash
   python download_models.py
   ```
4. Start the FastAPI backend:
   ```bash
   python run.py
   ```
   *The server starts on http://127.0.0.1:8000. API docs can be viewed at http://127.0.0.1:8000/docs.*

### Step 2: Run Frontend
1. Open a new terminal and navigate to the frontend:
   ```bash
   cd frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend starts on http://127.0.0.1:3000.*

### Step 3 (Optional): Bulk Import a Pre-Existing Dataset
If you have a folder containing face images (from Kaggle, LFW, or custom photos) and want to load them into the database in bulk:
1. Name your files in the format `ID_Name.jpg` (e.g. `EMP101_John_Doe.jpg` or `STU204_Sarah_Connor.png`).
2. Run the bulk import script from the backend directory:
   ```bash
   python bulk_import.py <path_to_dataset_directory>
   ```

---

## 🎯 Verification and Usage
- Navigate to `http://127.0.0.1:3000` in your web browser.
- Select the **Register Profile** tab to add a user. You can snap a picture with your webcam or upload an image.
- Go to the **Live Feed** tab, click **Start Camera**, and the system will instantly frame your face and mark your attendance once per day.
- View real-time check-in counts and analytics trends in the **Analytics** tab, and filter/export CSVs in the **Logs History** tab.
