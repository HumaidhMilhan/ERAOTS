import { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AttendancePage({ departmentScoped = false }) {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = { start_date: targetDate, end_date: targetDate };
      
      // If department scoped (manager view), filter by department
      if (departmentScoped && user?.managed_department_id) {
        params.department_id = user.managed_department_id;
      }
      
      const res = await attendanceAPI.list(params);
      setRecords(res.data);
    } catch (err) {
      console.error("Failed to fetch records", err);
      setError("Failed to fetch attendance data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [targetDate, departmentScoped, user?.managed_department_id]);

  const handleProcessEntry = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const res = await attendanceAPI.process(targetDate);
      setSuccess(`Processed successfully. Rebuilt ${res.data.processed_records} records.`);
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process attendance');
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = ['Employee ID', 'Name', 'Date', 'First Entry', 'Last Exit', 'Active Target (min)', 'Late Duration (min)', 'Overtime (min)', 'Status'];
    const csvRows = [headers.join(',')];

    records.forEach(rec => {
      const firstEntryTime = rec.first_entry ? new Date(rec.first_entry).toLocaleTimeString() : 'N/A';
      const lastExitTime = rec.last_exit ? new Date(rec.last_exit).toLocaleTimeString() : 'N/A';

      const values = [
        rec.employee_id,
        `"${rec.employee_name}"`,
        rec.date,
        firstEntryTime,
        lastExitTime,
        rec.total_active_time_min,
        rec.late_duration_min,
        rec.overtime_duration_min,
        rec.status
      ];
      csvRows.push(values.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ERAOTS_Attendance_${targetDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const total = records.length;
  const onTime = records.filter((rec) => !rec.is_late).length;
  const late = records.filter((rec) => rec.is_late).length;
  const avgActiveMinutes = total > 0
    ? Math.round(records.reduce((sum, rec) => sum + rec.total_active_time_min, 0) / total)
    : 0;

  const toHours = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <header className="page-header-premium">
        <div className="page-header-content">
          <span className="page-header-chip">DAILY OPERATIONS</span>
          <h1 className="page-title-premium">Attendance</h1>
          <p className="page-subtitle-premium">Daily verification, end-of-day processing, and export control</p>
        </div>
      </header>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card-mini">
          <span className="stat-card-mini-label">Records</span>
          <span className="stat-card-mini-value">{total}</span>
        </div>
        <div className="stat-card-mini">
          <span className="stat-card-mini-label">On Time</span>
          <span className="stat-card-mini-value">{onTime}</span>
        </div>
        <div className="stat-card-mini">
          <span className="stat-card-mini-label">Late</span>
          <span className="stat-card-mini-value">{late}</span>
        </div>
        <div className="stat-card-mini stat-card-mini--accent">
          <span className="stat-card-mini-label">Avg Active</span>
          <span className="stat-card-mini-value">{toHours(avgActiveMinutes)}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar-card">
        <div className="toolbar-left">
          <label className="toolbar-label">Target Date</label>
          <input
            type="date"
            className="toolbar-date-input"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-ghost" onClick={handleProcessEntry} disabled={loading}>
            <span className="material-symbols-outlined">sync</span>
            Process EOD
          </button>
          <button className="btn btn-primary" onClick={handleExportCSV} disabled={records.length === 0}>
            <span className="material-symbols-outlined">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert--error">
          <span className="material-symbols-outlined">error</span>
          {error}
          <button className="alert-dismiss" onClick={() => setError('')}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
      {success && (
        <div className="alert alert--success">
          <span className="material-symbols-outlined">check_circle</span>
          {success}
          <button className="alert-dismiss" onClick={() => setSuccess('')}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="table-card-premium">
        <div className="table-card-header">
          <div className="table-card-title-group">
            <span className="material-symbols-outlined table-card-icon">schedule</span>
            <div>
              <h2 className="table-card-title">Attendance Records</h2>
              <p className="table-card-subtitle">{targetDate} • {total} entries</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="table-loading">
            <div className="loading-spinner"></div>
            <span>Loading attendance records...</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>First Entry</th>
                  <th>Last Exit</th>
                  <th>Active Time</th>
                  <th>Punctuality</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      <span className="material-symbols-outlined">event_busy</span>
                      <p>No attendance records for this date</p>
                      <span className="table-empty-hint">Run "Process EOD" to compute records from scan events</span>
                    </td>
                  </tr>
                ) : (
                  records.map(rec => (
                    <tr key={rec.record_id}>
                      <td>
                        <span className="table-cell-name">{rec.employee_name}</span>
                      </td>
                      <td>
                        <span className="table-cell-time">
                          {rec.first_entry
                            ? new Date(rec.first_entry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="table-cell-time">
                          {rec.last_exit
                            ? new Date(rec.last_exit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="table-cell-metric">{toHours(rec.total_active_time_min)}</span>
                      </td>
                      <td>
                        {rec.is_late ? (
                          <span className="punctuality-chip punctuality-chip--late">
                            +{rec.late_duration_min}m late
                          </span>
                        ) : (
                          <span className="punctuality-chip punctuality-chip--ontime">
                            On Time
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="status-chip status-chip--active">{rec.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
