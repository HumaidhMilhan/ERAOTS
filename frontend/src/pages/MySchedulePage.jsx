/**
 * MySchedulePage — Personal schedule view for employees.
 * Shows own work schedule and shift assignments.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI } from '../services/api';

export default function MySchedulePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    return startOfWeek;
  });

  useEffect(() => {
    fetchSchedules();
  }, [currentWeek, user]);

  const fetchSchedules = async () => {
    if (!user?.employee_id) return;
    
    setLoading(true);
    try {
      const res = await scheduleAPI.mySchedule({
        employee_id: user.employee_id,
      });
      setSchedules(res.data || []);
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeek);
      date.setDate(currentWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const formatDayHeader = (date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    return {
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      isToday,
    };
  };

  const getScheduleForDay = (date) => {
    // Find schedule that applies to this day of week
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return schedules.find(s => s.day_of_week?.toLowerCase() === dayNames[dayOfWeek]);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '—';
    // Handle both HH:MM:SS and full datetime formats
    const parts = timeStr.split('T');
    const time = parts.length > 1 ? parts[1].substring(0, 5) : timeStr.substring(0, 5);
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const handleWeekChange = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction * 7));
    setCurrentWeek(newWeek);
  };

  const getWeekLabel = () => {
    const endOfWeek = new Date(currentWeek);
    endOfWeek.setDate(currentWeek.getDate() + 6);
    
    const startMonth = currentWeek.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' });
    
    if (startMonth === endMonth) {
      return `${startMonth} ${currentWeek.getDate()} - ${endOfWeek.getDate()}, ${currentWeek.getFullYear()}`;
    }
    return `${startMonth} ${currentWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${currentWeek.getFullYear()}`;
  };

  const weekDays = getWeekDays();

  return (
    <div className="page-container">
      {/* Page Header */}
      <header className="page-header-premium">
        <div className="page-header-content">
          <span className="page-header-chip">PERSONAL</span>
          <h1 className="page-title-premium">My Schedule</h1>
          <p className="page-subtitle-premium">View your work schedule and shift times</p>
        </div>
      </header>

      {/* Week Navigation */}
      <div className="month-nav">
        <button className="month-nav-btn" onClick={() => handleWeekChange(-1)}>
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <span className="month-nav-label">{getWeekLabel()}</span>
        <button className="month-nav-btn" onClick={() => handleWeekChange(1)}>
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
        <button 
          className="btn-secondary" 
          style={{ marginLeft: 'auto' }}
          onClick={() => setCurrentWeek(new Date(new Date().setDate(new Date().getDate() - new Date().getDay())))}
        >
          Today
        </button>
      </div>

      {/* Schedule Grid */}
      {loading ? (
        <div className="table-loading">
          <div className="loading-spinner"></div>
          <span>Loading schedule...</span>
        </div>
      ) : (
        <div className="schedule-week-grid glass-card">
          {weekDays.map((date) => {
            const { dayName, dayNum, isToday } = formatDayHeader(date);
            const schedule = getScheduleForDay(date);
            
            return (
              <div 
                key={date.toISOString()} 
                className={`schedule-day-card ${isToday ? 'schedule-day-card--today' : ''}`}
              >
                <div className="schedule-day-header">
                  <span className="schedule-day-name">{dayName}</span>
                  <span className={`schedule-day-num ${isToday ? 'schedule-day-num--today' : ''}`}>
                    {dayNum}
                  </span>
                </div>
                
                {schedule ? (
                  <div className="schedule-shift">
                    <div className="schedule-shift-times">
                      <div className="schedule-time">
                        <span className="material-symbols-outlined">login</span>
                        <span>{formatTime(schedule.start_time)}</span>
                      </div>
                      <div className="schedule-time">
                        <span className="material-symbols-outlined">logout</span>
                        <span>{formatTime(schedule.end_time)}</span>
                      </div>
                    </div>
                    {schedule.break_duration && (
                      <div className="schedule-break">
                        <span className="material-symbols-outlined">coffee</span>
                        <span>{schedule.break_duration} min break</span>
                      </div>
                    )}
                    {schedule.schedule_name && (
                      <div className="schedule-name-badge">
                        {schedule.schedule_name}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="schedule-off">
                    <span className="material-symbols-outlined">event_busy</span>
                    <span>Day Off</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Summary */}
      {!loading && schedules.length > 0 && (
        <div className="schedule-summary glass-card">
          <h3>Weekly Summary</h3>
          <div className="schedule-summary-stats">
            <div className="schedule-summary-stat">
              <span className="material-symbols-outlined">calendar_month</span>
              <div>
                <span className="summary-value">{schedules.length}</span>
                <span className="summary-label">Working Days</span>
              </div>
            </div>
            <div className="schedule-summary-stat">
              <span className="material-symbols-outlined">schedule</span>
              <div>
                <span className="summary-value">
                  {schedules.reduce((sum, s) => {
                    if (s.start_time && s.end_time) {
                      const start = new Date(`2000-01-01T${s.start_time}`);
                      const end = new Date(`2000-01-01T${s.end_time}`);
                      return sum + (end - start) / (1000 * 60 * 60);
                    }
                    return sum;
                  }, 0).toFixed(0)}h
                </span>
                <span className="summary-label">Weekly Hours</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
