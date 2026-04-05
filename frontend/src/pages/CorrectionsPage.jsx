import { useState, useEffect } from 'react';
import { correctionsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CorrectionsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    correction_date: '',
    correction_type: 'MISSED_SCAN',
    proposed_time: '',
    reason: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await correctionsAPI.list();
      setRequests(res.data);
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
      const payload = {
        ...formData,
        proposed_time: new Date(`${formData.correction_date}T${formData.proposed_time}`).toISOString()
      };
      await correctionsAPI.submit(payload);
      setIsModalOpen(false);
      setFormData({ correction_date: '', correction_type: 'MISSED_SCAN', proposed_time: '', reason: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit correction');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await correctionsAPI.updateStatus(id, status, `HR marked as ${status}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update correction');
    }
  };

  const isHR = user && (user.role === 'HR_MANAGER' || user.role === 'SUPER_ADMIN');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Corrections</h1>
          <p className="page-subtitle">Dispute attendance records and log missed biometric scans.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + File Correction
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
                  <th>Request Date</th>
                  <th>Type</th>
                  <th>Proposed Time</th>
                  <th>Status</th>
                  {isHR && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={isHR ? 6 : 5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No correction requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.request_id}>
                      {isHR && <td style={{ fontWeight: 600 }}>{req.employee_name}</td>}
                      <td>{req.correction_date}</td>
                      <td>{req.correction_type.replace('_', ' ')}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(req.proposed_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td>
                        <span className={`status-badge ${req.status === 'APPROVED' ? 'active' : req.status === 'REJECTED' ? 'outside' : 'away'}`}>
                          {req.status}
                        </span>
                        <div style={{fontSize: '0.75rem', marginTop: '4px', color:'var(--text-secondary)'}}>{req.reason}</div>
                      </td>
                      {isHR && (
                        <td>
                          {req.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', color: 'var(--success)' }} onClick={() => handleStatusUpdate(req.request_id, 'APPROVED')}>Approve</button>
                              <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }} onClick={() => handleStatusUpdate(req.request_id, 'REJECTED')}>Reject</button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Resolved</span>
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
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>File Correction</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Correction Type</label>
                <select className="form-input" required value={formData.correction_type} onChange={e => setFormData({...formData, correction_type: e.target.value})}>
                  <option value="MISSED_SCAN">Missed Scan / Left Badge</option>
                  <option value="WRONG_SCAN">Scanned Wrong Door</option>
                  <option value="OTHER">Other System Error</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Date of Missing Event</label>
                  <input type="date" className="form-input" required value={formData.correction_date} onChange={e => setFormData({...formData, correction_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Estimated Time</label>
                  <input type="time" className="form-input" required value={formData.proposed_time} onChange={e => setFormData({...formData, proposed_time: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Explanation</label>
                <textarea className="form-input" rows="3" required placeholder="Forgot badge inside car..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Correction</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
