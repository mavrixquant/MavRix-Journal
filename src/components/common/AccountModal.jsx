import React, { useState } from 'react';
import Portal from './Portal';
import Alert from './Alert';
import { useAuth } from '../../context/AuthContext';
import {
  GoogleAuthProvider,
  linkWithPopup,
  unlink,
} from 'firebase/auth';

const accountModalStyles = `
  @keyframes accountModalFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes accountModalPopIn {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .account-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: accountModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .account-modal-content {
    background: var(--panel, #12161f);
    border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.1));
    border-radius: 16px;
    width: 90%;
    max-width: 620px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.7);
    position: relative;
    overflow: hidden;
    animation: accountModalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .account-modal-header {
    padding: 20px 24px 16px 24px;
    border-bottom: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .account-modal-title {
    font-family: var(--disp, system-ui, -apple-system, sans-serif);
    font-size: 16px;
    font-weight: 600;
    color: var(--text, #f3f4f6);
    margin: 0;
    letter-spacing: -0.01em;
  }

  .account-modal-close {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--text-dim, #9ca3af);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .account-modal-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text, #ffffff);
    border-color: var(--border-soft, rgba(255, 255, 255, 0.1));
  }

  .account-modal-body {
    display: flex;
    flex: 1;
    min-height: 320px;
    overflow: hidden;
  }

  .account-modal-tabs {
    width: 170px;
    border-right: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
    background: var(--panel-2, rgba(255, 255, 255, 0.02));
  }

  .account-modal-tab {
    padding: 10px 14px;
    font-family: var(--mono, monospace);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-dim, #9ca3af);
    cursor: pointer;
    border: none;
    border-radius: 8px;
    transition: all 0.15s ease;
    background: transparent;
    text-align: left;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .account-modal-tab:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text, #f3f4f6);
  }

  .account-modal-tab.active {
    background: var(--amber, #ffb020);
    color: #0a0d13;
    font-weight: 600;
  }

  .account-modal-pane {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
  }

  /* User Header Banner */
  .account-user-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding-bottom: 20px;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border-soft, rgba(255, 255, 255, 0.06));
  }

  .account-user-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--panel-2, rgba(255, 255, 255, 0.08));
    border: 2px solid var(--border-soft, rgba(255, 255, 255, 0.1));
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--mono, monospace);
    font-weight: 700;
    font-size: 16px;
    color: var(--amber, #ffb020);
    object-fit: cover;
  }

  .account-user-info-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .account-user-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text, #f3f4f6);
  }

  .account-user-sub {
    font-size: 12px;
    font-family: var(--mono, monospace);
    color: var(--text-dim, #9ca3af);
  }

  /* Key-Value Field Cards */
  .account-fields-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .account-field-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: rgba(0, 0, 0, 0.15);
    border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.05));
    border-radius: 10px;
  }

  .account-field-label {
    font-family: var(--mono, monospace);
    font-size: 11px;
    color: var(--text-faint, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .account-field-value {
    font-family: var(--mono, monospace);
    font-size: 13px;
    color: var(--text, #f3f4f6);
    font-weight: 500;
  }

  .account-verified-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-family: var(--mono, monospace);
    font-weight: 600;
  }

  .account-verified-badge.verified {
    background: var(--win-dim, rgba(16, 185, 129, 0.12));
    color: var(--win, #10b981);
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  .account-verified-badge.not-verified {
    background: var(--loss-dim, rgba(239, 68, 68, 0.12));
    color: var(--loss, #ef4444);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  /* Account Link Card */
  .account-provider-card {
    background: rgba(0, 0, 0, 0.15);
    border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.06));
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .account-provider-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .account-provider-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text, #f3f4f6);
  }

  .account-provider-desc {
    font-size: 12px;
    color: var(--text-dim, #9ca3af);
    line-height: 1.5;
    margin: 0;
  }

  .account-link-btn {
    padding: 10px 18px;
    border-radius: 8px;
    font-family: var(--mono, monospace);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.15));
    background: rgba(255, 255, 255, 0.05);
    color: var(--text, #f3f4f6);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: fit-content;
  }

  .account-link-btn:hover:not(:disabled) {
    border-color: var(--amber, #ffb020);
    color: var(--amber, #ffb020);
    background: rgba(255, 176, 32, 0.05);
  }

  .account-link-btn.unlink {
    border-color: rgba(239, 68, 68, 0.3);
    color: var(--loss, #ef4444);
    background: rgba(239, 68, 68, 0.05);
  }

  .account-link-btn.unlink:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.15);
    border-color: var(--loss, #ef4444);
  }

  .account-link-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .account-error-msg {
    color: var(--loss, #ef4444);
    font-size: 12px;
    font-family: var(--mono, monospace);
    margin-top: 12px;
    padding: 8px 12px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 6px;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .account-modal-footer {
    border-top: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
    padding: 16px 24px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: var(--panel-2, rgba(0, 0, 0, 0.1));
  }

  .account-modal-btn {
    padding: 8px 18px;
    border-radius: 8px;
    font-family: var(--mono, monospace);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
  }

  .account-modal-btn.save {
    background: var(--amber, #ffb020);
    color: #0a0d13;
  }

  .account-modal-btn.save:hover {
    filter: brightness(1.1);
  }

  .account-modal-btn.cancel {
    background: transparent;
    color: var(--text-dim, #9ca3af);
    border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.1));
  }

  .account-modal-btn.cancel:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text, #f3f4f6);
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
        <div className="account-modal-content">
          <div className="account-modal-header">
            <h2 className="account-modal-title">Account Settings</h2>
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
                <div>
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

                  <div className="account-fields-grid">
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
                </div>
              ) : (
                <div>
                  <div className="account-provider-card">
                    <div className="account-provider-header">
                      {/* Google Icon */}
                      <svg width="20" height="20" viewBox="0 0 24 24">
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
                        {unlinking ? 'Unlinking...' : 'Disconnect Google'}
                      </button>
                    ) : (
                      <button
                        className="account-link-btn"
                        onClick={handleLinkGoogle}
                        disabled={linking}
                      >
                        {linking ? 'Connecting...' : 'Connect Google'}
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