import { useState } from 'react';
import { Link, X, CheckCircle2, KeyRound, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import * as authService from '@/features/auth/api';
import * as google from '@/features/auth/google';
import Alert from '@/shared/components/Alert';
import { OtpInput } from '@/shared/ui/otp-input';
import TwoFactorSection from './TwoFactorSection';

function GoogleMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

const PASSWORD_CSS = `
  .pw-modal-overlay {
    position: fixed; inset: 0; z-index: 2000;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    animation: pwFade .18s ease;
  }
  .pw-modal {
    --line: rgba(255,255,255,.085); --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    width: 100%; max-width: 440px; max-height: calc(100vh - 32px);
    display: flex; flex-direction: column;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95), 0 0 0 1px var(--accent-soft);
    color: var(--ink-1); overflow: hidden; position: relative;
    animation: pwPop .28s cubic-bezier(.2,.8,.25,1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .pw-modal-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex; align-items: center; gap: 12px; flex-shrink: 0;
  }
  .pw-modal-head-icon {
    width: 38px; height: 38px; border-radius: 11px;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border: 1px solid var(--accent-soft2);
    color: var(--accent); flex-shrink: 0;
  }
  .pw-modal-head-meta { flex: 1; min-width: 0; }
  .pw-modal-title { margin: 0; font-size: 15px; font-weight: 700; }
  .pw-modal-sub {
    margin: 3px 0 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px; color: var(--ink-3); line-height: 1.5;
  }
  .pw-modal-close {
    width: 30px; height: 30px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 8px; border: none; background: transparent;
    color: var(--ink-2); cursor: pointer; flex-shrink: 0;
  }
  .pw-modal-close:hover:not(:disabled) {
    color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent);
  }
  .pw-modal-close:disabled { opacity: .35; cursor: not-allowed; }
  .pw-modal-body {
    padding: 20px 22px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto;
  }
  .pw-field { display: flex; flex-direction: column; gap: 6px; }
  .pw-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--ink-3);
  }
  .pw-input {
    width: 100%; padding: 10px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: var(--ink-1);
    font-size: 13px; font-family: 'IBM Plex Mono', monospace;
    outline: none; box-sizing: border-box;
  }
  .pw-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }
  .pw-input:disabled { opacity: .55; cursor: not-allowed; }
  .pw-error {
    padding: 10px 12px; border-radius: 10px;
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.28);
    color: #fca5a5;
    font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; line-height: 1.55;
  }
  .pw-forgot-row {
    display: flex; justify-content: space-between; align-items: center;
    gap: 8px;
  }
  .pw-forgot-btn {
    display: inline-flex; align-items: center; gap: 5px;
    background: none; border: none; color: var(--ink-2);
    font-family: 'IBM Plex Mono', monospace; font-size: 11px;
    cursor: pointer; padding: 2px 4px; border-radius: 5px;
  }
  .pw-forgot-btn:hover:not(:disabled) { color: var(--accent); }
  .pw-forgot-btn:disabled { opacity: .5; cursor: not-allowed; }
  .pw-modal-foot {
    padding: 14px 22px; border-top: 1px solid var(--line-soft);
    display: flex; justify-content: flex-end; gap: 10px;
    background: rgba(0,0,0,.15); flex-shrink: 0;
  }
  .pw-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03); color: var(--ink-2);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px; font-weight: 600; cursor: pointer;
  }
  .pw-btn:hover:not(:disabled) {
    color: var(--ink-1); background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
  }
  .pw-btn:disabled { opacity: .45; cursor: not-allowed; }
  .pw-btn-primary {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117; border: none; font-weight: 700;
    box-shadow: 0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent);
  }
  .pw-btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
  @keyframes pwFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pwPop { from { opacity: 0; transform: translateY(-10px) scale(.97); } to { opacity: 1; transform: none; } }
`;

function PasswordModal({
  mode, email, form, setForm, error, saving,
  onClose, onSubmit, onForgot, onResend,
  forgotLoading, resendLoading,
}) {
  if (!mode) return null;
  const isSet = mode === 'set';
  const isChange = mode === 'change';
  const isForgotOtp = mode === 'forgot-otp';
  const isForgotNew = mode === 'forgot-new';

  const title =
    isSet ? 'Set Password'
    : isChange ? 'Change Password'
    : isForgotOtp ? 'Verify Email'
    : 'Set New Password';
  const subtitle =
    isSet ? 'You signed up with Google. Set a password to sign in with email too.'
    : isChange ? 'Enter your current password and choose a new one.'
    : isForgotOtp ? `We sent a 6-digit code to ${email}.`
    : 'Enter a new password for your account. You will be signed out after.';
  const submitLabel =
    isForgotOtp ? 'Verify Code'
    : isSet || isForgotNew ? 'Set Password'
    : 'Change Password';

  const canSubmit = (() => {
    if (saving) return false;
    if (isForgotOtp) return /^\d{6}$/.test(form.otp);
    if (isSet || isForgotNew) return form.newPassword.length >= 6 && form.newPassword === form.confirmPassword;
    if (isChange) return form.oldPassword.length > 0 && form.newPassword.length >= 6 && form.newPassword === form.confirmPassword;
    return false;
  })();

  return (
    <div className="pw-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
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
            <h3 className="pw-modal-title">{title}</h3>
            <p className="pw-modal-sub">{subtitle}</p>
          </div>
          <button type="button" className="pw-modal-close" onClick={onClose} disabled={saving} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="pw-modal-body">
          {error && <div className="pw-error">{error}</div>}

          {isChange && (
            <div className="pw-field">
              <label className="pw-label" htmlFor="pw-old">Current Password</label>
              <input id="pw-old" type="password" className="pw-input"
                value={form.oldPassword} autoComplete="current-password"
                disabled={saving} autoFocus
                onChange={(e) => setForm({ ...form, oldPassword: e.target.value })} />
            </div>
          )}

          {isForgotOtp && (
            <div className="pw-field">
              <label className="pw-label">6-digit code</label>
              <OtpInput value={form.otp} onChange={(v) => setForm({ ...form, otp: v })} length={6} disabled={saving} autoFocus />
            </div>
          )}

          {(isSet || isChange || isForgotNew) && (
            <>
              <div className="pw-field">
                <label className="pw-label" htmlFor="pw-new">New Password</label>
                <input id="pw-new" type="password" className="pw-input"
                  value={form.newPassword} autoComplete="new-password"
                  placeholder="At least 6 characters"
                  disabled={saving} autoFocus={isForgotNew || isSet}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
              </div>
              <div className="pw-field">
                <label className="pw-label" htmlFor="pw-confirm">Confirm New Password</label>
                <input id="pw-confirm" type="password" className="pw-input"
                  value={form.confirmPassword} autoComplete="new-password"
                  disabled={saving}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
              </div>
            </>
          )}

          {isChange && (
            <div className="pw-forgot-row">
              <button type="button" className="pw-forgot-btn" onClick={onForgot} disabled={forgotLoading || saving}>
                {forgotLoading ? <><Loader2 size={11} className="settings-spin" /> Sending…</> : 'Forgot current password?'}
              </button>
            </div>
          )}

          {isForgotOtp && (
            <div className="pw-forgot-row">
              <span />
              <button type="button" className="pw-forgot-btn" onClick={onResend} disabled={resendLoading || saving}>
                {resendLoading ? <><Loader2 size={11} className="settings-spin" /> Sending…</> : 'Resend code'}
              </button>
            </div>
          )}
        </div>

        <div className="pw-modal-foot">
          <button type="button" className="pw-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="pw-btn pw-btn-primary" disabled={!canSubmit}>
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SecurityPanel() {
  const { user, refreshUser, logout } = useAuth();

  const [showUnlinkAlert, setShowUnlinkAlert] = useState(false);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState('');

  const [passwordModal, setPasswordModal] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '', otp: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  if (!user) return null;

  const isGoogleLinked = user.providerData.some((p) => p.providerId === 'google.com');
  const hasPassword = !!user.hasPassword;

  const resetForm = () => setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '', otp: '' });

  const handleLinkGoogle = async () => {
    setError(''); setLinking(true);
    try {
      const accessToken = await google.signIn();
      await authService.linkGoogle(accessToken);
      window.location.reload();
    } catch (err) { setError(err?.message || 'Could not link Google account'); }
    finally { setLinking(false); }
  };

  const handleUnlinkGoogle = async () => {
    setShowUnlinkAlert(false); setError(''); setUnlinking(true);
    try {
      await authService.unlinkGoogle();
      window.location.reload();
    } catch (err) { setError(err?.message || 'Could not unlink Google account'); }
    finally { setUnlinking(false); }
  };

  const openSetPassword = () => { resetForm(); setPasswordError(''); setPasswordModal('set'); };
  const openChangePassword = () => { resetForm(); setPasswordError(''); setPasswordModal('change'); };
  const closePasswordModal = () => { if (passwordSaving) return; setPasswordModal(null); setPasswordError(''); };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    setPasswordError(''); setResetLoading(true);
    try {
      await authService.requestPasswordReset(user.email);
      setPasswordForm((f) => ({ ...f, otp: '', newPassword: '', confirmPassword: '' }));
      setPasswordModal('forgot-otp');
    } catch (err) { setPasswordError(err?.message || 'Could not send reset email.'); }
    finally { setResetLoading(false); }
  };

  const handleResendCode = async () => {
    if (!user?.email) return;
    setPasswordError(''); setResendLoading(true);
    try {
      await authService.requestPasswordReset(user.email);
      setPasswordForm((f) => ({ ...f, otp: '' }));
      toast.success('A new code is on its way.');
    } catch (err) { setPasswordError(err?.message || 'Could not resend code.'); }
    finally { setResendLoading(false); }
  };

  const handlePasswordSubmit = async () => {
    setPasswordError('');
    if (passwordModal === 'set' || passwordModal === 'change' || passwordModal === 'forgot-new') {
      if (passwordForm.newPassword.length < 6) { setPasswordError('Password must be at least 6 characters.'); return; }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) { setPasswordError('Passwords do not match.'); return; }
    }
    if (passwordModal === 'change' && !passwordForm.oldPassword) { setPasswordError('Current password is required.'); return; }
    if (passwordModal === 'forgot-otp' && !/^\d{6}$/.test(passwordForm.otp)) { setPasswordError('Enter the 6-digit code.'); return; }

    setPasswordSaving(true);
    try {
      if (passwordModal === 'set') {
        await authService.setPassword(passwordForm.newPassword);
        toast.success('Password set successfully');
        await refreshUser(); setPasswordModal(null);
      } else if (passwordModal === 'change') {
        await authService.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
        toast.success('Password changed successfully');
        await refreshUser(); setPasswordModal(null);
      } else if (passwordModal === 'forgot-otp') {
        await authService.verifyResetOtp(user.email, passwordForm.otp);
        setPasswordForm((f) => ({ ...f, newPassword: '', confirmPassword: '' }));
        setPasswordModal('forgot-new');
      } else if (passwordModal === 'forgot-new') {
        await authService.resetPassword(user.email, passwordForm.otp, passwordForm.newPassword);
        toast.success('Password reset. Please sign in with your new password.');
        setPasswordModal(null);
        await logout();
      }
    } catch (err) { setPasswordError(err?.message || 'Something went wrong.'); }
    finally { setPasswordSaving(false); }
  };

  return (
    <div className="settings-account">
      <section className="settings-section">
        <h4 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={11} />
          Password
        </h4>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
            className={hasPassword ? 'settings-btn' : 'settings-btn settings-btn-primary'}
            onClick={hasPassword ? openChangePassword : openSetPassword}
          >
            <KeyRound size={12} />
            {hasPassword ? 'Change Password' : 'Set Password'}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Connected Accounts</h4>

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

      <TwoFactorSection />

      <PasswordModal
        mode={passwordModal}
        email={user.email}
        form={passwordForm}
        setForm={setPasswordForm}
        error={passwordError}
        saving={passwordSaving}
        onClose={closePasswordModal}
        onSubmit={handlePasswordSubmit}
        onForgot={handleForgotPassword}
        onResend={handleResendCode}
        forgotLoading={resetLoading}
        resendLoading={resendLoading}
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