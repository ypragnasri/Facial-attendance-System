import React, { useState, useEffect } from 'react';
import { Search, Calendar, Download, RefreshCw, User } from 'lucide-react';

const AttendanceLogs = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = [];
      if (searchName) queryParams.push(`name=${encodeURIComponent(searchName)}`);
      if (startDate) queryParams.push(`start_date=${startDate}`);
      if (endDate) queryParams.push(`end_date=${endDate}`);
      
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const response = await fetch(`/api/attendance${queryString}`);
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      } else {
        setError("Failed to retrieve attendance logs.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Backend server may be offline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [searchName, startDate, endDate, refreshTrigger]);

  // Download logs as CSV
  const handleDownloadCSV = () => {
    if (logs.length === 0) return;

    // Build CSV content
    const headers = ["Log ID", "User ID", "Name", "Role", "Department", "Timestamp", "Date", "Status"];
    const rows = logs.map(log => [
      log.id,
      log.user_id,
      log.user.name,
      log.user.role,
      log.user.department,
      new Date(log.timestamp).toLocaleString(),
      log.date,
      log.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    // Create download element
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} style={{ color: '#06b6d4' }} />
          Attendance Records
        </h2>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchLogs} className="btn-outline" style={{ padding: '8px 12px', fontSize: '13px' }} title="Refresh logs">
            <RefreshCw size={14} className={loading ? "loading-spinner" : ""} />
          </button>
          
          <button 
            onClick={handleDownloadCSV} 
            disabled={logs.length === 0}
            className="btn-primary" 
            style={{ width: 'auto', padding: '8px 16px', fontSize: '13px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by name..." 
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>From:</label>
          <input 
            type="date" 
            className="form-input" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '8px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>To:</label>
          <input 
            type="date" 
            className="form-input" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '8px' }}
          />
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Table Section */}
      <div className="data-table-container">
        {loading && logs.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="loading-spinner" style={{ width: '36px', height: '36px' }} />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            No attendance records found matching filters.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>User ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Check-In Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    {log.user.photo_path ? (
                      <img src={log.user.photo_path} alt={log.user.name} className="log-avatar" style={{ width: '32px', height: '32px' }} />
                    ) : (
                      <div className="log-avatar" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                        <User size={16} />
                      </div>
                    )}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{log.user_id}</td>
                  <td style={{ fontWeight: '600' }}>{log.user.name}</td>
                  <td>{log.user.role}</td>
                  <td>{log.user.department}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>
                    <span className="badge-present" style={{ 
                      backgroundColor: log.status === 'Late' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: log.status === 'Late' ? '#eab308' : '#10b981'
                    }}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AttendanceLogs;
