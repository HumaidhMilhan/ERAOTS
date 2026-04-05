import { useState, useEffect } from 'react';
import { hardwareAPI } from '../services/api';

export default function ScannersPage() {
  const [scanners, setScanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    door_name: '',
    location_description: '',
    heartbeat_interval_sec: 60
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await hardwareAPI.list();
      setScanners(res.data);
    } catch (err) {
      console.error("Failed to fetch scanners", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const intv = setInterval(fetchData, 10000); // 10s polling for heartbeats
    return () => clearInterval(intv);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, heartbeat_interval_sec: parseInt(formData.heartbeat_interval_sec) };
      const res = await hardwareAPI.register(payload);
      setNewApiKey(res.data.api_key);
      setFormData({ name: '', door_name: '', location_description: '', heartbeat_interval_sec: 60 });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to register scanner');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hardware Scanner Fleet</h1>
          <p className="page-subtitle">Manage deployed biometric scanners, connection statuses, and API keys.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setIsModalOpen(true); setNewApiKey(null); }}>
          + Register Scanner
        </button>
      </div>

      <div className="card">
        {loading && scanners.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Scanner Name</th>
                  <th>Assigned Door</th>
                  <th>Location Profile</th>
                  <th>Last Heartbeat</th>
                  <th>UUID Ref</th>
                </tr>
              </thead>
              <tbody>
                {scanners.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No hardware nodes registered.
                    </td>
                  </tr>
                ) : (
                  scanners.map(s => {
                    const isOnline = s.status === 'ONLINE';
                    return (
                      <tr key={s.scanner_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ 
                              width: '10px', height: '10px', borderRadius: '50%', 
                              backgroundColor: isOnline ? 'var(--success)' : 'var(--danger)',
                              boxShadow: isOnline ? '0 0 8px var(--success)' : 'none'
                             }}></div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isOnline ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {s.status}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td>{s.door_name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{s.location_description || '-'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {s.last_heartbeat ? new Date(s.last_heartbeat).toLocaleString() : 'Never'}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                          {s.scanner_id.split('-')[0]}...
                        </td>
                      </tr>
                    );
                  })
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
            {newApiKey ? (
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--success)' }}>Node Registered!</h2>
                <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <p style={{ margin: 0, marginBottom: '0.5rem', fontWeight: 600, color: 'var(--danger)' }}>CRITICAL: Copy this API Key</p>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    This key acts as the token for the Raspberry Pi. It will never be shown again!
                  </p>
                  <code style={{ display: 'block', padding: '0.75rem', background: '#0f172a', color: '#10b981', borderRadius: '4px', wordBreak: 'break-all' }}>
                    {newApiKey}
                  </code>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setIsModalOpen(false)}>
                  I have saved the key!
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Register New Node</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Identifier (e.g. Node-Alpha-1)</label>
                    <input type="text" className="form-input" required autoFocus value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Door Target</label>
                    <input type="text" className="form-input" required placeholder="Main Entrance" value={formData.door_name} onChange={e => setFormData({...formData, door_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Geography</label>
                    <input type="text" className="form-input" placeholder="Block A, Ground Floor" value={formData.location_description} onChange={e => setFormData({...formData, location_description: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">TCP Target Interval (seconds)</label>
                    <input type="number" className="form-input" min="30" max="300" required value={formData.heartbeat_interval_sec} onChange={e => setFormData({...formData, heartbeat_interval_sec: e.target.value})} />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Provision Node</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
