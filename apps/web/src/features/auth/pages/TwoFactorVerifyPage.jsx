import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Smartphone, ArrowRight, Loader2 } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import * as authService from '@/features/auth/api';
import { landingFor } from '@/features/auth/landing';
import AuthLayout from '../components/AuthLayout';
import AuthButton from '../components/AuthButton';
import { ErrorBanner } from '../components/ErrorBanner';
import { SuccessBanner } from '../components/SuccessBanner';
import { OtpInput } from '@/shared/ui/otp-input';

export default function TwoFactorVerifyPage() {
  const navigate = useNavigate();
  const { pending2FA, verifyTwoFactor, clearTwoFactor } = useAuth();

  const methods = pending2FA?.methods || [];
  const hasTotp  = methods.includes('totp');
  const hasEmail = methods.includes('email');

  const [method, setMethod] = useState(() => (hasTotp ? 'totp' : 'email'));
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // If no challenge is pending, bounce back to login.
  useEffect(() => {
    if (!pending2FA) navigate('/login', { replace: true });
  }, [pending2FA, navigate]);

  // Auto-send an email OTP the moment the user switches to the email method.
  const sendEmailOtp = useCallback(async () => {
    if (!pending2FA) return;
    setSendingEmail(true);
    setError('');
    try {
      await authService.sendTwoFactorEmail(pending2FA.sessionToken);
      setEmailSent(true);
    } catch (err) {
      setError(err?.message || 'Could not send code');
    } finally {
      setSendingEmail(false);
    }
  }, [pending2FA]);

  useEffect(() => {
    if (method === 'email' && hasEmail && !emailSent && !sendingEmail) {
      sendEmailOtp();
    }
  }, [method, hasEmail, emailSent, sendingEmail, sendEmailOtp]);

  if (!pending2FA) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const user = await verifyTwoFactor({ method, code });
      navigate(landingFor(user), { replace: true });
    } catch (err) {
      if (err?.status === 401 && /(session|revoked|expired)/i.test(err.message || '')) {
        clearTwoFactor();
        return;
      }
      setError(err?.message || 'Incorrect code');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMethod = () => {
    setError('');
    setCode('');
    setMethod((m) => (m === 'totp' ? 'email' : 'totp'));
  };

  const subtitle = hasTotp && hasEmail
    ? 'Enter the code from your authenticator app, or use email instead.'
    : method === 'totp'
      ? 'Enter the 6-digit code from your authenticator app.'
      : `We sent a 6-digit code to your email.`;

  return (
    <AuthLayout
      eyebrow="Two-factor authentication"
      title="Verify your identity"
      subtitle={subtitle}
      showBackLink={false}
    >
      {error && <ErrorBanner message={error} />}
      {emailSent && method === 'email' && !error && (
        <SuccessBanner message="A new code is on its way." />
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 18 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: '#545E6E',
            }}
          >
            {method === 'totp' ? <Smartphone size={11} /> : <Mail size={11} />}
            {method === 'totp' ? 'Authenticator code' : 'Email code'}
          </label>
          <OtpInput
            value={code}
            onChange={setCode}
            length={6}
            disabled={submitting}
            autoFocus
          />
        </div>

        <AuthButton type="submit" loading={submitting} disabled={submitting || code.length !== 6}>
          Verify and continue
        </AuthButton>
      </form>

      {hasTotp && hasEmail && (
        <button
          type="button"
          onClick={switchMethod}
          disabled={submitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            marginTop: 16,
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            padding: 10,
            opacity: submitting ? 0.5 : 1,
          }}
        >
          <ArrowRight size={12} />
          {method === 'totp' ? 'Try another way (email code)' : 'Use authenticator app instead'}
        </button>
      )}

      {method === 'email' && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <button
            type="button"
            onClick={sendEmailOtp}
            disabled={sendingEmail || submitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: '#8892A3',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11.5,
              cursor: sendingEmail || submitting ? 'not-allowed' : 'pointer',
              opacity: sendingEmail || submitting ? 0.5 : 1,
            }}
          >
            {sendingEmail && <Loader2 size={11} className="spin" />}
            {sendingEmail ? 'Sending…' : 'Resend code'}
          </button>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginTop: 18,
          color: '#545E6E',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10.5,
          letterSpacing: '.06em',
        }}
      >
        <ShieldCheck size={11} />
        Protected by two-factor authentication
      </div>
    </AuthLayout>
  );
}