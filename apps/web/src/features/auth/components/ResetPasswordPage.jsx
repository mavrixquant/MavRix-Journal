// apps/web/src/features/auth/components/ResetPasswordPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import navLogo from '@/assets/navLOGO.png';
import * as authService from '@/services/auth.service';
import AuthBackground from '@/shared/components/AuthBackground';
import CustomCursor from '@/app/shell/CustomCursor';

const styles = `
  .auth-wrapper {
    --accent: #F59E0B; --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10); --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085); --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    min-height: 100vh;
    background:
      radial-gradient(900px 520px at 15% -5%, var(--accent-soft), transparent 60%),
      radial-gradient(800px 500px at 88% 8%, rgba(34,211,238,.06), transparent 60%),
      linear-gradient(180deg, #07090D 0%, #0A0D14 45%, #07090D 100%);
    color: var(--ink-1);
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 32px 16px; position: relative; overflow: hidden;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    cursor: none;
  }
  .auth-wrapper::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
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
  .auth-card {
    position: relative; width: 100%; max-width: 440px;
    background: linear-gradient(180deg, rgba(18,21,28,.82), rgba(12,16,23,.72));
    backdrop-filter: blur(20px) saturate(140%);
    border: 1px solid var(--line); border-radius: 20px;
    padding: 40px 32px 32px; z-index: 10;
    box-shadow: 0 40px 100px -40px rgba(0,0,0,.9), 0 0 0 1px var(--accent-soft);
    animation: authIn .55s cubic-bezier(.2,.8,.25,1);
    overflow: hidden;
  }
  .auth-card::before {
    content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%; animation: authGrad 4s linear infinite;
  }
  .auth-head { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 26px; }
  .auth-logo { height: 42px; width: auto; display: block; margin-bottom: 20px; }
  .auth-eyebrow {
    font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 700;
    letter-spacing: .18em; text-transform: uppercase; color: var(--accent);
    margin-bottom: 8px; display: inline-flex; align-items: center; gap: 8px;
  }
  .auth-eyebrow::before, .auth-eyebrow::after { content: ''; width: 12px; height: 1px; background: var(--accent-soft2); }
  .auth-title { font-size: 1.6rem; font-weight: 700; margin: 0 0 8px; letter-spacing: -.02em; color: var(--ink-1); line-height: 1.15; }
  .auth-sub { color: var(--ink-2); font-size: 13px; margin: 0 0 8px; line-height: 1.6; font-family: 'IBM Plex Mono', monospace; }
  .input-group { position: relative; margin-bottom: 14px; }
  .auth-input {
    width: 100%; background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1); border-radius: 10px;
    padding: 13px 16px; color: var(--ink-1); font-size: 14px;
    font-family: 'IBM Plex Mono', monospace; outline: none;
    box-sizing: border-box; transition: all .2s; cursor: none;
  }
  .auth-input::placeholder { color: var(--ink-3); }
  .auth-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(245,158,11,.15); }
  .btn-submit {
    position: relative; width: 100%;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117; font-size: 13.5px; font-weight: 700;
    font-family: 'IBM Plex Mono', monospace; letter-spacing: .02em;
    padding: 14px; border: none; border-radius: 11px; cursor: none;
    overflow: hidden; transition: transform .25s, box-shadow .3s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    margin-top: 10px;
    box-shadow: 0 10px 30px -8px rgba(245,158,11,.55), inset 0 1px 0 rgba(255,255,255,.4);
  }
  .btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 16px 42px -10px rgba(245,158,11,.7); }
  .btn-submit:disabled { opacity: .65; cursor: not-allowed; }
  .error-banner {
    background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.28);
    color: #fca5a5; padding: 11px 13px; border-radius: 10px; font-size: 12px;
    font-family: 'IBM Plex Mono', monospace; line-height: 1.55; margin-bottom: 18px;
    display: flex; align-items: center; gap: 8px;
  }
  .success-banner {
    background: rgba(34,197,94,.08); border: 1px solid rgba(34,197,94,.28);
    color: #86efac; padding: 11px 13px; border-radius: 10px; font-size: 12px;
    font-family: 'IBM Plex Mono', monospace; line-height: 1.55; margin-bottom: 18px;
  }
  .auth-footer { text-align: center; margin-top: 22px; font-size: 13px; color: var(--ink-2); font-family: 'IBM Plex Mono', monospace; }
  .auth-footer a { color: var(--accent); text-decoration: none; font-weight: 700; margin-left: 4px; cursor: none; }
  .spinner { width: 16px; height: 16px; border: 2px solid rgba(10,13,19,.25); border-top-color: #0A0D13; border-radius: 50%; animation: spin .8s linear infinite; }
  @keyframes authGrad { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
  @keyframes authIn { from { opacity: 0; transform: translateY(20px) scale(.98); } to { opacity: 1; transform: none; } }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // Token may arrive via the link (?token=...) OR the user may paste it.
  useEffect(() => {
    const t = searchParams.get('token');
    if (t) setToken(t);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('Reset token is required. Paste the one from your email.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token.trim(), password);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <style>{styles}</style>
      <CustomCursor />
      <AuthBackground accent="#F59E0B" />

      <div className="auth-card">
        <div className="auth-head">
          <Link to="/">
            <img src={navLogo} alt="Logo" className="auth-logo" />
          </Link>
          <div className="auth-eyebrow">New password</div>
          <h1 className="auth-title">Choose a new password</h1>
          <p className="auth-sub">Minimum 6 characters. This will replace your old one.</p>
        </div>

        {error && (
          <div className="error-banner">
            <span>{error}</span>
          </div>
        )}

        {done ? (
          <>
            <div className="success-banner">
              Password updated. You can now sign in with the new password.
            </div>
            <button
              className="btn-submit"
              type="button"
              onClick={() => navigate('/login')}
            >
              Go to login
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="text"
                className="auth-input"
                placeholder="Reset token (auto-filled from email link)"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                className="auth-input"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                className="auth-input"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? <div className="spinner" /> : 'Reset password'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Back to
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}