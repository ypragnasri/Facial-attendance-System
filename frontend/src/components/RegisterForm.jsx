import React, { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle, AlertTriangle, UserCheck } from 'lucide-react';

const RegisterForm = ({ onUserRegistered }) => {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Student');
  const [department, setDepartment] = useState('Engineering');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  // Webcam capturing state
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' }); // type: success, error, ''

  // Start webcam for photo capture
  const startCaptureWebcam = async () => {
    try {
      setStatus({ type: '', message: '' });
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error starting snapshot webcam:", err);
      setIsCapturing(false);
      setStatus({ type: 'error', message: 'Could not access webcam for snapshot.' });
    }
  };

  // Stop snapshot webcam
  const stopCaptureWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  // Capture Snapshot
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Create temporary canvas to crop snapshot
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], "snapshot.jpg", { type: "image/jpeg" });
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(blob));
      stopCaptureWebcam();
    }, 'image/jpeg', 0.95);
  };

  // Handle local file upload selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setStatus({ type: '', message: '' });
    }
  };

  // Reset form
  const handleReset = () => {
    setUserId('');
    setName('');
    setRole('Student');
    setDepartment('Engineering');
    setPhotoFile(null);
    setPhotoPreview(null);
    stopCaptureWebcam();
    setStatus({ type: '', message: '' });
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId.trim() || !name.trim()) {
      setStatus({ type: 'error', message: 'Please fill out all personal details.' });
      return;
    }
    if (!photoFile) {
      setStatus({ type: 'error', message: 'Please capture or upload a baseline face image.' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    const formData = new FormData();
    formData.append('id', userId.trim());
    formData.append('name', name.trim());
    formData.append('role', role);
    formData.append('department', department);
    formData.append('photo', photoFile);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: `Successfully registered ${data.name} (ID: ${data.id})!` });
        // Callback to reload backend WS cache and update dashboards
        onUserRegistered();
        // Reset form
        setTimeout(() => {
          handleReset();
        }, 1500);
      } else {
        setStatus({ type: 'error', message: data.detail || 'Registration failed.' });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Network error occurred. Ensure backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel">
      <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <UserCheck size={20} style={{ color: '#8b5cf6' }} />
        Register Profile
      </h2>

      {status.message && (
        <div style={{
          backgroundColor: status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
          color: status.type === 'success' ? '#10b981' : '#f43f5e',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {status.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="userId">Employee / Student ID</label>
          <input 
            id="userId"
            type="text" 
            className="form-input" 
            placeholder="e.g. EMP102, STU405" 
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input 
            id="name"
            type="text" 
            className="form-input" 
            placeholder="e.g. John Doe" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select 
              id="role"
              className="form-select" 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
            >
              <option value="Student">Student</option>
              <option value="Employee">Employee</option>
              <option value="Visitor">Visitor</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="department">Department</label>
            <select 
              id="department"
              className="form-select" 
              value={department} 
              onChange={(e) => setDepartment(e.target.value)}
              disabled={loading}
            >
              <option value="Engineering">Engineering</option>
              <option value="Design">Design</option>
              <option value="HR">HR</option>
              <option value="Marketing">Marketing</option>
              <option value="Operations">Operations</option>
            </select>
          </div>
        </div>

        {/* Capture Snapshot or Upload */}
        <div className="form-group">
          <label>Baseline Face Reference</label>
          
          {isCapturing ? (
            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000' }}>
              <video 
                ref={videoRef} 
                style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} 
                playsInline 
                muted 
              />
              <div style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button type="button" onClick={captureSnapshot} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}>
                  Capture Snapshot
                </button>
                <button type="button" onClick={stopCaptureWebcam} className="btn-outline" style={{ background: 'rgba(0,0,0,0.5)', padding: '8px 16px', fontSize: '13px' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="capture-box" 
              onClick={() => document.getElementById('file-upload').click()}
            >
              {photoPreview ? (
                <>
                  <img src={photoPreview} alt="Face preview" className="capture-preview" />
                  <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); startCaptureWebcam(); }} 
                      className="btn-outline" 
                      style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(17, 24, 39, 0.8)' }}
                    >
                      <Camera size={14} /> Retake
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); startCaptureWebcam(); }} 
                      className="btn-outline"
                    >
                      <Camera size={16} /> Capture Web Camera
                    </button>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>or click here to upload photo file</span>
                </div>
              )}
              <input 
                id="file-upload" 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || isCapturing}
          >
            {loading ? (
              <>
                <div className="loading-spinner" /> Processing Neural Encodings...
              </>
            ) : (
              <>
                Register & Save
              </>
            )}
          </button>
          
          <button 
            type="button" 
            className="btn-outline" 
            onClick={handleReset}
            disabled={loading || isCapturing}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;
