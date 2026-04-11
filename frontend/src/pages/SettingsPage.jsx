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
      setPolicies(prev => prev.map(p => p.policy_id === id ? { ...p, value: updatedValue } : p));
    } catch (err) {
      alert("Failed to update policy: " + (err.response?.data?.detail || err.message));
      fetchData();
    }
  };

  const getPolicyIcon = (type) => {
    switch (type) {
      case 'ATTENDANCE': return 'schedule';
      case 'OVERTIME': return 'more_time';
      case 'LEAVE': return 'event_available';
      default: return 'settings';
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <header className="page-header-premium">
        <div className="page-header-content">
          <span className="page-header-chip">CONFIGURATION</span>
          <h1 className="page-title-premium">Policy Engine</h1>
          <p className="page-subtitle-premium">Configure company-wide attendance and HR rules</p>
        </div>
      </header>

      {/* Policies */}
      {loading ? (
        <div className="table-loading">
          <div className="loading-spinner"></div>
          <span>Loading policies...</span>
        </div>
      ) : (
        <div className="policies-grid">
          {policies.map(policy => (
            <div key={policy.policy_id} className="policy-card">
              <div className="policy-card-header">
                <div className="policy-card-title-group">
                  <span className="material-symbols-outlined policy-card-icon">
                    {getPolicyIcon(policy.policy_type)}
                  </span>
                  <div>
                    <h2 className="policy-card-title">{policy.name}</h2>
                    <span className="policy-card-type">{policy.policy_type}</span>
                  </div>
                </div>
              </div>

              <div className="policy-params">
                {Object.entries(policy.value).map(([key, val]) => (
                  <div key={key} className="policy-param">
                    <label className="policy-param-label">
                      {key.replace(/_/g, ' ')}
                    </label>
                    <input
                      type="number"
                      className="policy-param-input"
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
  );
}
