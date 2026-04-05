import { useState, useEffect } from 'react';
import { notificationsAPI } from '../services/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await notificationsAPI.list(50);
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkRead = async (id, currentStatus) => {
    if (currentStatus) return; // already read
    try {
      await notificationsAPI.markRead(id);
      fetchData();
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Your recent alerts and system messages.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            No notifications yet!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map(notif => (
              <div 
                key={notif.notification_id} 
                onClick={() => handleMarkRead(notif.notification_id, notif.is_read)}
                style={{ 
                  padding: '1.5rem', 
                  borderBottom: '1px solid var(--border)',
                  borderLeft: notif.is_read ? '4px solid transparent' : '4px solid var(--primary)',
                  backgroundColor: notif.is_read ? 'transparent' : 'rgba(37, 99, 235, 0.05)',
                  cursor: notif.is_read ? 'default' : 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: notif.is_read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                    {notif.title}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {notif.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
