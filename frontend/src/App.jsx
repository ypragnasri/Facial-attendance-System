import React, { useState } from 'react';
import { Camera, UserCheck, Calendar, BarChart2, ShieldAlert } from 'lucide-react';
import CameraFeed from './components/CameraFeed';
import RegisterForm from './components/RegisterForm';
import AttendanceLogs from './components/AttendanceLogs';
import Analytics from './components/Analytics';

function App() {
  const [activeTab, setActiveTab] = useState('live');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [recentMarks, setRecentMarks] = useState([]);

  // Increment trigger to signal caching reload and dashboard queries updates
  const handleUserRegistered = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Add recognized users to a sidebar list on the dashboard
  const handleAttendanceMarked = (markedUser) => {
    setRecentMarks(prev => [
      {
        id: Date.now(),
        user_id: markedUser.user_id,
        name: markedUser.name,
        role: markedUser.role,
        department: markedUser.department,
        time: new Date().toLocaleTimeString()
      },
      ...prev.slice(0, 15) // Keep last 15 checkins
    ]);
    setRefreshTrigger(prev => prev + 1); // refresh analytics & logs
  };

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header className="header">
        <div className="logo">
          <ShieldAlert size={28} style={{ color: '#06b6d4' }} />
          <span>AI Attendance Control</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="tabs-list">
          <button 
            className={`tab-trigger ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            <Camera size={16} /> Live Feed
          </button>
          
          <button 
            className={`tab-trigger ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            <UserCheck size={16} /> Register Profile
          </button>
          
          <button 
            className={`tab-trigger ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <Calendar size={16} /> Logs History
          </button>

          <button 
            className={`tab-trigger ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart2 size={16} /> Analytics
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main>
        {activeTab === 'live' && (
          <div className="dashboard-grid">
            {/* Live Camera Feed */}
            <CameraFeed 
              onAttendanceMarked={handleAttendanceMarked}
              refreshLogTrigger={refreshTrigger}
            />

            {/* Sidebar Recent Activity Panel */}
            <div className="glass-panel" style={{ display: 'flex', flexText: 'column', flexDirection: 'column', height: 'fit-content' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={18} style={{ color: '#10b981' }} />
                Real-Time Check-Ins
              </h2>

              <div className="log-list">
                {recentMarks.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: '14px' }}>
                    Awaiting face recognition check-ins...
                  </div>
                ) : (
                  recentMarks.map((mark) => (
                    <div key={mark.id} className="log-item">
                      <div className="log-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', fontWeight: 'bold', fontSize: '14px' }}>
                        {mark.name.charAt(0)}
                      </div>
                      <div className="log-details">
                        <div className="log-name">{mark.name}</div>
                        <div className="log-meta">{mark.role} • {mark.department}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge-present">Logged</span>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{mark.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'register' && (
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <RegisterForm onUserRegistered={handleUserRegistered} />
          </div>
        )}

        {activeTab === 'logs' && (
          <AttendanceLogs refreshTrigger={refreshTrigger} />
        )}

        {activeTab === 'analytics' && (
          <Analytics refreshTrigger={refreshTrigger} />
        )}
      </main>
    </div>
  );
}

export default App;
