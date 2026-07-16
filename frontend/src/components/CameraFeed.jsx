import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle, RefreshCw } from 'lucide-react';

const CameraFeed = ({ onAttendanceMarked, refreshLogTrigger }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [activeFaces, setActiveFaces] = useState([]);
  const [latestMarked, setLatestMarked] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [errorMessage, setErrorMessage] = useState(null);

  // Start webcam
  const startCamera = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setErrorMessage("Could not access webcam. Please ensure camera permissions are granted.");
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
      setActiveFaces([]);
    }
  };

  // Initialize WebSocket Connection
  const connectWebSocket = () => {
    setConnectionStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/recognize`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.results) {
          setActiveFaces(data.results);
          
          // Check if anyone was marked present
          const marked = data.results.find(face => face.attendance_marked === true);
          if (marked) {
            setLatestMarked(marked);
            onAttendanceMarked(marked); // callback to parent
            // Hide notification after 3 seconds
            setTimeout(() => {
              setLatestMarked(null);
            }, 3000);
          }
        }
      } catch (err) {
        console.error("Error parsing WS message:", err);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      console.log("WebSocket disconnected");
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setConnectionStatus('disconnected');
    };
  };

  // Connect WS on mount
  useEffect(() => {
    connectWebSocket();
    startCamera();

    return () => {
      stopCamera();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Trigger cache reload when parent signals a new registration
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: 'reload_cache' }));
    }
  }, [refreshLogTrigger]);

  // Frame Capture & WebSocket Sender Loop
  useEffect(() => {
    let intervalId = null;

    if (streamActive && connectionStatus === 'connected') {
      const sendFrame = () => {
        if (!videoRef.current || !canvasRef.current || !wsRef.current) return;
        if (wsRef.current.readyState !== WebSocket.OPEN) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Capture current video frame onto processing canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Compress to medium quality JPEG (0.7) to reduce payload size
        const jpegData = canvas.toDataURL('image/jpeg', 0.7);
        
        // Send base64 payload
        wsRef.current.send(JSON.stringify({ image: jpegData }));
      };

      // Throttle frames to one every 120ms (~8 FPS) to protect CPU and reduce network latency
      intervalId = setInterval(sendFrame, 120);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [streamActive, connectionStatus]);

  // Canvas Overlay Drawing Loop (bounding boxes, names, custom style UI)
  useEffect(() => {
    let animationFrameId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const drawOverlay = () => {
      if (!streamActive) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '16px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Camera Inactive. Press "Start Camera" to enable.', canvas.width / 2, canvas.height / 2);
        return;
      }

      // Draw the video frame
      if (videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      }

      // Draw Bounding Boxes and labels
      activeFaces.forEach(face => {
        const [x, y, w, h] = face.bbox;
        const isRecognized = face.status === 'recognized';
        
        // Determine border style based on recognition status
        let borderColor = '#f43f5e'; // Unknown (red)
        let glowColor = 'rgba(244, 63, 94, 0.2)';
        let displayName = 'Unknown';
        
        if (isRecognized) {
          borderColor = face.already_logged ? '#8b5cf6' : '#10b981'; // Purple if already logged, Emerald if just logged
          glowColor = face.already_logged ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)';
          displayName = face.name;
        }

        // Draw bounding box glow
        ctx.shadowColor = borderColor;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3;
        
        // Rounded corner drawing
        const r = 8; // corner radius
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.stroke();
        
        // Reset shadow for text drawing
        ctx.shadowBlur = 0;

        // Draw Label Background
        ctx.fillStyle = borderColor;
        ctx.beginPath();
        ctx.roundRect(x, y - 30, Math.max(120, w * 0.7), 24, 4);
        ctx.fill();

        // Draw Label Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Outfit, sans-serif';
        ctx.textAlign = 'left';
        
        let labelText = displayName;
        if (isRecognized) {
          labelText += face.already_logged ? " (Logged)" : " (Present)";
        }
        ctx.fillText(labelText, x + 8, y - 14);
      });

      animationFrameId = requestAnimationFrame(drawOverlay);
    };

    drawOverlay();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [streamActive, activeFaces]);

  return (
    <div className="glass-panel camera-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={20} className={streamActive ? "text-cyan" : "text-muted"} style={{ color: streamActive ? '#06b6d4' : '#9ca3af' }} />
          Live Recognition Feed
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* WS Status Badge */}
          <span style={{ 
            fontSize: '11px', 
            fontWeight: '600', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            color: connectionStatus === 'connected' ? '#10b981' : connectionStatus === 'connecting' ? '#eab308' : '#f43f5e'
          }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: connectionStatus === 'connected' ? '#10b981' : connectionStatus === 'connecting' ? '#eab308' : '#f43f5e',
              display: 'inline-block'
            }} />
            {connectionStatus === 'connected' ? 'WS Connected' : connectionStatus === 'connecting' ? 'WS Connecting' : 'WS Offline'}
          </span>

          <button 
            onClick={connectionStatus === 'disconnected' ? connectWebSocket : null}
            disabled={connectionStatus !== 'disconnected'}
            className="btn-outline"
            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={12} /> Reconnect
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          {errorMessage}
        </div>
      )}

      <div className="video-container">
        {/* Hidden video element that sources the camera stream */}
        <video 
          ref={videoRef} 
          className="webcam-feed" 
          style={{ display: 'none' }} 
          playsInline 
          muted 
        />
        
        {/* Interactive canvas that renders the camera frames + neural net overlays */}
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={480} 
          className="overlay-canvas" 
        />

        {/* Scan line effect for premium aesthetic */}
        {streamActive && <div className="scan-line" />}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        {streamActive ? (
          <button onClick={stopCamera} className="btn-primary" style={{ background: '#f43f5e', boxShadow: '0 4px 14px rgba(244, 63, 94, 0.2)' }}>
            <CameraOff size={16} /> Stop Camera
          </button>
        ) : (
          <button onClick={startCamera} className="btn-primary">
            <Camera size={16} /> Start Camera
          </button>
        )}
      </div>

      {/* Real-time Recognition Banner Toast Popup */}
      {latestMarked && (
        <div className="alert-popup">
          <CheckCircle size={24} style={{ color: '#10b981' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Attendance Marked!</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
              Welcome back, <strong>{latestMarked.name}</strong> ({latestMarked.role})
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraFeed;
