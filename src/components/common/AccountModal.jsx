// src/components/account/AccountModal.jsx (or wherever it lives)
import React, { useState } from 'react';
import Portal from './Portal';
import Alert from './Alert';
import { useAuth } from '../../context/AuthContext';
import {
  GoogleAuthProvider,
  linkWithPopup,
  unlink,
} from 'firebase/auth';

/* ------------------------------------------------------------------ */
/*  Scoped CSS — matches the rest of the app                           */
/*  Vars live on the overlay so they cascade through the portal.       */
/* ------------------------------------------------------------------ */
const accountModalStyles = `
  .account-modal-overlay {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --win: #22c55e;
    --win-2: #86efac;
    --win-soft: rgba(34,197,94,.10);
    --win-soft2: rgba(34,197,94,.28);
    --loss: #ef4444;
    --loss-2: #fca5a5;
    --loss-soft: rgba(239,68,68,.10);
    --loss-soft2: rgba(239,68,68,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;

    position: fixed;
    inset: 0;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
    overflow-y: auto;
    animation: accountModalFadeIn .18s ease;
  }

  .account-modal-content {
    width: 100%;
    max-width: 620px;
    max-height: calc(100vh - 32px);
    margin: auto;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow:
      0 40px 100px -30px rgba(0,0,0,.95),
      0 0 0 1px var(--accent-soft);
    color: var(--ink-1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    animation: accountModalPopIn .28s cubic-bezier(.2,.8,.25,1);
  }
  .account-modal-content::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: accountModalGrad 4s linear infinite;
    pointer-events: none;
    z-index: 2;
  }

  /* ---------- Header ---------- */
  .account-modal-header {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    position: relative;
  }

  .account-modal-title {
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: var(--ink-1);
    margin: 0;
    letter-spacing: -.01em;
  }
  .account-modal-eyebrow {
    display: block;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-bottom: 4px;
  }

  .account-modal-close {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--ink-2);
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all .2s;
    flex-shrink: 0;
  }
  .account-modal-close:hover {
    color: var(--accent);
    background: rgba(245,158,11,.08);
    border-color: var(--accent-soft2);
  }

  /* ---------- Body (sidebar tabs + pane) ---------- */
  .account-modal-body {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }

  .account-modal-tabs {
    width: 178px;
    border-right: 1px solid var(--line-soft);
    padding: 14px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
    background: rgba(0,0,0,.18);
  }

  .account-modal-tab {
    padding: 9px 14px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    color: var(--ink-2);
    cursor: pointer;
    border: 1px solid transparent;
    border-radius: 8px;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    background: transparent;
    text-align: left;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .account-modal-tab:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.04);
  }
  .account-modal-tab.active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-weight: 700;
    box-shadow:
      0 8px 20px -10px rgba(245,158,11,.6),
      inset 0 1px 0 rgba(255,255,255,.4);
  }
  .account-modal-tab svg { flex-shrink: 0; }

  .account-modal-pane {
    flex: 1 1 0%;
    min-height: 0;
    padding: 22px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .account-modal-pane::-webkit-scrollbar { width: 8px; }
  .account-modal-pane::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }
  .account-modal-pane::-webkit-scrollbar-thumb:hover {
    background: rgba(245,158,11,.35);
  }

  /* ---------- User header banner ---------- */
  .account-user-header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    margin-bottom: 4px;
    border-radius: 14px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
  }

  .account-user-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(245,158,11,.05));
    border: 1px solid var(--accent-soft2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-weight: 700;
    font-size: 17px;
    color: var(--accent);
    object-fit: cover;
    box-shadow: 0 0 24px -8px rgba(245,158,11,.5);
    flex-shrink: 0;
  }

  .account-user-info-meta {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .account-user-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.01em;
    line-height: 1.2;
  }
  .account-user-sub {
    font-size: 11.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    color: var(--ink-2);
    letter-spacing: .01em;
    word-break: break-all;
  }

  /* ---------- Field cards ---------- */
  .account-fields-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .account-field-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
    border-radius: 12px;
    transition: border-color .2s;
  }
  .account-field-card:hover {
    border-color: rgba(255,255,255,.12);
  }

  .account-field-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    color: var(--ink-3);
    text-transform: uppercase;
    letter-spacing: .14em;
    flex-shrink: 0;
  }

  .account-field-value {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    color: var(--ink-1);
    font-weight: 600;
    text-align: right;
    word-break: break-all;
    min-width: 0;
  }

  /* ---------- Verification badge ---------- */
  .account-verified-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 99px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    border: 1px solid;
    white-space: nowrap;
  }
  .account-verified-badge.verified {
    color: #4ade80;
    background: var(--win-soft);
    border-color: var(--win-soft2);
  }
  .account-verified-badge.not-verified {
    color: #f87171;
    background: var(--loss-soft);
    border-color: var(--loss-soft2);
  }

  /* ---------- Provider card ---------- */
  .account-provider-card {
    padding: 16px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .account-provider-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .account-provider-title {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.01em;
  }

  .account-provider-desc {
    font-size: 12px;
    color: var(--ink-2);
    line-height: 1.65;
    margin: 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .01em;
  }

  .account-link-btn {
    padding: 9px 16px;
    border-radius: 10px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    border: 1px solid rgba(255,255,255,.14);
    background: rgba(255,255,255,.035);
    color: var(--ink-1);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    width: fit-content;
    white-space: nowrap;
  }
  .account-link-btn:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.06);
    box-shadow: 0 0 20px -6px rgba(245,158,11,.5);
    transform: translateY(-1px);
  }
  .account-link-btn:active:not(:disabled) { transform: translateY(0) scale(.98); }

  .account-link-btn.unlink {
    border-color: var(--loss-soft2);
    background: rgba(239,68,68,.05);
    color: #f87171;
  }
  .account-link-btn.unlink:hover:not(:disabled) {
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55);
    color: var(--loss-2);
    box-shadow: 0 0 20px -6px rgba(239,68,68,.5);
  }

  .account-link-btn:disabled {
    opacity: .5;
    cursor: not-allowed;
  }

  /* ---------- Error message ---------- */
  .account-error-msg {
    margin-top: 10px;
    padding: 10px 12px;
    background: var(--loss-soft);
    border: 1px solid var(--loss-soft2);
    border-radius: 10px;
    color: #fca5a5;
    font-size: 11.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    line-height: 1.55;
    letter-spacing: .01em;
  }

  /* ---------- Footer ---------- */
  .account-modal-footer {
    border-top: 1px solid var(--line-soft);
    padding: 14px 22px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: rgba(0,0,0,.15);
    flex-shrink: 0;
  }

  .account-modal-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 10px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    border: 1px solid transparent;
    min-width: 84px;
    white-space: nowrap;
  }
  .account-modal-btn:active { transform: translateY(0) scale(.98); }

  .account-modal-btn.cancel {
    background: rgba(255,255,255,.03);
    border-color: rgba(255,255,255,.1);
    color: var(--ink-2);
  }
  .account-modal-btn.cancel:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }

  .account-modal-btn.save {
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    border: none;
    box-shadow:
      0 10px 30px -8px rgba(245,158,11,.55),
      inset 0 1px 0 rgba(255,255,255,.4);
    transition: transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s;
  }
  .account-modal-btn.save::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,.3) 50%, transparent 68%);
    animation: accountModalShine 4.2s ease-in-out infinite;
  }
  .account-modal-btn.save:hover {
    transform: translateY(-2px);
    box-shadow:
      0 16px 42px -10px rgba(245,158,11,.7),
      inset 0 1px 0 rgba(255,255,255,.5);
  }

  /* ---------- Animations ---------- */
  @keyframes accountModalFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes accountModalPopIn {
    from { opacity: 0; transform: translateY(-12px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes accountModalGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes accountModalShine {
    0%,100% { transform: translateX(-130%) skewX(-18deg); }
    55%     { transform: translateX(230%) skewX(-18deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .account-modal-content::before,
    .account-modal-btn.save::after { animation: none !important; }
    .account-modal-btn, .account-link-btn, .account-modal-tab, .account-modal-close {
      transition: none !important;
    }
  }

  @media (max-width: 560px) {
    .account-modal-body { flex-direction: column; }
    .account-modal-tabs {
      width: 100%;
      flex-direction: row;
      border-right: none;
      border-bottom: 1px solid var(--line-soft);
      padding: 10px;
      overflow-x: auto;
    }
    .account-modal-tab { flex: 1; justify-content: center; }
  }
`;

export default function AccountModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  const [showUnlinkAlert, setShowUnlinkAlert] = useState(false);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const isGoogleLinked = user.providerData.some(
    (provider) => provider.providerId === 'google.com'
  );

  const displayName = user.displayName || 'Anonymous User';
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0] || '—';
  const lastName = nameParts.slice(1).join(' ') || '—';
  const initials = (firstName[0] || '') + (lastName[0] || '');

  const handleLinkGoogle = async () => {
    setError('');
    setLinking(true);
    try {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(user, provider);
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    setShowUnlinkAlert(false);
    setError('');
    setUnlinking(true);
    try {
      await unlink(user, 'google.com');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <Portal>
      <style>{accountModalStyles}</style>
      <div
        className="account-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="account-modal-content" role="dialog" aria-modal="true">
          <div className="account-modal-header">
            <div>
              <span className="account-modal-eyebrow">Preferences</span>
              <h2 className="account-modal-title">Account Settings</h2>
            </div>
            <button
              className="account-modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          <div className="account-modal-body">
            <div className="account-modal-tabs">
              <button
                className={`account-modal-tab ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                Overview
              </button>
              <button
                className={`account-modal-tab ${activeTab === 'link' ? 'active' : ''}`}
                onClick={() => setActiveTab('link')}
              >
                Integrations
              </button>
            </div>

            <div className="account-modal-pane">
              {activeTab === 'details' ? (
                <div className="account-fields-grid">
                  <div className="account-user-header">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={displayName} className="account-user-avatar" />
                    ) : (
                      <div className="account-user-avatar">{initials || 'U'}</div>
                    )}
                    <div className="account-user-info-meta">
                      <span className="account-user-name">{displayName}</span>
                      <span className="account-user-sub">{user.email}</span>
                    </div>
                  </div>

                  <div className="account-field-card">
                    <span className="account-field-label">First Name</span>
                    <span className="account-field-value">{firstName}</span>
                  </div>
                  <div className="account-field-card">
                    <span className="account-field-label">Last Name</span>
                    <span className="account-field-value">{lastName}</span>
                  </div>
                  <div className="account-field-card">
                    <span className="account-field-label">Email Address</span>
                    <span className="account-field-value">{user.email || '—'}</span>
                  </div>
                  <div className="account-field-card">
                    <span className="account-field-label">Email Verification</span>
                    <span
                      className={`account-verified-badge ${
                        user.emailVerified ? 'verified' : 'not-verified'
                      }`}
                    >
                      {user.emailVerified ? '✓ Verified' : '✕ Unverified'}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="account-provider-card">
                    <div className="account-provider-header">
                      <svg width="22" height="22" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span className="account-provider-title">Google Account</span>
                    </div>

                    <p className="account-provider-desc">
                      {isGoogleLinked
                        ? 'Your Google account is linked. You can sign in using single sign-on.'
                        : 'Connect your Google account to enable 1-click authentication.'}
                    </p>

                    {isGoogleLinked ? (
                      <button
                        className="account-link-btn unlink"
                        onClick={() => setShowUnlinkAlert(true)}
                        disabled={unlinking}
                      >
                        {unlinking ? 'Unlinking…' : 'Disconnect Google'}
                      </button>
                    ) : (
                      <button
                        className="account-link-btn"
                        onClick={handleLinkGoogle}
                        disabled={linking}
                      >
                        {linking ? 'Connecting…' : 'Connect Google'}
                      </button>
                    )}
                  </div>

                  {error && <div className="account-error-msg">{error}</div>}
                </div>
              )}
            </div>
          </div>

          <div className="account-modal-footer">
            <button className="account-modal-btn cancel" onClick={onClose}>
              Close
            </button>
            <button className="account-modal-btn save" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>

      {showUnlinkAlert && (
        <Alert
          isOpen={showUnlinkAlert}
          type="confirm"
          title="Unlink Google Account?"
          message="Are you sure you want to unlink your Google account? You can link it again later."
          confirmText="Unlink"
          cancelText="Cancel"
          onConfirm={handleUnlinkGoogle}
          onCancel={() => setShowUnlinkAlert(false)}
        />
      )}
    </Portal>
  );
}