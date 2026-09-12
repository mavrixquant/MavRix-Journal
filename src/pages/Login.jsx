// src/components/auth/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import navLogo from '../assets/navLOGO.png';
import AuthBackground from '../components/common/AuthBackground';
import CustomCursor from '../components/common/CustomCursor';

const authStyles = `
  .auth-wrapper {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;

    min-height: 100vh;
    background:
      radial-gradient(900px 520px at 15% -5%, var(--accent-soft), transparent 60%),
      radial-gradient(800px 500px at 88% 8%, rgba(34,211,238,.06), transparent 60%),
      linear-gradient(180deg, #07090D 0%, #0A0D14 45%, #07090D 100%);
    color: var(--ink-1);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 32px 16px;
    position: relative;
    overflow: hidden;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    cursor: none;
  }
  .auth-wrapper::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px);
    background-size: 72px 72px;
    -webkit-mask-image: radial-gradient(ellipse 80% 55% at 50% 0%, black 30%, transparent 78%);
    mask-image: radial-gradient(ellipse 80% 55% at 50% 0%, black 30%, transparent 78%);
  }
  .auth-particles {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    opacity: .7;
  }
  .auth-orb {
    position: absolute;
    width: 520px; height: 520px;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(245,158,11,.10), transparent 70%);
    pointer-events: none;
    z-index: 0;
    animation: authFloat 9s ease-in-out infinite;
  }
  .auth-back {
    position: absolute;
    top: 24px; left: 24px;
    z-index: 20;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: rgba(15,18,25,.7);
    backdrop-filter: blur(10px);
    color: var(--ink-2);
    text-decoration: none;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    cursor: none;
  }
  .auth-back:hover {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.06);
    transform: translateY(-1px);
  }
  .auth-back svg { display: block; }

  .auth-card {
    position: relative;
    width: 100%;
    max-width: 440px;
    background: linear-gradient(180deg, rgba(18,21,28,.82), rgba(12,16,23,.72));
    backdrop-filter: blur(20px) saturate(140%);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 40px 32px 32px;
    box-shadow:
      0 40px 100px -40px rgba(0,0,0,.9),
      0 0 0 1px var(--accent-soft),
      inset 0 1px 0 rgba(255,255,255,.03);
    z-index: 10;
    animation: authIn .55s cubic-bezier(.2,.8,.25,1);
    overflow: hidden;
  }
  .auth-card::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: authGrad 4s linear infinite;
  }

  .auth-head {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: 26px;
  }
  .auth-head > a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    line-height: 0;
  }
  .auth-logo {
    height: 42px;
    width: auto;
    display: block;
  }
  .auth-eyebrow {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 8px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .auth-eyebrow::before,
  .auth-eyebrow::after {
    content: '';
    width: 12px; height: 1px;
    background: var(--accent-soft2);
  }
  .auth-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 8px;
    letter-spacing: -.02em;
    color: var(--ink-1);
    line-height: 1.15;
  }
  .auth-sub {
    color: var(--ink-2);
    font-size: 13px;
    margin: 0;
    line-height: 1.6;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .01em;
  }

  .input-group {
    position: relative;
    margin-bottom: 14px;
  }
  .input-icon {
    position: absolute !important;
    left: 14px !important;
    top: 39% !important;
    transform: translateY(-50%) !important;
    width: 18px !important;
    height: 18px !important;
    color: var(--ink-3);
    pointer-events: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 0;
    transition: color .2s ease;
  }
  .input-icon svg {
    display: block !important;
    width: 16px !important;
    height: 16px !important;
    flex-shrink: 0;
  }
  .auth-input {
    width: 100%;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    padding: 13px 44px 13px 44px !important;
    color: var(--ink-1);
    font-size: 14px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    line-height: 20px;
    outline: none;
    box-sizing: border-box;
    transition: all .2s ease;
    cursor: none;
  }
  .auth-input::placeholder { color: var(--ink-3); }
  .auth-input:hover { border-color: rgba(255,255,255,.2); }
  .auth-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
    background: rgba(10,13,19,.9);
  }
  .input-group:focus-within .input-icon { color: var(--accent); }

  .toggle-password {
    position: absolute;
    right: 8px;
    top: 39%;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    background: none;
    border: none;
    color: var(--ink-3);
    cursor: none;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all .2s;
    line-height: 0;
  }
  .toggle-password svg { display: block; }
  .toggle-password:hover { color: var(--accent); background: rgba(245,158,11,.08); }

  .btn-submit {
    position: relative;
    width: 100%;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-size: 13.5px;
    font-weight: 700;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .02em;
    padding: 14px;
    border: none;
    border-radius: 11px;
    cursor: none;
    overflow: hidden;
    transition: transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 10px;
    box-shadow:
      0 10px 30px -8px rgba(245,158,11,.55),
      inset 0 1px 0 rgba(255,255,255,.4);
  }
  .btn-submit::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,.3) 50%, transparent 68%);
    animation: authShine 4.2s ease-in-out infinite;
  }
  .btn-submit:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px rgba(245,158,11,.7), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .btn-submit:active:not(:disabled) { transform: translateY(0) scale(.98); }
  .btn-submit:disabled { opacity: .65; cursor: not-allowed; }

  .btn-google {
    width: 100%;
    background: rgba(255,255,255,.035);
    border: 1px solid rgba(255,255,255,.12);
    color: var(--ink-1);
    font-size: 12.5px;
    font-weight: 600;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .02em;
    padding: 13px;
    border-radius: 11px;
    cursor: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    backdrop-filter: blur(8px);
  }
  .btn-google svg { display: block; flex-shrink: 0; }
  .btn-google:hover:not(:disabled) {
    background: rgba(255,255,255,.07);
    border-color: rgba(255,255,255,.24);
    transform: translateY(-1px);
  }
  .btn-google:disabled { opacity: .6; cursor: not-allowed; }

  .divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 22px 0;
  }
  .divider span {
    color: var(--ink-3);
    font-size: 10px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .18em;
    font-weight: 700;
  }
  .divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--line-soft);
  }

  .error-banner {
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.28);
    color: #fca5a5;
    padding: 11px 13px;
    border-radius: 10px;
    font-size: 12px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    line-height: 1.55;
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .error-banner svg { flex-shrink: 0; display: block; }

  .auth-footer {
    text-align: center;
    margin-top: 22px;
    font-size: 13px;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .auth-footer a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 700;
    margin-left: 4px;
    transition: color .2s;
    cursor: none;
  }
  .auth-footer a:hover { color: var(--accent-2); }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(10,13,19,.25);
    border-top-color: #0A0D13;
    border-radius: 50%;
    animation: spin .8s linear infinite;
  }

  @keyframes authFloat {
    0%,100% { transform: translate(-50%, -50%) scale(1); opacity: .9; }
    50%     { transform: translate(-50%, -50%) scale(1.06); opacity: 1; }
  }
  @keyframes authIn {
    from { opacity: 0; transform: translateY(20px) scale(.98); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes authGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes authShine {
    0%,100% { transform: translateX(-130%) skewX(-18deg); }
    55%     { transform: translateX(230%) skewX(-18deg); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .auth-orb, .auth-card::before, .btn-submit::after, .spinner { animation: none !important; }
    .auth-back, .btn-submit, .btn-google, .toggle-password { transition: none !important; }
  }
`;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const emailLower = email.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(auth, emailLower, password);
      if (userCredential.user.emailVerified) {
        navigate('/dashboard');
      } else {
        navigate('/verify-email');
      }
    } catch (err) {
      const msg = err.message.includes('auth/invalid-credential')
        ? 'Invalid email or password.'
        : err.message.replace('Firebase: ', '');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <style>{authStyles}</style>
      <CustomCursor />
      <AuthBackground accent="#F59E0B" />
      <div className="auth-orb" />

      <Link to="/" className="auth-back">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to home
      </Link>

      <div className="auth-card">
        <div className="auth-head">
          <Link to="/">
            <img src={navLogo} alt="Logo" className="auth-logo" />
          </Link>
          <div className="auth-eyebrow">Welcome back</div>
          <h1 className="auth-title">Sign in to your account</h1>
          <p className="auth-sub">Access your trading analytics dashboard</p>
        </div>

        {error && (
          <div className="error-banner">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="email"
              className="auth-input"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <span className="input-icon">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
          </div>

          <div className="input-group">
            <input
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <span className="input-icon">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? <div className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <div className="divider"><span>OR</span></div>

        <button type="button" className="btn-google" onClick={handleGoogleSignIn} disabled={loading}>
          {loading ? (
            <div className="spinner" />
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div className="auth-footer">
          Don't have an account?
          <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
}