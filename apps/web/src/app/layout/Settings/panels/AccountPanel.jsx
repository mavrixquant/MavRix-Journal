import { useState } from 'react';
import { Link, X, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import * as authService from '@/features/auth/api';
import * as google from '@/features/auth/google';
import Alert from '@/shared/components/Alert';

function GoogleMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

const PASSWORD_CSS = `
  .pw-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: pwFade .18s ease;
  }
  .pw-modal {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    width: 100%;
    max-width: 440px;
    max-height: calc(100vh - 32px);
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95), 0 0 0 1px var(--accent-soft);
    color: var(--ink-1);
    overflow: hidden;
    position: relative;
    animation: pwPop .28s cubic-bezier(.2,.8,.25,1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .pw-modal::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: pwGrad 4s linear infinite;
  }
  .pw-modal-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .pw-modal-head-icon {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    flex-shrink: 0;
  }
  .pw-modal-head-meta {
    flex: 1;
    min-width: 0;
  }
  .pw-modal-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -.01em;
  }
  .pw-modal-sub {
    margin: 3px 0 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    letter-spacing: .02em;
    line-height: 1.5;
  }
  .pw-modal-close {
    width: 30px;
    height: 30px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
    transition: all .2s;
    flex-shrink: 0;
  }
  .pw-modal-close:hover:not(:disabled) {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }
  .pw-modal-close:disabled { opacity: .35; cursor: not-allowed; }

  .pw-modal-body {
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
  }
  .pw-field { display: flex; flex-direction: column; gap: 6px; }
  .pw-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .pw-input {
    width: 100%;
    padding: 10px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: var(--ink-1);
    font-size: 13px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    outline: none;
    box-sizing: border-box;
    transition: all .2s;
  }
  .pw-input::placeholder { color: var(--ink-3); }
  .pw-input:hover:not(:disabled) { border-color: rgba(255,255,255,.2); }
  .pw-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }
  .pw-input:disabled { opacity: .55; cursor: not-allowed; }

  .pw-error {
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.28);
    color: #fca5a5;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    line-height: 1.55;
  }

  .pw-forgot-row {
    display: flex;
    justify-content: flex-end;
    margin-top: -4px;
  }
  .pw-forgot-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: none;
    border: none;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 5px;
    transition: color .18s;
  }
  .pw-forgot-btn:hover:not(:disabled) { color: var(--accent); }
  .pw-forgot-btn:disabled { opacity: .5; cursor: not-allowed; }

  .pw-modal-foot {
    padding: 14px 22px;
    border-top: 1px solid var(--line-soft);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: rgba(0,0,0,.15);
    flex-shrink: 0;
  }
  .pw-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .2s;
    white-space: nowrap;
  }
  .pw-btn:hover:not(:disabled) {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
  }
  .pw-btn:disabled { opacity: .45; cursor: not-allowed; }
  .pw-btn-primary {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    border: none;
    font-weight: 700;
    box-shadow: 0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent),
                inset 0 1px 0 rgba(255,255,255,.4);
  }
  .pw-btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 16px 42px -10px color-mix(in srgb, var(--accent) 70%, transparent),
                inset 0 1px 0 rgba(255,255,255,.5);
  }
  .pw-btn-primary:disabled {
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 32%, transparent), color-mix(in srgb, var(--accent-2) 28%, transparent));
    color: rgba(13,17,23,.55);
    box-shadow: none;
  }
  @keyframes pwFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pwPop {
    from { opacity: 0; transform: translateY(-10px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes pwGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pw-modal, .pw-modal::before { animation: none !important; }
    .pw-btn, .pw-btn-primary, .pw-modal-close, .pw-forgot-btn { transition: none !important; }
  }
`;

function PasswordModal({
  mode,
  form,
  setForm,
  error,
  saving,
  onClose,
  onSubmit,
  onForgot,
  forgotLoading,
}) {
  if (!mode) return null;
  const isChange = mode === 'change';

  return (
    <div
      className="pw-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <style>{PASSWORD_CSS}</style>
      <form
        className="pw-modal"
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        role="dialog"
        aria-modal="true"
      >
        <div className="pw-modal-head">
          <div className="pw-modal-head-icon"><KeyRound size={17} /></div>
          <div className="pw-modal-head-meta">
            <h3 className="pw-modal-title">
              {isChange ? 'Change Password' : 'Set Password'}
            </h3>
            <p className="pw-modal-sub">
              {isChange
                ? 'Enter your current password and choose a new one.'
                : 'You signed up with Google. Set a password to sign in with email too.'}
            </p>
          </div>
          <button
            type="button"
            className="pw-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="pw-modal-body">
          {error && <div className="pw-error">{error}</div>}

          {isChange && (
            <div className="pw-field">
              <label className="pw-label" htmlFor="pw-old">Current Password</label>
              <input
                id="pw-old"
                type="password"
                className="pw-input"
                value={form.oldPassword}
                autoComplete="current-password"
                disabled={saving}
                autoFocus
                onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
              />
            </div>
          )}

          <div className="pw-field">
            <label className="pw-label" htmlFor="pw-new">New Password</label>
            <input
              id="pw-new"
              type="password"
              className="pw-input"
              value={form.newPassword}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              disabled={saving}
              autoFocus={!isChange}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
          </div>

          <div className="pw-field">
            <label className="pw-label" htmlFor="pw-confirm">Confirm New Password</label>
            <input
              id="pw-confirm"
              type="password"
              className="pw-input"
              value={form.confirmPassword}
              autoComplete="new-password"
              disabled={saving}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
          </div>

          {isChange && (
            <div className="pw-forgot-row">
              <button
                type="button"
                className="pw-forgot-btn"
                onClick={onForgot}
                disabled={forgotLoading || saving}
              >
                {forgotLoading
                  ? <><Loader2 size={11} className="settings-spin" /> Sending…</>
                  : 'Forgot current password?'}
              </button>
            </div>
          )}
        </div>

        <div className="pw-modal-foot">
          <button type="button" className="pw-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="pw-btn pw-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : (isChange ? 'Change Password' : 'Set Password')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AccountPanel() {
  const { user, refreshUser } = useAuth();

  const [showUnlinkAlert, setShowUnlinkAlert] = useState(false);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState('');

  const [passwordModal, setPasswordModal] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  if (!user) return null;

  const isGoogleLinked = user.providerData.some(
    (p) => p.providerId === 'google.com'
  );
  const hasPassword = !!user.hasPassword;

  const displayName = user.displayName || 'Anonymous User';
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0] || '—';
  const lastName = nameParts.slice(1).join(' ') || '—';
  const initials = (firstName[0] || '') + (lastName[0] || '');

  const handleLinkGoogle = async () => {
    setError('');
    setLinking(true);
    try {
      const accessToken = await google.signIn();
      await authService.linkGoogle(accessToken);
      window.location.reload();
    } catch (err) {
      setError(err?.message || 'Could not link Google account');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    setShowUnlinkAlert(false);
    setError('');
    setUnlinking(true);
    try {
      await authService.unlinkGoogle();
      window.location.reload();
    } catch (err) {
      setError(err?.message || 'Could not unlink Google account');
    } finally {
      setUnlinking(false);
    }
  };

  const openSetPassword = () => {
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setPasswordModal('set');
  };

  const openChangePassword = () => {
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setPasswordModal('change');
  };

  const closePasswordModal = () => {
    if (passwordSaving) return;
    setPasswordModal(null);
    setPasswordError('');
  };

  const handlePasswordSubmit = async () => {
    setPasswordError('');
    const { oldPassword, newPassword, confirmPassword } = passwordForm;

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (passwordModal === 'change' && !oldPassword) {
      setPasswordError('Current password is required.');
      return;
    }

    setPasswordSaving(true);
    try {
      if (passwordModal === 'set') {
        await authService.setPassword(newPassword);
        toast.success('Password set successfully');
      } else {
        await authService.changePassword(oldPassword, newPassword);
        toast.success('Password changed successfully');
      }
      await refreshUser();
      setPasswordModal(null);
    } catch (err) {
      setPasswordError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    try {
      await authService.requestPasswordReset(user.email);
      toast.success('Reset email sent', {
        description:
          'Open the link in your inbox to reset. If you stay logged in, you may need to sign out first.',
      });
    } catch (err) {
      toast.error(err?.message || 'Could not send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="settings-account">
      <div className="settings-account-head">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={displayName}
            className="settings-account-avatar"
          />
        ) : (
          <div className="settings-account-avatar">{initials || 'U'}</div>
        )}
        <div className="settings-account-headmeta">
          <span className="settings-account-name">{displayName}</span>
          <span className="settings-account-email">{user.email}</span>
        </div>
      </div>

      <section className="settings-section">
        <h4 className="settings-section-title">Profile</h4>

        <div className="settings-field-row">
          <span className="settings-field-label">First Name</span>
          <span className="settings-field-value">{firstName}</span>
        </div>
        <div className="settings-field-row">
          <span className="settings-field-label">Last Name</span>
          <span className="settings-field-value">{lastName}</span>
        </div>
        <div className="settings-field-row">
          <span className="settings-field-label">Username</span>
          <span className="settings-field-value">
            {user.username ? '@' + user.username : 'Not set'}
          </span>
        </div>
        <div className="settings-field-row">
          <span className="settings-field-label">Email Address</span>
          <span className="settings-field-value">{user.email}</span>
        </div>
        <div className="settings-field-row">
          <span className="settings-field-label">Email Verification</span>
          <span
            className={`settings-verified-badge ${
              user.emailVerified ? 'is-verified' : 'is-unverified'
            }`}
          >
            {user.emailVerified ? '✓ Verified' : '✕ Unverified'}
          </span>
        </div>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Password</h4>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">
              {hasPassword ? 'Change your password' : 'Set a password'}
            </span>
            <span className="settings-options-desc">
              {hasPassword
                ? 'Update the password used to sign in with email.'
                : 'You signed up with Google. Set a password to also sign in with email.'}
            </span>
          </div>
          <button
            type="button"
            className={
              hasPassword
                ? 'settings-btn'
                : 'settings-btn settings-btn-primary'
            }
            onClick={hasPassword ? openChangePassword : openSetPassword}
          >
            <KeyRound size={12} />
            {hasPassword ? 'Change Password' : 'Set Password'}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Connected Accounts</h4>

        <div className="settings-provider-card">
          <div className="settings-provider-head">
            <GoogleMark />
            <span className="settings-provider-name">Google</span>
            {isGoogleLinked && (
              <span className="settings-provider-pill is-connected">
                <CheckCircle2 size={11} /> Connected
              </span>
            )}
          </div>

          <p className="settings-provider-desc">
            {isGoogleLinked
              ? 'Your Google account is linked. You can sign in using single sign-on.'
              : 'Connect your Google account to enable 1-click authentication.'}
          </p>

          {isGoogleLinked ? (
            <button
              type="button"
              className="settings-btn settings-btn-danger"
              onClick={() => setShowUnlinkAlert(true)}
              disabled={unlinking}
            >
              <X size={12} />
              {unlinking ? 'Unlinking…' : 'Disconnect Google'}
            </button>
          ) : (
            <button
              type="button"
              className="settings-btn settings-btn-primary"
              onClick={handleLinkGoogle}
              disabled={linking}
            >
              <Link size={12} />
              {linking ? 'Connecting…' : 'Connect Google'}
            </button>
          )}
        </div>

        {error && <div className="settings-error">{error}</div>}
      </section>

      <PasswordModal
        mode={passwordModal}
        form={passwordForm}
        setForm={setPasswordForm}
        error={passwordError}
        saving={passwordSaving}
        onClose={closePasswordModal}
        onSubmit={handlePasswordSubmit}
        onForgot={handleForgotPassword}
        forgotLoading={resetLoading}
      />

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
    </div>
  );
}