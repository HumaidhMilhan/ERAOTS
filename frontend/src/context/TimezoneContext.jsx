/**
 * TimezoneContext — Provides the organization timezone from the OFFICE_TIMEZONE policy.
 * 
 * This context fetches the canonical timezone from the backend policy engine
 * and exposes it + formatting utilities to the entire app. When an admin updates
 * the timezone in System Config, call `refreshTimezone()` to re-fetch.
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { settingsAPI } from '../services/api';

const TimezoneContext = createContext(null);
const FALLBACK_TZ = 'Asia/Colombo';

export function TimezoneProvider({ children }) {
  const [timezone, setTimezone] = useState(FALLBACK_TZ);
  const [loading, setLoading] = useState(true);

  const fetchTimezone = useCallback(async () => {
    try {
      const res = await settingsAPI.getPolicies({});
      const policies = res.data || [];
      const tzPolicy = policies.find(
        (p) => p.policy_type === 'OFFICE_TIMEZONE' && p.is_active
      );
      if (tzPolicy?.value?.timezone) {
        setTimezone(tzPolicy.value.timezone);
      }
    } catch (err) {
      // Non-critical: fall back to default. Logged-out users won't have access.
      console.warn('[TimezoneContext] Could not fetch timezone policy:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if logged in (token exists)
    const token = localStorage.getItem('eraots_token');
    if (token) {
      fetchTimezone();
    } else {
      setLoading(false);
    }
  }, [fetchTimezone]);

  /**
   * Format a date/time string or Date object in the organization timezone.
   * @param {string|Date} dateInput - ISO string or Date object
   * @param {object} options - Intl.DateTimeFormat options override
   * @returns {string} formatted string in the organization timezone
   */
  const formatDateTime = useCallback((dateInput, options = {}) => {
    if (!dateInput) return '—';
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '—';

    const defaults = {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };

    return new Intl.DateTimeFormat('en-US', { ...defaults, ...options }).format(date);
  }, [timezone]);

  /**
   * Format just the date portion (no time).
   */
  const formatDate = useCallback((dateInput, options = {}) => {
    return formatDateTime(dateInput, {
      hour: undefined, minute: undefined, second: undefined, hour12: undefined,
      ...options,
    });
  }, [formatDateTime]);

  /**
   * Format just the time portion.
   */
  const formatTime = useCallback((dateInput, options = {}) => {
    return formatDateTime(dateInput, {
      year: undefined, month: undefined, day: undefined,
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
      ...options,
    });
  }, [formatDateTime]);

  /**
   * Get the current time as a Date object, for use with setInterval clocks etc.
   * This just returns new Date() — the timezone conversion happens in formatting.
   */
  const now = useCallback(() => new Date(), []);

  const value = useMemo(() => ({
    timezone,
    loading,
    formatDateTime,
    formatDate,
    formatTime,
    now,
    refreshTimezone: fetchTimezone,
  }), [timezone, loading, formatDateTime, formatDate, formatTime, now, fetchTimezone]);

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const ctx = useContext(TimezoneContext);
  if (!ctx) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return ctx;
}

export default TimezoneContext;
