import { useState, useEffect } from 'react';
import { leaveAPI, scheduleAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SchedulesPage({ departmentScoped = false }) {
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
      
      // When department scoped (manager view), could filter by department
      const params = {};
      if (departmentScoped && user?.managed_department_id) {
        params.department_id = user.managed_department_id;
      }
      
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
  }, [departmentScoped, user?.managed_department_id]);

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
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="page-container">
      {/* Page Header */}
      <header className="page-header-premium">
        <div className="page-header-content">
          <span className="page-header-chip">WORKFORCE PLANNING</span>
          <h1 className="page-title-premium">Schedules & Leave</h1>
          <p className="page-subtitle-premium">Track requests, approvals, and staffing availability windows</p>
        </div>
      </header>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card-mini">
          <span className="stat-card-mini-label">Total</span>
          <span className="stat-card-mini-value">{requests.length}</span>
        </div>
        <div className="stat-card-mini">
          <span className="stat-card-mini-label">Pending</span>
          <span className="stat-card-mini-value">{pendingCount}</span>
        </div>
        <div className="stat-card-mini">
          <span className="stat-card-mini-label">Approved</span>
          <span className="stat-card-mini-value">{approvedCount}</span>
        </div>
        <div className="stat-card-mini stat-card-mini--accent">
          <span className="stat-card-mini-label">Rejected</span>
          <span className="stat-card-mini-value">{rejectedCount}</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="table-card-premium">
        <div className="table-card-header">
          <div className="table-card-title-group">
            <span className="material-symbols-outlined table-card-icon">event_note</span>
            <div>
              <h2 className="table-card-title">Leave Requests</h2>
              <p className="table-card-subtitle">{requests.length} requests in system</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="table-loading">
            <div className="loading-spinner"></div>
            <span>Loading leave requests...</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="premium-table">
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
                    <td colSpan={isHR ? 6 : 4} className="table-empty">
                      <span className="material-symbols-outlined">event_busy</span>
                      <p>No leave requests found</p>
                    </td>
                  </tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.request_id}>
                      {isHR && (
                        <td>
                          <span className="table-cell-name">{req.employee_name}</span>
                        </td>
                      )}
                      <td>
                        <span className="leave-type-chip">{req.leave_type_name}</span>
                      </td>
                      <td>
                        <div className="duration-cell">
                          <span className="duration-dates">{req.start_date}</span>
                          <span className="duration-separator">→</span>
                          <span className="duration-dates">{req.end_date}</span>
                        </div>
                      </td>
                      <td>
                        <span className="table-cell-secondary">{req.reason || '—'}</span>
                      </td>
                      <td>
                        <span className={`status-chip ${
                          req.status === 'APPROVED' ? 'status-chip--active' :
                          req.status === 'REJECTED' ? 'status-chip--danger' :
                          'status-chip--warning'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      {isHR && (
                        <td>
                          {req.status === 'PENDING' ? (
                            <div className="action-buttons">
                              <button
                                className="action-btn action-btn--approve"
                                onClick={() => handleStatusUpdate(req.request_id, 'APPROVED')}
                              >
                                <span className="material-symbols-outlined">check</span>
                              </button>
                              <button
                                className="action-btn action-btn--reject"
                                onClick={() => handleStatusUpdate(req.request_id, 'REJECTED')}
                              >
                                <span className="material-symbols-outlined">close</span>
                              </button>
                            </div>
                          ) : (
                            <span className="table-cell-secondary">Reviewed</span>
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

      {/* Floating Action Button */}
      <button className="fab" onClick={() => setIsModalOpen(true)} title="Request Leave">
        <span className="material-symbols-outlined">add</span>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-content">
                <span className="material-symbols-outlined modal-header-icon">calendar_month</span>
                <div>
                  <h2 className="modal-title">Request Leave</h2>
                  <p className="modal-subtitle">Submit a leave window for review</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select
                  className="form-input"
                  required
                  value={formData.leave_type_id}
                  onChange={e => setFormData({ ...formData, leave_type_id: e.target.value })}
                >
                  {leaveTypes.map(t => (
                    <option key={t.leave_type_id} value={t.leave_type_id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="modal-form-grid">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    min={formData.start_date}
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea
                  className="form-input"
                  rows="3"
                  required
                  placeholder="Brief explanation for leave request..."
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
