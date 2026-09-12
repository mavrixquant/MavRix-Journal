// src/components/auth/EmailVerification.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import AuthBackground from '../components/common/AuthBackground';
import CustomCursor from '../components/common/CustomCursor';

const styles = `
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

  .auth-card {
    position: relative;
    width: 100%;
    max-width: 440px;
    background: linear-gradient(180deg, rgba(18,21,28,.82), rgba(12,16,23,.72));
    backdrop-filter: blur(20px) saturate(140%);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 44px 32px 32px;
    box-shadow:
      0 40px 100px -40px rgba(0,0,0,.9),
      0 0 0 1px var(--accent-soft),
      inset 0 1px 0 rgba(255,255,255,.03);
    z-index: 10;
    text-align: center;
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

  .verify-icon-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    margin: 0 auto 24px;
  }
  .verify-icon-ring {
    position: absolute;
    inset: 0;
    border-radius: 24px;
    background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(245,158,11,.05));
    border: 1px solid var(--accent-soft2);
    animation: verifyPulse 2.4s ease-in-out infinite;
  }
  .verify-icon-inner {
    position: relative;
    z-index: 1;
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 0;
  }
  .verify-icon-inner svg { display: block; }

  .auth-eyebrow {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 10px;
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
    font-size: 1.65rem;
    font-weight: 700;
    margin: 0 0 12px;
    letter-spacing: -.02em;
    color: var(--ink-1);
    line-height: 1.2;
  }
  .auth-sub {
    color: var(--ink-2);
    font-size: 13px;
    margin: 0 0 20px;
    line-height: 1.65;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .01em;
  }
  .email-pill {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 99px;
    background: var(--accent-soft);
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: .02em;
    margin-bottom: 26px;
    word-break: break-all;
    max-width: 100%;
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
    text-align: left;
  }
  .error-banner svg { flex-shrink: 0; display: block; }

  .btn-primary {
    position: relative;
    width: 100%;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-size: 13px;
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
    margin-bottom: 10px;
    box-shadow:
      0 10px 30px -8px rgba(245,158,11,.55),
      inset 0 1px 0 rgba(255,255,255,.4);
  }
  .btn-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,.3) 50%, transparent 68%);
    animation: authShine 4.2s linear infinite;
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px rgba(245,158,11,.7), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .btn-primary:active:not(:disabled) { transform: translateY(0) scale(.98); }
  .btn-primary:disabled { opacity: .6; cursor: not-allowed; }

  .btn-secondary {
    width: 100%;
    background: rgba(255,255,255,.035);
    border: 1px solid rgba(255,255,255,.12);
    color: var(--ink-1);
    font-size: 12px;
    font-weight: 600;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .02em;
    padding: 12px;
    border-radius: 11px;
    cursor: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    margin-bottom: 10px;
    backdrop-filter: blur(8px);
  }
  .btn-secondary svg { display: block; flex-shrink: 0; }
  .btn-secondary:hover:not(:disabled) {
    background: rgba(255,255,255,.07);
    border-color: rgba(255,255,255,.24);
    transform: translateY(-1px);
  }
  .btn-secondary:disabled { opacity: .55; cursor: not-allowed; }

  .btn-danger-ghost {
    width: 100%;
    background: transparent;
    border: 1px solid transparent;
    color: var(--ink-3);
    font-size: 11.5px;
    font-weight: 600;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .02em;
    padding: 10px;
    border-radius: 11px;
    cursor: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all .2s;
    margin-top: 4px;
  }
  .btn-danger-ghost:hover {
    color: #f87171;
    background: rgba(239,68,68,.06);
    border-color: rgba(239,68,68,.28);
  }

  .verify-hint {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--ink-3);
    line-height: 1.65;
    margin: 20px 0 0;
    letter-spacing: .01em;
  }
  .verify-hint b { color: var(--ink-2); font-weight: 700; }

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
  @keyframes verifyPulse {
    0%,100% { transform: scale(1); opacity: .9; }
    50%     { transform: scale(1.06); opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .auth-orb, .auth-card::before, .btn-primary::after, .verify-icon-ring { animation: none !important; }
    .btn-primary, .btn-secondary, .btn-danger-ghost { transition: none !important; }
  }
`;

export default function EmailVerification() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      if (user) await sendEmailVerification(user);
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleVerifiedClick = () => {
    window.location.reload();
  };

  return (
    <div className="auth-wrapper">
      <style>{styles}</style>
      <CustomCursor />
      <AuthBackground accent="#F59E0B" />
      <div className="auth-orb" />

      <div className="auth-card">
        <div className="verify-icon-wrap">
          <div className="verify-icon-ring" />
          <span className="verify-icon-inner">
            <svg width="34" height="34" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </span>
        </div>

        <div className="auth-eyebrow">One step left</div>
        <h1 className="auth-title">Verify your email</h1>
        <p className="auth-sub">We sent a verification link to</p>

        {user?.email && (
          <div className="email-pill">{user.email}</div>
        )}

        {error && (
          <div className="error-banner">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <button className="btn-primary" onClick={handleVerifiedClick}>
          I've verified — continue
        </button>

        <button className="btn-secondary" onClick={handleResend} disabled={resending}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 11a8 8 0 1 1 2 5.3M3 18v-5h5" />
          </svg>
          {resending ? 'Resending…' : 'Resend verification email'}
        </button>

        <button className="btn-danger-ghost" onClick={handleLogout}>
          Log out
        </button>

        <p className="verify-hint">
          Didn't receive the email? Check your <b>spam folder</b>, or make sure{' '}
          <b>{(user?.email || '').split('@')[0]}</b> is spelled correctly.
        </p>
      </div>
    </div>
  );
}