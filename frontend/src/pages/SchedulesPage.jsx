import { useState, useEffect } from 'react';
import { leaveAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SchedulesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, typesRes] = await Promise.all([
        leaveAPI.listRequests(),
        leaveAPI.getTypes()
      ]);
      setRequests(reqRes.data);
      setLeaveTypes(typesRes.data);
      if (typesRes.data.length > 0) {
        setFormData(prev => ({ ...prev, leave_type_id: typesRes.data[0].leave_type_id }));
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await leaveAPI.submitRequest(formData);
      setIsModalOpen(false);
      setFormData({ ...formData, start_date: '', end_date: '', reason: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit request');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await leaveAPI.updateStatus(id, status, `HR marked as ${status}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update request');
    }
  };

  const isHR = user && (user.role === 'HR_MANAGER' || user.role === 'SUPER_ADMIN');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Schedules & Leave</h1>
          <p className="page-subtitle">Manage upcoming leave requests and work schedules.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + Request Leave
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {isHR && <th>Employee</th>}
                  <th>Leave Type</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                  {isHR && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={isHR ? 6 : 4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.request_id}>
                      {isHR && <td style={{ fontWeight: 600 }}>{req.employee_name}</td>}
                      <td>{req.leave_type_name}</td>
                      <td>{req.start_date} <span style={{ color: 'var(--text-secondary)' }}>to</span> {req.end_date}</td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: '200px' }} className="truncate">
                        {req.reason || '-'}
                      </td>
                      <td>
                        <span className={`status-badge ${req.status === 'APPROVED' ? 'active' : req.status === 'REJECTED' ? 'outside' : 'away'}`}>
                          {req.status}
                        </span>
                      </td>
                      {isHR && (
                        <td>
                          {req.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', color: 'var(--success)' }} onClick={() => handleStatusUpdate(req.request_id, 'APPROVED')}>Approve</button>
                              <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }} onClick={() => handleStatusUpdate(req.request_id, 'REJECTED')}>Reject</button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Reviewed</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', margin: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Request Leave</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select className="form-input" required value={formData.leave_type_id} onChange={e => setFormData({...formData, leave_type_id: e.target.value})}>
                  {leaveTypes.map(t => <option key={t.leave_type_id} value={t.leave_type_id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" className="form-input" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input type="date" className="form-input" required min={formData.start_date} value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea className="form-input" rows="3" required placeholder="Why are you taking leave?" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
