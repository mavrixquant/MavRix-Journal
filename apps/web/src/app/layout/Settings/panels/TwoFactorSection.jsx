import { useEffect, useState } from 'react';
import {
  ShieldCheck, ShieldOff, Smartphone, Mail, KeyRound, Loader2,
  Copy, Check, Download,
} from 'lucide-react';
import { toast } from 'sonner';

import * as authService from '@/features/auth/api';
import Portal from '@/shared/components/Portal';
import { OtpInput } from '@/shared/ui/otp-input';
import Alert from '@/shared/components/Alert';

// ---------------------------------------------------------------------------
// Small modal shell shared by every 2FA dialog
// ---------------------------------------------------------------------------
function TwoFaModal({ title, subtitle, onClose, children, busy, footer }) {
  if (!onClose) return null;
  return (
    <Portal>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(4,6,9,.72)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
        onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
      >
        <div
          style={{
            width: '100%', maxWidth: 480,
            background: 'linear-gradient(180deg, #12161F, #0C1017)',
            border: '1px solid rgba(255,255,255,.085)',
            borderRadius: 16,
            color: '#E7E9EE',
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            overflow: 'hidden',
            boxShadow: '0 40px 100px -30px rgba(0,0,0,.95), 0 0 0 1px var(--accent-soft)',
          }}
        >
          <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
            {subtitle && (
              <p style={{ margin: '4px 0 0', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: '#8892A3' }}>
                {subtitle}
              </p>
            )}
          </div>
          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {children}
          </div>
          {footer && (
            <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,.05)', background: 'rgba(0,0,0,.15)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

function ModalBtn({ children, variant = 'ghost', onClick, disabled, loading }) {
  const isPrimary = variant === 'primary';
  const isDanger  = variant === 'danger';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: '9px 16px', borderRadius: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11.5, fontWeight: 600, letterSpacing: '.02em',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        border: isPrimary ? 'none' : isDanger ? '1px solid rgba(239,68,68,.32)' : '1px solid rgba(255,255,255,.1)',
        background: isPrimary
          ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
          : isDanger
            ? 'rgba(239,68,68,.05)'
            : 'rgba(255,255,255,.03)',
        color: isPrimary ? '#0D1117' : isDanger ? '#f87171' : '#8892A3',
        fontWeight: isPrimary ? 700 : 600,
        transition: 'all .2s',
        whiteSpace: 'nowrap',
      }}
    >
      {loading && <Loader2 size={12} className="settings-spin" />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// TOTP setup modal
// ---------------------------------------------------------------------------
function TotpSetupModal({ onClose, onDone }) {
  const [step, setStep] = useState('loading'); // loading | scan | codes
  const [data, setData] = useState(null);      // { qrDataUrl, secret }
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await authService.setupTotp();
        setData(r);
        setStep('scan');
      } catch (err) {
        setError(err?.message || 'Could not start TOTP setup');
        setStep('scan');
      }
    })();
  }, []);

  const handleConfirm = async () => {
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    setBusy(true);
    setError('');
    try {
      const r = await authService.confirmTotp(code);
      setBackupCodes(r.backupCodes || []);
      setStep('codes');
    } catch (err) {
      setError(err?.message || 'Incorrect code');
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    if (!data?.secret) return;
    try { await navigator.clipboard.writeText(data.secret); toast.success('Secret copied'); }
    catch { toast.error('Copy failed'); }
  };

  const downloadCodes = () => {
    const text = `MavRix Journal — 2FA backup codes\nGenerated: ${new Date().toISOString()}\n\n${backupCodes.join('\n')}\n\nStore these somewhere safe. Each code can only be used once.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mavrix-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <TwoFaModal
      title={step === 'codes' ? 'Save your backup codes' : 'Set up authenticator'}
      subtitle={
        step === 'scan'
          ? 'Scan the QR with Google Authenticator, 1Password, Authy, etc.'
          : step === 'codes'
            ? 'Each code works once. Store them offline.'
            : 'Loading…'
      }
      onClose={step === 'codes' ? onDone : onClose}
      busy={busy}
      footer={
        step === 'scan' ? (
          <>
            <ModalBtn onClick={onClose} disabled={busy}>Cancel</ModalBtn>
            <ModalBtn variant="primary" onClick={handleConfirm} loading={busy}>
              Verify & enable
            </ModalBtn>
          </>
        ) : step === 'codes' ? (
          <>
            <ModalBtn onClick={downloadCodes}>Download .txt</ModalBtn>
            <ModalBtn variant="primary" onClick={onDone}>Done</ModalBtn>
          </>
        ) : null
      }
    >
      {error && (
        <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.28)', color: '#fca5a5', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>
          {error}
        </div>
      )}

      {step === 'scan' && data && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', background: '#fff', borderRadius: 12, padding: 12 }}>
            <img src={data.qrDataUrl} alt="TOTP QR code" style={{ width: 240, height: 240 }} />
          </div>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#545E6E', marginBottom: 6 }}>
              Or enter manually
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                readOnly
                value={data.secret}
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.1)',
                  background: 'rgba(10,13,19,.6)',
                  color: '#E7E9EE',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <button type="button" onClick={copySecret}
                style={{ padding: '0 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', color: '#8892A3', cursor: 'pointer' }}>
                <Copy size={13} />
              </button>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#545E6E', marginBottom: 8 }}>
              6-digit code from your app
            </div>
            <OtpInput value={code} onChange={setCode} length={6} disabled={busy} autoFocus />
          </div>
        </>
      )}

      {step === 'codes' && (
        <>
          <div style={{ padding: 14, borderRadius: 12, background: 'rgba(10,13,19,.6)', border: '1px solid rgba(255,255,255,.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#E7E9EE' }}>
            {backupCodes.map((c) => (
              <div key={c} style={{ padding: '4px 8px', borderBottom: '1px dashed rgba(255,255,255,.05)' }}>{c}</div>
            ))}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: '#f87171', padding: '10px 12px', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, lineHeight: 1.6 }}>
            You will not see these again. Lose your authenticator and these codes and you will be locked out.
          </div>
        </>
      )}
    </TwoFaModal>
  );
}

// ---------------------------------------------------------------------------
// Email OTP setup modal
// ---------------------------------------------------------------------------
function EmailSetupModal({ onClose, onDone }) {
  const [step, setStep] = useState('sending'); // sending | input
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await authService.enableEmailTwoFactor();
        setStep('input');
      } catch (err) {
        setError(err?.message || 'Could not send code');
        setStep('input');
      }
    })();
  }, []);

  const handleConfirm = async () => {
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    setBusy(true); setError('');
    try {
      await authService.confirmEmailTwoFactor(code);
      toast.success('Email OTP enabled');
      onDone();
    } catch (err) {
      setError(err?.message || 'Incorrect code');
    } finally {
      setBusy(false);
    }
  };

  return (
    <TwoFaModal
      title="Enable email OTP"
      subtitle="A 6-digit code will be sent to your email every time you sign in."
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <ModalBtn onClick={onClose} disabled={busy}>Cancel</ModalBtn>
          <ModalBtn variant="primary" onClick={handleConfirm} loading={busy}>
            Enable email OTP
          </ModalBtn>
        </>
      }
    >
      {error && (
        <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.28)', color: '#fca5a5', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>
          {error}
        </div>
      )}
      {step === 'sending' && (
        <div style={{ textAlign: 'center', color: '#8892A3', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, padding: 20 }}>
          <Loader2 size={16} className="settings-spin" style={{ marginBottom: 6 }} />
          <div>Sending code…</div>
        </div>
      )}
      {step === 'input' && (
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#545E6E', marginBottom: 8 }}>
            6-digit code
          </div>
          <OtpInput value={code} onChange={setCode} length={6} disabled={busy} autoFocus />
        </div>
      )}
    </TwoFaModal>
  );
}

// ---------------------------------------------------------------------------
// Disable modal (password + optional TOTP code)
// ---------------------------------------------------------------------------
function DisableModal({ method, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const needsCode = method === 'totp';

  const handleSubmit = async () => {
    setBusy(true); setError('');
    try {
      if (method === 'totp') await authService.disableTotp(password, code);
      else                    await authService.disableEmailTwoFactor(password);
      toast.success(`${method === 'totp' ? 'Authenticator' : 'Email OTP'} disabled`);
      onDone();
    } catch (err) {
      setError(err?.message || 'Could not disable');
    } finally {
      setBusy(false);
    }
  };

  return (
    <TwoFaModal
      title={`Disable ${method === 'totp' ? 'authenticator app' : 'email OTP'}`}
      subtitle="Confirm with your password to turn off this method."
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <ModalBtn onClick={onClose} disabled={busy}>Cancel</ModalBtn>
          <ModalBtn variant="danger" onClick={handleSubmit} loading={busy}>Disable</ModalBtn>
        </>
      }
    >
      {error && (
        <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.28)', color: '#fca5a5', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>
          {error}
        </div>
      )}
      <div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#545E6E', marginBottom: 6 }}>
          Password
        </div>
        <input
          type="password"
          value={password}
          autoFocus
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(10,13,19,.6)', color: '#E7E9EE', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      {needsCode && (
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#545E6E', marginBottom: 8 }}>
            Authenticator code
          </div>
          <OtpInput value={code} onChange={setCode} length={6} disabled={busy} />
        </div>
      )}
    </TwoFaModal>
  );
}

// ---------------------------------------------------------------------------
// Regenerate backup codes modal
// ---------------------------------------------------------------------------
function RegenerateCodesModal({ onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newCodes, setNewCodes] = useState(null);

  const handleSubmit = async () => {
    setBusy(true); setError('');
    try {
      const r = await authService.regenerateBackupCodes(password, code);
      setNewCodes(r.backupCodes || []);
    } catch (err) {
      setError(err?.message || 'Could not regenerate');
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!newCodes) return;
    const text = `MavRix Journal — new backup codes\n${new Date().toISOString()}\n\n${newCodes.join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mavrix-backup-codes.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <TwoFaModal
      title={newCodes ? 'New backup codes' : 'Regenerate backup codes'}
      subtitle={newCodes ? 'Previous codes are invalidated.' : 'Your password + authenticator code are required.'}
      onClose={newCodes ? onDone : onClose}
      busy={busy}
      footer={
        newCodes ? (
          <>
            <ModalBtn onClick={download}>Download .txt</ModalBtn>
            <ModalBtn variant="primary" onClick={onDone}>Done</ModalBtn>
          </>
        ) : (
          <>
            <ModalBtn onClick={onClose} disabled={busy}>Cancel</ModalBtn>
            <ModalBtn variant="primary" onClick={handleSubmit} loading={busy}>Regenerate</ModalBtn>
          </>
        )
      }
    >
      {error && (
        <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.28)', color: '#fca5a5', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>
          {error}
        </div>
      )}
      {newCodes ? (
        <div style={{ padding: 14, borderRadius: 12, background: 'rgba(10,13,19,.6)', border: '1px solid rgba(255,255,255,.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#E7E9EE' }}>
          {newCodes.map((c) => (
            <div key={c} style={{ padding: '4px 8px', borderBottom: '1px dashed rgba(255,255,255,.05)' }}>{c}</div>
          ))}
        </div>
      ) : (
        <>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#545E6E', marginBottom: 6 }}>Password</div>
            <input
              type="password"
              value={password}
              autoFocus
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(10,13,19,.6)', color: '#E7E9EE', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#545E6E', marginBottom: 8 }}>Authenticator code</div>
            <OtpInput value={code} onChange={setCode} length={6} disabled={busy} />
          </div>
        </>
      )}
    </TwoFaModal>
  );
}

// ---------------------------------------------------------------------------
// Main section
// ---------------------------------------------------------------------------
export default function TwoFactorSection() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'totp' | 'email' | 'disable-totp' | 'disable-email' | 'regenerate' | null

  const refresh = async () => {
    try {
      const r = await authService.getTwoFactorStatus();
      setStatus(r);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const closeModal = () => setModal(null);
  const onDone = () => { setModal(null); refresh(); };

  return (
    <>
      <section className="settings-section">
        <h4 className="settings-section-title">Two-Factor Authentication</h4>
        <p className="settings-hint">
          Add a second step at every sign-in. You'll be prompted again every 12 hours.
          {status?.enabled && ' Enabling at least one method is required.'}
        </p>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 14, color: '#8892A3', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
            <Loader2 size={13} className="settings-spin" /> Checking status…
          </div>
        ) : (
          <>
            {/* Authenticator App */}
            <div className="settings-options-row">
              <div className="settings-options-text">
                <span className="settings-options-label">
                  <Smartphone size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Authenticator app
                </span>
                <span className="settings-options-desc">
                  {status?.totpEnabled
                    ? `Enabled · ${status.backupCodesRemaining} backup code${status.backupCodesRemaining === 1 ? '' : 's'} remaining`
                    : 'Use Google Authenticator, 1Password, Authy, etc.'}
                </span>
              </div>
              {status?.totpEnabled ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="settings-btn" onClick={() => setModal('regenerate')}>
                    <KeyRound size={12} /> Backup codes
                  </button>
                  <button type="button" className="settings-btn settings-btn-danger" onClick={() => setModal('disable-totp')}>
                    <ShieldOff size={12} /> Disable
                  </button>
                </div>
              ) : (
                <button type="button" className="settings-btn settings-btn-primary" onClick={() => setModal('totp')}>
                  <ShieldCheck size={12} /> Set up
                </button>
              )}
            </div>

            {/* Email OTP */}
            <div className="settings-options-row">
              <div className="settings-options-text">
                <span className="settings-options-label">
                  <Mail size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Email one-time code
                </span>
                <span className="settings-options-desc">
                  {status?.emailEnabled
                    ? 'Enabled · code sent to your email at sign-in'
                    : 'Receive a 6-digit code in your inbox at sign-in.'}
                </span>
              </div>
              {status?.emailEnabled ? (
                <button type="button" className="settings-btn settings-btn-danger" onClick={() => setModal('disable-email')}>
                  <ShieldOff size={12} /> Disable
                </button>
              ) : (
                <button type="button" className="settings-btn settings-btn-primary" onClick={() => setModal('email')}>
                  <ShieldCheck size={12} /> Enable
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {modal === 'totp' && <TotpSetupModal onClose={closeModal} onDone={onDone} />}
      {modal === 'email' && <EmailSetupModal onClose={closeModal} onDone={onDone} />}
      {modal === 'disable-totp' && <DisableModal method="totp" onClose={closeModal} onDone={onDone} />}
      {modal === 'disable-email' && <DisableModal method="email" onClose={closeModal} onDone={onDone} />}
      {modal === 'regenerate' && <RegenerateCodesModal onClose={closeModal} onDone={onDone} />}
    </>
  );
}