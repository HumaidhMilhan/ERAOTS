import { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

export default function AnalyticsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetching all recent records to aggregate
      const res = await attendanceAPI.list();
      processMetrics(res.data);
    } catch (err) {
      console.error("Failed to load analytics", err);
    } finally {
      setLoading(false);
    }
  };

  const processMetrics = (records) => {
    // 1. Group records by Date
    const groupedData = {};
    records.forEach(rec => {
      const date = rec.date;
      if (!groupedData[date]) {
        groupedData[date] = { date, totalWorkers: 0, lateArrivals: 0, overtimeCount: 0 };
      }
      groupedData[date].totalWorkers += 1;
      if (rec.is_late) groupedData[date].lateArrivals += 1;
      if (rec.overtime_min > 0) groupedData[date].overtimeCount += 1;
    });

    // 2. Convert to array and sort by date ascending
    const sortedArray = Object.values(groupedData).sort((a, b) => new Date(a.date) - new Date(b.date));
    setData(sortedArray);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & Insights</h1>
          <p className="page-subtitle">Track historical attendance trends and workforce dynamics.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Daily Workforce Volume</h2>
          <div style={{ height: '300px' }}>
            {loading ? <div style={{textAlign:'center', marginTop:'4rem'}}>Loading...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{fill: 'var(--text-secondary)'}} />
                  <YAxis allowDecimals={false} tick={{fill: 'var(--text-secondary)'}} />
                  <Tooltip wrapperStyle={{ borderRadius: '8px', overflow:'hidden' }} />
                  <Legend />
                  <Bar dataKey="totalWorkers" name="Total Present" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Punctuality Trends</h2>
          <div style={{ height: '300px' }}>
            {loading ? <div style={{textAlign:'center', marginTop:'4rem'}}>Loading...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{fill: 'var(--text-secondary)'}} />
                  <YAxis allowDecimals={false} tick={{fill: 'var(--text-secondary)'}} />
                  <Tooltip wrapperStyle={{ borderRadius: '8px', overflow:'hidden' }} />
                  <Legend />
                  <Line type="monotone" dataKey="lateArrivals" name="Late Arrivals" stroke="var(--danger)" strokeWidth={3} dot={{r:4}} />
                  <Line type="monotone" dataKey="overtimeCount" name="Overtime Hitters" stroke="var(--success)" strokeWidth={3} dot={{r:4}} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
      </div>
      
    </div>
  );
}
