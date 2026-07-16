import React, { useState, useEffect } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Users, UserCheck, Percent, RefreshCw } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Analytics = ({ refreshTrigger }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        setError("Failed to fetch analytics statistics.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error loading analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [refreshTrigger]);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', gridColumn: 'span 2' }}>
        <div className="loading-spinner" style={{ width: '36px', height: '36px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ gridColumn: 'span 2', color: '#f43f5e', padding: '16px' }}>
        {error}
      </div>
    );
  }

  if (!data) return null;

  // Chart 1: Doughnut Chart (Today's Attendance Rate)
  const todayPresent = data.today_attendance_count;
  const todayAbsent = Math.max(0, data.total_users - todayPresent);

  const rateChartData = {
    labels: ['Present', 'Absent'],
    datasets: [{
      data: [todayPresent, todayAbsent],
      backgroundColor: ['#10b981', 'rgba(244, 63, 94, 0.2)'],
      borderColor: ['#10b981', '#f43f5e'],
      borderWidth: 1,
    }]
  };

  // Chart 2: Line Chart (Daily Trends over 14 Days)
  const trendLabels = data.daily_trends.map(t => t.date);
  const trendPresent = data.daily_trends.map(t => t.total_present);
  const trendLate = data.daily_trends.map(t => t.total_late);

  const trendChartData = {
    labels: trendLabels.length > 0 ? trendLabels : ['No Data'],
    datasets: [
      {
        label: 'Present',
        data: trendPresent.length > 0 ? trendPresent : [0],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Late',
        data: trendLate.length > 0 ? trendLate : [0],
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.3,
        fill: true,
      }
    ]
  };

  // Chart 3: Bar Chart (Department Breakdown)
  const deptLabels = Object.keys(data.department_stats);
  const deptCounts = Object.values(data.department_stats);

  const deptChartData = {
    labels: deptLabels.length > 0 ? deptLabels : ['None'],
    datasets: [{
      label: 'Registrations',
      data: deptCounts.length > 0 ? deptCounts : [0],
      backgroundColor: 'rgba(139, 92, 246, 0.6)',
      borderColor: '#8b5cf6',
      borderWidth: 1,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#f3f4f6',
          font: { family: 'Outfit, sans-serif' }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9ca3af' }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9ca3af', precision: 0 }
      }
    }
  };

  return (
    <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Stats Cards Row */}
      <div className="stats-grid">
        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title">Total Registered</span>
            <Users size={20} style={{ color: '#8b5cf6' }} />
          </div>
          <span className="stat-val">{data.total_users}</span>
        </div>

        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title">Today Present</span>
            <UserCheck size={20} style={{ color: '#10b981' }} />
          </div>
          <span className="stat-val">{data.today_attendance_count}</span>
        </div>

        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title">Attendance Rate</span>
            <Percent size={20} style={{ color: '#06b6d4' }} />
          </div>
          <span className="stat-val">{data.today_attendance_percentage}%</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Trend Line Chart */}
        <div className="glass-panel" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '16px' }}>Daily Attendance Trends (14 Days)</h3>
          <div style={{ flexGrow: 1, position: 'relative' }}>
            <Line data={trendChartData} options={chartOptions} />
          </div>
        </div>

        {/* Department Bar Chart */}
        <div className="glass-panel" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '16px' }}>Department Breakdown</h3>
          <div style={{ flexGrow: 1, position: 'relative' }}>
            <Bar data={deptChartData} options={chartOptions} />
          </div>
        </div>

        {/* Rate Doughnut Chart */}
        <div className="glass-panel" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '16px' }}>Today's Presence Rate</h3>
          <div style={{ flexGrow: 1, position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <Doughnut 
              data={rateChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: '#f3f4f6',
                      font: { family: 'Outfit, sans-serif' }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Analytics;
