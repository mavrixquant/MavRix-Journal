// apps/web/src/features/auth/components/EmailVerificationPage.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import * as authService from '@/services/auth.service';
import AuthLayout from './AuthLayout';
import AuthField from './AuthField';
import AuthButton from './AuthButton';
import { ErrorBanner, SuccessBanner } from './LoginPage';

export default function EmailVerification() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Did the user arrive via the emailed link? If so, verify on mount.
  const autoTriedRef = useRef(false);
  const urlToken = searchParams.get('token');

  useEffect(() => {
    if (!urlToken || autoTriedRef.current) return;
    autoTriedRef.current = true;
    setToken(urlToken);
    verifyToken(urlToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToken]);

  const verifyToken = async (t) => {
    const trimmed = (t ?? '').trim();
    if (!trimmed) {
      setError('Enter the verification code from your email.');
      return;
    }
    setVerifying(true);
    setError('');
    setStatus('');
    try {
      await authService.verifyEmail(trimmed);
      const updated = await refreshUser();
      if (updated?.emailVerified) {
        setStatus('Email verified. Redirecting…');
        navigate('/journal', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerify = () => verifyToken(token);

  const handleResend = async () => {
    setResending(true);
    setError('');
    setStatus('');
    try {
      await authService.resendVerification();
      setStatus('A new verification email has been sent.');
    } catch (err) {
      setError(err.message || 'Could not resend verification');
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AuthLayout
      eyebrow="One step left"
      title="Verify your email"
      subtitle="We sent a verification link to your inbox."
      showBackLink={false}
    >
      {user?.email && (
        <div
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            borderRadius: 999,
            background: 'rgba(245,158,11,.10)',
            border: '1px solid rgba(245,158,11,.28)',
            color: '#F59E0B',
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '.02em',
            marginBottom: 22,
            wordBreak: 'break-all',
            maxWidth: '100%',
          }}
        >
          {user.email}
        </div>
      )}

      {error && <ErrorBanner message={error} />}
      {status && <SuccessBanner message={status} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
        <AuthField
          icon={MailCheck}
          type="text"
          placeholder="Paste verification code"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
        />
      </div>

      <AuthButton
        type="button"
        loading={verifying}
        disabled={!token.trim()}
        onClick={handleVerify}
      >
        Verify Email
      </AuthButton>

      <div style={{ marginTop: 10 }}>
        <AuthButton
          type="button"
          variant="ghost"
          loading={resending}
          onClick={handleResend}
        >
          Resend verification email
        </AuthButton>
      </div>

      <div style={{ marginTop: 4 }}>
        <AuthButton type="button" variant="danger" onClick={handleLogout}>
          Log out
        </AuthButton>
      </div>
    </AuthLayout>
  );
}