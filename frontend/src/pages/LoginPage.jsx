/**
 * Login Page — ERAOTS authentication screen.
 * Design System: Vigilant Glass (Bento + Glassmorphism)
 * Premium redesign for 1 Billion Tech pitch
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import BrandLogo from '../components/BrandLogo';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-page">
      {/* Ambient Background */}
      <div className="login-ambient" />
      
      {/* Theme Toggle */}
      <div className="login-theme-toggle">
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <span className="material-symbols-outlined">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand">
          <BrandLogo variant="login" />
        </div>

        {/* Welcome Text */}
        <div className="login-welcome">
          <h2 className="login-title">Welcome Back</h2>
          <p className="login-subtitle">
            Enterprise Real-Time Attendance &amp; Occupancy Tracking System
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-alert login-alert-error">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form — autocomplete="off" prevents browser from polluting fields between accounts */}
        <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
          <div className="login-field">
            <label className="login-label">Email Address</label>
            <div className="login-input-wrapper">
              <span className="material-symbols-outlined login-input-icon">mail</span>
              <input
                id="login-email"
                type="email"
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoFocus
                autoComplete="off"
                name="eraots-email"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <div className="login-input-wrapper">
              <span className="material-symbols-outlined login-input-icon">lock</span>
              <input
                id="login-password"
                type="password"
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="new-password"
                name="eraots-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="login-spinner" />
                <span>Authenticating</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </form>

      </div>

      {/* Version Footer */}
      <div className="login-footer">
        <span className="login-footer-dot" />
        <span>ERAOTS v1.0.0</span>
      </div>
    </div>
  );
}

