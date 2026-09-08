import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase/config';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import navLogo from '../assets/navLOGO.png';

const authStyles = `
  @keyframes pulseGlow {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .auth-wrapper {
    min-height: 100vh;
    background: var(--bg, #0A0D13);
    color: var(--text, #F3F4F6);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 32px 16px;
    position: relative;
    overflow: hidden;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .ambient-glow {
    position: absolute;
    width: 550px;
    height: 550px;
    background: radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(10, 13, 19, 0) 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    animation: pulseGlow 8s ease-in-out infinite;
  }
  .auth-card-modern {
    width: 100%;
    max-width: 480px;
    background: rgba(18, 21, 28, 0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
    border-radius: 20px;
    padding: 40px 32px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1);
    position: relative;
    z-index: 10;
    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .input-group {
    position: relative;
    margin-bottom: 18px;
  }
  .input-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #6B7280;
    pointer-events: none;
    transition: color 0.2s ease;
  }
  .auth-input {
    width: 100%;
    background: rgba(10, 13, 19, 0.6);
    border: 1px solid var(--border-soft, #2A2D35);
    border-radius: 10px;
    padding: 13px 42px 13px 42px;
    color: #fff;
    font-size: 15px;
    outline: none;
    box-sizing: border-box;
    transition: all 0.2s ease;
  }
  .auth-input:focus {
    border-color: var(--amber, #F59E0B);
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
    background: rgba(10, 13, 19, 0.9);
  }
  .auth-input:focus + .input-icon,
  .input-group:focus-within .input-icon {
    color: var(--amber, #F59E0B);
  }
  .toggle-password {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #6B7280;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
  }
  .toggle-password:hover {
    color: #F3F4F6;
  }
  .btn-submit {
    width: 100%;
    background: var(--amber, #F59E0B);
    color: #0A0D13;
    font-size: 16px;
    font-weight: 600;
    font-family: var(--mono, monospace);
    padding: 14px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 10px;
  }
  .btn-submit:hover:not(:disabled) {
    background: #fbbf24;
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(245, 158, 11, 0.35);
  }
  .btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .error-banner {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #FCA5A5;
    padding: 12px;
    border-radius: 8px;
    font-size: 13px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(10, 13, 19, 0.2);
    border-top-color: #0A0D13;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export default function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await updateProfile(userCredential.user, { displayName: fullName });
      navigate('/dashboard');
    } catch (err) {
      const msg = err.message.replace('Firebase: ', '');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <style>{authStyles}</style>
      <div className="ambient-glow" />

      {/* Top Header / Back Button */}
      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 20 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', textDecoration: 'none', fontSize: '14px' }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Home
        </Link>
      </div>

      <div className="auth-card-modern">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link to="/">
            <img src={navLogo} alt="Logo" style={{ height: '42px', marginBottom: '20px' }} />
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            Create Your Account
          </h1>
          <p style={{ color: 'var(--text-dim, #9CA3AF)', fontSize: '0.95rem', margin: 0 }}>
            Start backtesting and discovering your edge today
          </p>
        </div>

        {error && (
          <div className="error-banner">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* First & Last Name row */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <input
                type="text"
                className="auth-input"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <svg className="input-icon" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <input
                type="text"
                className="auth-input"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <svg className="input-icon" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
          </div>

          {/* Email Input */}
          <div className="input-group">
            <input
              type="email"
              className="auth-input"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <svg className="input-icon" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>

          {/* Password Input */}
          <div className="input-group">
            <input
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <svg className="input-icon" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
            >
              {showPassword ? (
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>
              ) : (
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              )}
            </button>
          </div>

          {/* Confirm Password Input */}
          <div className="input-group">
            <input
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <svg className="input-icon" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? <div className="spinner" /> : 'Get Started Free'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#9CA3AF' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--amber, #F59E0B)', textDecoration: 'none', fontWeight: '600' }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}