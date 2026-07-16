# PowerShell Project Health Check Script
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Facial Recognition Attendance System Check  " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$root = $PSScriptRoot
$errors = 0

# 1. Directory Structure Checks
Write-Host "`n[1/4] Checking Folder Structure..." -ForegroundColor Yellow
$directories = @(
    "backend",
    "backend/app",
    "backend/models",
    "backend/data",
    "frontend",
    "frontend/src",
    "frontend/src/components"
)

foreach ($dir in $directories) {
    $path = Join-Path $root $dir
    if (Test-Path $path) {
        Write-Host "  [OK] Folder exists: $dir" -ForegroundColor Green
    } else {
        Write-Error "  [ERROR] Folder missing: $dir"
        $errors++
    }
}

# 2. Deep Learning Model File Checks
Write-Host "`n[2/4] Checking ONNX Deep Learning Models..." -ForegroundColor Yellow
$models = @(
    "backend/models/face_detection_yunet_2023mar.onnx",
    "backend/models/face_recognition_sface_2021dec.onnx"
)

foreach ($model in $models) {
    $path = Join-Path $root $model
    if (Test-Path $path) {
        $size = (Get-Item $path).Length
        Write-Host "  [OK] Model exists: $model ($($size / 1MB) MB)" -ForegroundColor Green
    } else {
        Write-Error "  [ERROR] Model file missing: $model. Run 'python download_models.py' inside backend."
        $errors++
    }
}

# 3. Python Backend Environment Checks
Write-Host "`n[3/4] Testing Python backend compilation & packages..." -ForegroundColor Yellow
try {
    # Check package imports
    $backendDir = Join-Path $root "backend"
    $testCmd = "import sys; sys.path.append(r'$backendDir'); import fastapi, uvicorn, websockets, cv2, numpy, sqlalchemy; from app.recognition import get_face_engine; get_face_engine(); print('OK')"
    $out = python -c $testCmd 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Python dependencies and Face Engine loaded successfully." -ForegroundColor Green
    } else {
        Write-Error "  [ERROR] Python package check failed: $out"
        $errors++
    }
} catch {
    Write-Error "  [ERROR] Python environment test encountered critical failure."
    $errors++
}

# 4. Frontend Production Build Check
Write-Host "`n[4/4] Verifying Frontend Compilation..." -ForegroundColor Yellow
try {
    $frontendDir = Join-Path $root "frontend"
    # Temporarily add Node to path if not there
    $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
    $buildOut = cmd /c "cd $frontendDir && npm run build" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Vite React frontend compiled successfully." -ForegroundColor Green
    } else {
        Write-Error "  [ERROR] Vite React build failed: $buildOut"
        $errors++
    }
} catch {
    Write-Error "  [ERROR] Frontend build test encountered critical failure."
    $errors++
}

# Summary
Write-Host "`n=============================================" -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "  STATUS: ALL CHECKS PASSED SUCCESSFULLY!  " -ForegroundColor Black -BackgroundColor Green
} else {
    Write-Host "  STATUS: FAILED ($errors Errors Found)    " -ForegroundColor White -BackgroundColor Red
}
Write-Host "=============================================" -ForegroundColor Cyan
