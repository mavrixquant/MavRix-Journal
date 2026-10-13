// apps/web/src/app/layout/Settings/panels/AccountPanel.jsx
//
// Body of the "Account" tab inside the Settings modal.
// Migrated from the original account settings modal so behaviour and
// visuals stay identical — profile card, verification badge, and the
// Google link/unlink flow (with reload-on-success).

import { useState } from 'react';
import { Link, X, CheckCircle2 } from 'lucide-react';

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

export default function AccountPanel() {
  const { user } = useAuth();

  const [showUnlinkAlert, setShowUnlinkAlert] = useState(false);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const isGoogleLinked = user.providerData.some(
    (p) => p.providerId === 'google.com'
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
      const accessToken = await google.signIn();
      await authService.linkGoogle(accessToken);
      // Force a fresh user from the server so providerData updates.
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

  return (
    <div className="settings-account">
      {/* ---------- Profile header ---------- */}
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

      {/* ---------- Profile ---------- */}
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

      {/* ---------- Connected accounts ---------- */}
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

      {/* ---------- Unlink confirm ---------- */}
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