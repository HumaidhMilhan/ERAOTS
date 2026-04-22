import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../services/api';
import { useUIFeedback } from '../context/UIFeedbackContext';
import { TableSkeleton, EmptyStateStandard, ErrorStateStandard } from '../components/DataStates';
import '../components/notifications/Notifications.css';

const PRIORITY_COLORS = {
  CRITICAL: 'var(--danger, #ff4c4c)',
  HIGH: 'var(--warning, #ff9f43)',
  MEDIUM: 'var(--secondary, #ffd700)',
  LOW: 'var(--text-muted, #888)'
};

const TYPE_ICONS = {
  LATE_ARRIVAL: 'schedule',
  ABSENT: 'person_off',
  EARLY_EXIT: 'directions_run',
  LONG_BREAK: 'coffee',
  UNAUTHORIZED: 'gpp_bad',
  OVER_CAPACITY: 'groups',
  DEVICE_OFFLINE: 'router',
  MEETING_REMINDER: 'event',
  ANNOUNCEMENT: 'campaign',
  DEFAULT: 'notifications'
};

const ALL_TYPES = Object.keys(TYPE_ICONS).filter(t => t !== 'DEFAULT');

export default function NotificationCenter() {
  const ui = useUIFeedback();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageError, setPageError] = useState('');

  // Filters
  const [types, setTypes] = useState(ALL_TYPES);
  const [priority, setPriority] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const fetchItems = async () => {
    setLoading(true);
    try {
      setPageError('');
      const isReadParam = status === 'ALL' ? undefined : status === 'READ';

      const res = await notificationsAPI.list({
        limit: LIMIT,
        offset: (page - 1) * LIMIT,
        is_read: isReadParam
      });

      let data = res.data.items || [];
      if (priority !== 'ALL') {
        data = data.filter(d => d.priority === priority);
      }
      if (types.length !== ALL_TYPES.length) {
        data = data.filter(d => types.includes(d.triggered_by));
      }

      setNotifications(data);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to load notification center data';
      setPageError(detail);
      ui.error(detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [page]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchItems();
  };

  const handleClearFilters = () => {
    setTypes(ALL_TYPES);
    setPriority('ALL');
    setStatus('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setTimeout(fetchItems, 50);
  };

  const handleTypeCheck = (type) => {
    setTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.log_id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch (error) {
      console.error(error);
      ui.error(error.response?.data?.detail || 'Failed to mark notification as read');
    }
  };

  const handleBulkMarkRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      fetchItems();
      setSelectedIds(new Set());
    } catch (error) {
      console.error(error);
      ui.error(error.response?.data?.detail || 'Failed to mark selected notifications as read');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(notifications.map(n => n.log_id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  return (
    <div className="nc-layout">
      {/* Filter Panel */}
      <aside className="nc-filter-panel">
        <h3 className="nc-filter-title">Filters</h3>

        {/* Status */}
        <div className="nc-filter-section">
          <h4 className="nc-filter-section-title">Status</h4>
          <div className="nc-filter-options">
            {['ALL', 'UNREAD', 'READ'].map(val => (
              <label key={val} className="nc-radio">
                <input type="radio" name="nc-status" checked={status === val} onChange={() => setStatus(val)} />
                {val.charAt(0) + val.slice(1).toLowerCase()}
              </label>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="nc-filter-section">
          <h4 className="nc-filter-section-title">Priority</h4>
          <div className="nc-filter-options">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(val => (
              <label key={val} className="nc-radio">
                <input type="radio" name="nc-priority" checked={priority === val} onChange={() => setPriority(val)} />
                {val.charAt(0) + val.slice(1).toLowerCase()}
              </label>
            ))}
          </div>
        </div>

        {/* Alert Type */}
        <div className="nc-filter-section">
          <h4 className="nc-filter-section-title">Alert Type</h4>
          <div className="nc-filter-options nc-filter-options--scroll">
            {ALL_TYPES.map(type => (
              <label key={type} className="nc-checkbox">
                <input type="checkbox" checked={types.includes(type)} onChange={() => handleTypeCheck(type)} />
                {type.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="nc-filter-section">
          <h4 className="nc-filter-section-title">Date Range</h4>
          <div className="nc-filter-options">
            <input type="date" className="nc-filter-date" placeholder="From" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <input type="date" className="nc-filter-date" placeholder="To" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        {/* Actions */}
        <div className="nc-filter-actions">
          <button className="nc-filter-btn-primary" onClick={handleApplyFilters}>Apply Filters</button>
          <button className="nc-filter-btn-secondary" onClick={handleClearFilters}>Clear Filters</button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="nc-main">
        {pageError && <ErrorStateStandard message={pageError} onRetry={fetchItems} />}

        <div className="nc-header">
          <h2>Notifications <span className="nc-header-count">({totalCount})</span></h2>

          {selectedIds.size > 0 && (
            <div className="nc-bulk-bar">
              <span>{selectedIds.size} selected</span>
              <button className="nc-bulk-btn" onClick={handleBulkMarkRead}>Mark as read</button>
            </div>
          )}
        </div>

        {loading ? (
          <TableSkeleton rows={8} columns={4} label="Loading notifications..." />
        ) : notifications.length === 0 ? (
          <EmptyStateStandard
            icon="notifications_paused"
            title="No notifications found"
            message="No notifications match the current filters."
          />
        ) : (
          <div className="nc-list">
            <label className="nc-select-all nc-checkbox">
              <input type="checkbox" onChange={handleSelectAll} checked={notifications.length > 0 && selectedIds.size === notifications.length} />
              Select All
            </label>

            {notifications.map(notif => {
              const isUnread = !notif.read_at;
              const color = PRIORITY_COLORS[notif.priority];
              return (
                <div
                  key={notif.log_id}
                  className={`nc-item ${isUnread ? 'nc-item--unread' : ''}`}
                  style={isUnread ? { borderLeftColor: color } : undefined}
                  onClick={() => { if (isUnread) handleMarkRead(notif.log_id); }}
                >
                  <label className="nc-checkbox" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(notif.log_id)}
                      onChange={() => handleSelect(notif.log_id)}
                    />
                  </label>

                  <div className="nc-item-icon" style={{ color }}>
                    <span className="material-symbols-outlined">{TYPE_ICONS[notif.triggered_by] || TYPE_ICONS.DEFAULT}</span>
                  </div>

                  <div className="nc-item-body">
                    <div className="nc-item-top">
                      <div className={isUnread ? 'nc-item-title nc-item-title--bold' : 'nc-item-title'}>
                        {notif.title}
                        <span className="nc-priority-badge">{notif.priority}</span>
                      </div>
                      <div className="nc-item-time">
                        {new Date(notif.sent_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="nc-item-text">{notif.body}</div>
                    <div className="nc-item-channel">
                      <span className="material-symbols-outlined">
                        {notif.channel === 'in_app' ? 'notifications' : notif.channel === 'email' ? 'mail' : 'chat'}
                      </span>
                      Sent via {notif.channel}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            <div className="nc-pagination">
              <button className="nc-filter-btn-secondary" style={{ width: 'auto', padding: '0.4rem 1rem' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <span>Page {page}</span>
              <button className="nc-filter-btn-secondary" style={{ width: 'auto', padding: '0.4rem 1rem' }} disabled={notifications.length < LIMIT} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
