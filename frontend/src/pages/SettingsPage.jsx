import { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';

export default function SettingsPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await settingsAPI.getPolicies();
      setPolicies(res.data);
    } catch (err) {
      console.error("Failed to fetch policies", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdate = async (id, paramKey, val) => {
    const policy = policies.find(p => p.policy_id === id);
    if (!policy) return;

    const updatedValue = { ...policy.value, [paramKey]: parseInt(val) || val };
    
    try {
      await settingsAPI.updatePolicy(id, updatedValue);
      // Optimistic update
      setPolicies(prev => prev.map(p => p.policy_id === id ? { ...p, value: updatedValue } : p));
    } catch (err) {
      alert("Failed to update policy: " + (err.response?.data?.detail || err.message));
      fetchData(); // Reset
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Policy Engine</h1>
          <p className="page-subtitle">Configure company-wide attendance and HR rules dynamically.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading policies...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {policies.map(policy => (
              <div key={policy.policy_id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary)' }}>{policy.name}</h2>
                  <span style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                    {policy.policy_type}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {Object.entries(policy.value).map(([key, val]) => (
                    <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        defaultValue={val}
                        onBlur={(e) => handleUpdate(policy.policy_id, key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
