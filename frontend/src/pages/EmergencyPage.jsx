import { useState, useEffect } from 'react';
import { emergencyAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SAFETY_PROMPT_TEXT = 'Are you safe?';

/** Matches backend EmergencySafetyCheck.status → user-facing labels */
function safetyStatusLabel(status) {
  switch (status) {
    case 'SAFE':
      return 'Safe employee';
    case 'IN_DANGER':
      return 'In danger';
    case 'PENDING':
      return 'Awaiting response';
    default:
      return status;
  }
}

export default function EmergencyPage() {
  const { user } = useAuth();
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [mySafety, setMySafety] = useState(null);
  const [responding, setResponding] = useState(false);
  const [emergencyHistory, setEmergencyHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [safetySummary, setSafetySummary] = useState(null);

  const isAdminRole = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER';

  useEffect(() => {
    fetchActive();
    fetchMySafety();
    const interval = setInterval(fetchActive, 5000);
    const interval2 = setInterval(fetchMySafety, 5000);
    return () => {
      clearInterval(interval);
      clearInterval(interval2);
    };
  }, []);

  useEffect(() => {
    if (!isAdminRole || !activeEmergency?.emergency_id) {
      setSafetySummary(null);
      return;
    }
    const load = async () => {
      try {
        const res = await emergencyAPI.listActiveSafety();
        setSafetySummary(res.data);
      } catch (err) {
        console.error('Failed to load safety check summary', err);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [isAdminRole, activeEmergency?.emergency_id]);

  const fetchActive = async () => {
    try {
      const res = await emergencyAPI.getActive();
      setActiveEmergency(res.data);
    } catch (err) {
      console.error("Failed to fetch emergency state", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMySafety = async () => {
    try {
      const res = await emergencyAPI.getMySafety();
      setMySafety(res.data);
    } catch (err) {
      // ignore if not logged in / endpoint unavailable
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await emergencyAPI.getHistory();
      setEmergencyHistory(res.data || []);
    } catch (err) {
      console.error("Failed to fetch emergency history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory && emergencyHistory.length === 0) {
      fetchHistory();
    }
    setShowHistory(!showHistory);
  };

  const handleTrigger = async () => {
    if (!window.confirm("CRITICAL: Are you sure you want to trigger building evacuation mode?")) return;
    try {
      await emergencyAPI.trigger({ emergency_type: 'FACTORY_EVACUATION', notes: 'Triggered via Admin Console' });
      fetchActive();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to trigger emergency");
    }
  };

  const handleResolve = async () => {
    if (!activeEmergency) return;
    if (!window.confirm("Verify: Are you sure the emergency is resolved and employees can return?")) return;
    try {
      await emergencyAPI.resolve(activeEmergency.emergency_id);
      setActiveEmergency(null);
    } catch (err) {
      alert("Failed to resolve emergency");
    }
  };

  const handleBroadcastSafety = async () => {
    if (!window.confirm('Send "Are you safe?" prompt to employees now?')) return;
    try {
      await emergencyAPI.broadcastSafety();
      alert('Safety check sent.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send safety check');
    }
  };

  const handleAccountFor = async (headcountId) => {
    try {
      await emergencyAPI.markAccounted(headcountId);
      setActiveEmergency(prev => ({
        ...prev,
        headcount_entries: prev.headcount_entries.map(e =>
          e.id === headcountId ? { ...e, accounted_for: true, accounted_at: new Date().toISOString() } : e
        )
      }));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !activeEmergency) {
    return (
      <div className="page-container">
        <div className="table-loading">
          <div className="loading-spinner"></div>
          <span>Loading emergency status...</span>
        </div>
      </div>
    );
  }

  const isAdmin = isAdminRole;
  const missingCount = activeEmergency?.headcount_entries?.filter(e => !e.accounted_for).length || 0;
  const safeCount = activeEmergency?.headcount_entries?.filter(e => e.accounted_for).length || 0;
  const showSafetyPrompt = !!activeEmergency && !isAdmin && mySafety && mySafety.status === 'PENDING';
  const showSafetyResolved = !!activeEmergency && !isAdmin && mySafety && mySafety.status !== 'PENDING';

  const handleSafetyResponse = async (response) => {
    try {
      setResponding(true);
      await emergencyAPI.respondMySafety(response);
      await fetchMySafety();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send response');
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <header className="page-header-premium">
        <div className="page-header-content">
          <span className="page-header-chip page-header-chip--emergency">SAFETY PROTOCOL</span>
          <h1 className="page-title-premium">Emergency Mode</h1>
          <p className="page-subtitle-premium">Evacuation headcount and muster point tracking</p>
        </div>
        <button 
          className={`btn btn-ghost ${showHistory ? 'btn-ghost--active' : ''}`}
          onClick={toggleHistory}
        >
          <span className="material-symbols-outlined">history</span>
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      </header>

      {/* Emergency History Panel */}
      {showHistory && (
        <div className="emergency-history-panel">
          <div className="emergency-history-header">
            <span className="material-symbols-outlined">history</span>
            <h3>Emergency History</h3>
          </div>
          {historyLoading ? (
            <div className="emergency-history-loading">
              <div className="loading-spinner"></div>
              <span>Loading history...</span>
            </div>
          ) : emergencyHistory.length === 0 ? (
            <div className="emergency-history-empty">
              <span className="material-symbols-outlined">check_circle</span>
              <span>No emergency events on record</span>
            </div>
          ) : (
            <div className="emergency-history-list">
              {emergencyHistory.filter(e => e.status === 'RESOLVED').map(emergency => (
                <div key={emergency.emergency_id} className="emergency-history-item">
                  <div className="emergency-history-item-header">
                    <span className="emergency-history-type">{emergency.emergency_type}</span>
                    <span className="emergency-history-status">RESOLVED</span>
                  </div>
                  <div className="emergency-history-item-details">
                    <div className="emergency-history-detail">
                      <span className="material-symbols-outlined">schedule</span>
                      <span>Activated: {new Date(emergency.activation_time).toLocaleString()}</span>
                    </div>
                    {emergency.deactivation_time && (
                      <div className="emergency-history-detail">
                        <span className="material-symbols-outlined">check_circle</span>
                        <span>Resolved: {new Date(emergency.deactivation_time).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="emergency-history-detail">
                      <span className="material-symbols-outlined">group</span>
                      <span>Headcount: {emergency.headcount_at_activation || 0} personnel</span>
                    </div>
                  </div>
                  {emergency.notes && (
                    <div className="emergency-history-notes">
                      <span className="material-symbols-outlined">notes</span>
                      <span>{emergency.notes}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!activeEmergency ? (
        /* Safe State */
        <div className="emergency-safe-card">
          <div className="emergency-safe-icon">
            <span className="material-symbols-outlined">verified_user</span>
          </div>
          <h2 className="emergency-safe-title">Building is Safe</h2>
          <p className="emergency-safe-text">There are no active emergencies</p>

          {isAdmin && (
            <button className="btn btn-danger btn-large" onClick={handleTrigger}>
              <span className="material-symbols-outlined">emergency</span>
              Trigger Evacuation
            </button>
          )}
        </div>
      ) : (
        /* Active Emergency */
        <div className="emergency-active">
          {/* Alert Banner */}
          <div className="emergency-banner">
            <div className="emergency-banner-content">
              <span className="material-symbols-outlined emergency-banner-icon">emergency</span>
              <div>
                <h2 className="emergency-banner-title">EVACUATION ACTIVE</h2>
                <p className="emergency-banner-time">
                  Activated at {new Date(activeEmergency.activation_time).toLocaleTimeString()}
                </p>
              </div>
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-danger" onClick={handleBroadcastSafety}>
                  <span className="material-symbols-outlined">campaign</span>
                  Send Safety Check
                </button>
                <button className="btn btn-ghost btn-resolve" onClick={handleResolve}>
                  <span className="material-symbols-outlined">check_circle</span>
                  Resolve Emergency
                </button>
              </div>
            )}
          </div>

          {/* Admin: who responded safe vs in danger (from notification / safety check) */}
          {isAdmin && safetySummary && (
            <div className="emergency-history-panel" style={{ marginTop: 16 }}>
              <div className="emergency-history-header">
                <span className="material-symbols-outlined">shield_with_heart</span>
                <h3>Safety check responses</h3>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', gap: 16, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span><strong>{safetySummary.safe_count}</strong> safe</span>
                <span><strong>{safetySummary.in_danger_count}</strong> in danger</span>
                <span><strong>{safetySummary.pending_count}</strong> awaiting</span>
              </div>
              <div className="table-wrapper" style={{ marginTop: 0 }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Mark</th>
                      <th>Answer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safetySummary.entries?.map((row) => (
                      <tr
                        key={row.employee_id}
                        className={
                          row.status === 'SAFE'
                            ? 'emergency-row-safe'
                            : row.status === 'IN_DANGER'
                              ? 'emergency-row-missing'
                              : ''
                        }
                      >
                        <td><span className="table-cell-name">{row.employee_name || '—'}</span></td>
                        <td>
                          <span className={row.status === 'SAFE' ? 'safe-badge' : row.status === 'IN_DANGER' ? 'status-chip status-chip--danger' : 'status-chip'}>
                            {safetyStatusLabel(row.status)}
                          </span>
                        </td>
                        <td>
                          {row.response === 'YES' ? 'Yes' : row.response === 'NO' ? 'No' : row.status === 'PENDING' ? '—' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Employee Safety Prompt */}
          {showSafetyPrompt && (
            <div className="emergency-history-panel" style={{ marginTop: 16 }}>
              <div className="emergency-history-header">
                <span className="material-symbols-outlined">report</span>
                <h3>Safety Check</h3>
              </div>
              <div style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{SAFETY_PROMPT_TEXT}</div>
                  <div style={{ opacity: 0.8, fontSize: 13 }}>
                    Please respond now. No response will be treated as <b>in danger</b>.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-success" disabled={responding} onClick={() => handleSafetyResponse('YES')}>
                    <span className="material-symbols-outlined">check_circle</span>
                    Yes
                  </button>
                  <button className="btn btn-danger" disabled={responding} onClick={() => handleSafetyResponse('NO')}>
                    <span className="material-symbols-outlined">dangerous</span>
                    No
                  </button>
                </div>
              </div>
            </div>
          )}

          {showSafetyResolved && (
            <div className="emergency-history-panel" style={{ marginTop: 16 }}>
              <div className="emergency-history-header">
                <span className="material-symbols-outlined">verified_user</span>
                <h3>Your Safety Status</h3>
              </div>
              <div style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    {safetyStatusLabel(mySafety.status)}
                  </div>
                  <div style={{ opacity: 0.8, fontSize: 13 }}>
                    {mySafety.response
                      ? `You answered: ${mySafety.response === 'YES' ? 'Yes' : 'No'}`
                      : mySafety.status === 'IN_DANGER'
                        ? 'No response in time or you answered No'
                        : ''}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="emergency-stats">
            <div className="emergency-stat-card">
              <span className="emergency-stat-value">{activeEmergency.headcount_at_activation}</span>
              <span className="emergency-stat-label">Initial Headcount</span>
            </div>
            <div className="emergency-stat-card emergency-stat-card--danger">
              <span className="emergency-stat-value">{missingCount}</span>
              <span className="emergency-stat-label">Missing Personnel</span>
            </div>
            <div className="emergency-stat-card emergency-stat-card--success">
              <span className="emergency-stat-value">{safeCount}</span>
              <span className="emergency-stat-label">Accounted For</span>
            </div>
          </div>

          {/* Muster Checklist */}
          <div className="table-card-premium emergency-table">
            <div className="table-card-header">
              <div className="table-card-title-group">
                <span className="material-symbols-outlined table-card-icon">fact_check</span>
                <div>
                  <h2 className="table-card-title">Muster Point Checklist</h2>
                  <p className="table-card-subtitle">Mark personnel as safe when accounted for</p>
                </div>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Status at Event</th>
                    <th>Safe Time</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEmergency.headcount_entries?.map(entry => (
                    <tr
                      key={entry.id}
                      className={entry.accounted_for ? 'emergency-row-safe' : 'emergency-row-missing'}
                    >
                      <td>
                        <span className="table-cell-name">{entry.employee_name}</span>
                      </td>
                      <td>
                        <span className="status-chip status-chip--active">{entry.status_at_event}</span>
                      </td>
                      <td>
                        <span className="table-cell-time">
                          {entry.accounted_at
                            ? new Date(entry.accounted_at).toLocaleTimeString()
                            : '—'}
                        </span>
                      </td>
                      <td>
                        {!entry.accounted_for ? (
                          <button
                            className="btn btn-success btn-small"
                            onClick={() => handleAccountFor(entry.id)}
                          >
                            <span className="material-symbols-outlined">check</span>
                            Mark Safe
                          </button>
                        ) : (
                          <span className="safe-badge">
                            <span className="material-symbols-outlined">verified</span>
                            SAFE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
