import { useState, useEffect } from 'react';
import { emergencyAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function EmergencyPage() {
  const { user } = useAuth();
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Polling interval if emergency is active
  useEffect(() => {
    fetchActive();
    const interval = setInterval(fetchActive, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const handleAccountFor = async (headcountId) => {
    try {
      await emergencyAPI.markAccounted(headcountId);
      // Optimistic update
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

  if (loading && !activeEmergency) return <div style={{padding:'2rem', textAlign:'center'}}>Loading...</div>;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 className="page-title">Emergency Mode</h1>
          <p className="page-subtitle">Evacuation headcount and muster point tracking.</p>
        </div>
        {!activeEmergency && (user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER') && (
          <button 
            className="btn btn-primary" 
            style={{ backgroundColor: 'var(--danger)', color: 'white', border: 'none', fontSize:'1.1rem', padding:'0.75rem 1.5rem', fontWeight:'bold' }}
            onClick={handleTrigger}
          >
            🚨 TRIGGER EVACUATION
          </button>
        )}
      </div>

      {!activeEmergency ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h2>Building is Safe</h2>
          <p style={{ color: 'var(--text-secondary)' }}>There are no active emergencies.</p>
        </div>
      ) : (
        <div style={{ animation: 'pulse-bg 2s infinite alternate' }}>
          <style>{`
            @keyframes pulse-bg {
              0% { background-color: rgba(239, 68, 68, 0.05); }
              100% { background-color: rgba(239, 68, 68, 0.15); border-radius: 8px; }
            }
          `}</style>
          
          <div className="card" style={{ border: '2px solid var(--danger)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom:'1rem', borderBottom:'1px solid var(--border)' }}>
              <div>
                <h2 style={{ color: 'var(--danger)', margin: 0 }}>🚨 EVACUATION ACTIVE</h2>
                <p style={{ color: 'var(--text-secondary)', margin: 0, marginTop:'0.5rem' }}>
                  Activated at: {new Date(activeEmergency.activation_time).toLocaleTimeString()}
                </p>
              </div>
              <button className="btn btn-ghost" style={{color:'initial', border:'1px solid var(--border)'}} onClick={handleResolve}>
                Resolve Emergency
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding:'1rem', background:'var(--bg-secondary)', borderRadius:'8px', textAlign:'center' }}>
                <div style={{ fontSize:'2rem', fontWeight:'bold' }}>{activeEmergency.headcount_at_activation}</div>
                <div style={{ color:'var(--text-secondary)', fontSize:'0.875rem' }}>Initial Headcount</div>
              </div>
              <div style={{ padding:'1rem', background:'var(--bg-secondary)', borderRadius:'8px', textAlign:'center' }}>
                <div style={{ fontSize:'2rem', fontWeight:'bold', color: 'var(--danger)' }}>
                    {activeEmergency.headcount_entries.filter(e => !e.accounted_for).length}
                </div>
                <div style={{ color:'var(--text-secondary)', fontSize:'0.875rem' }}>Missing Personnel</div>
              </div>
              <div style={{ padding:'1rem', background:'var(--bg-secondary)', borderRadius:'8px', textAlign:'center' }}>
                <div style={{ fontSize:'2rem', fontWeight:'bold', color: 'var(--success)' }}>
                    {activeEmergency.headcount_entries.filter(e => e.accounted_for).length}
                </div>
                <div style={{ color:'var(--text-secondary)', fontSize:'0.875rem' }}>Accounted For</div>
              </div>
            </div>

            <h3 style={{ marginBottom: '1rem' }}>Muster Point Checklist</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Status at Event</th>
                    <th>Safe Time</th>
                    <th style={{textAlign:'right'}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEmergency.headcount_entries.map(entry => (
                    <tr key={entry.id} style={{ background: entry.accounted_for ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}>
                      <td style={{ fontWeight: '500' }}>{entry.employee_name}</td>
                      <td>{entry.status_at_event}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {entry.accounted_at ? new Date(entry.accounted_at).toLocaleTimeString() : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!entry.accounted_for ? (
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.25rem 0.75rem', fontSize:'0.875rem', backgroundColor:'var(--success)', border:'none', color:'white' }}
                            onClick={() => handleAccountFor(entry.id)}
                          >
                            Mark Safe
                          </button>
                        ) : (
                          <span style={{ color: 'var(--success)', fontWeight:'bold' }}>SAFE ✓</span>
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
