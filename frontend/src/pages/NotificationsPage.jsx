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
    if (currentStatus) return;
    try {
      await notificationsAPI.markRead(id);
      fetchData();
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'alert': return 'warning';
      case 'success': return 'check_circle';
      case 'info': return 'info';
      default: return 'notifications';
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <header className="page-header-premium">
        <div className="page-header-content">
          <span className="page-header-chip">COMMUNICATIONS</span>
          <h1 className="page-title-premium">Notifications</h1>
          <p className="page-subtitle-premium">Your recent alerts and system messages</p>
        </div>
      </header>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card-mini">
          <span className="stat-card-mini-label">Total</span>
          <span className="stat-card-mini-value">{notifications.length}</span>
        </div>
        <div className="stat-card-mini stat-card-mini--accent">
          <span className="stat-card-mini-label">Unread</span>
          <span className="stat-card-mini-value">{unreadCount}</span>
        </div>
      </div>

      {/* Notifications List */}
      <div className="notifications-card">
        {loading ? (
          <div className="table-loading">
            <div className="loading-spinner"></div>
            <span>Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <span className="material-symbols-outlined">notifications_off</span>
            <p>No notifications yet</p>
            <span className="notifications-empty-hint">You're all caught up!</span>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map(notif => (
              <div
                key={notif.notification_id}
                className={`notification-item ${!notif.is_read ? 'notification-item--unread' : ''}`}
                onClick={() => handleMarkRead(notif.notification_id, notif.is_read)}
              >
                <div className="notification-indicator">
                  <span className={`material-symbols-outlined notification-icon ${!notif.is_read ? 'notification-icon--unread' : ''}`}>
                    {getNotificationIcon(notif.type)}
                  </span>
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <h3 className="notification-title">{notif.title}</h3>
                    <span className="notification-time">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="notification-message">{notif.message}</p>
                </div>
                {!notif.is_read && (
                  <div className="notification-unread-dot"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
