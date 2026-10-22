import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, KeyRound, Lock } from 'lucide-react';

import * as authService from '@/features/auth/api';
import AuthLayout from '../components/AuthLayout';
import AuthField from '../components/AuthField';
import AuthButton from '../components/AuthButton';
import PasswordStrength from '../components/PasswordStrength';
import { ErrorBanner } from '../components/ErrorBanner';
import { SuccessBanner } from '../components/SuccessBanner';
import { OtpInput } from '@/shared/ui/otp-input';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const emailFromQuery = (searchParams.get('email') || '').trim().toLowerCase();
  const stepFromQuery  = searchParams.get('step') === 'otp' && emailFromQuery
    ? 'otp'
    : 'email';

  const [step, setStep] = useState(stepFromQuery);
  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    setError('');
    setInfo('');
  }, [step]);

  const goStep = (next) => {
    setError('');
    setInfo('');
    setStep(next);
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError('Email is required.'); return; }

    setLoading(true);
    try {
      await authService.requestPasswordReset(cleanEmail);
      setEmail(cleanEmail);
      setOtp('');
      setInfo('If that email is registered, a 6-digit code is on its way. Check your inbox and spam folder.');
      goStep('otp');
    } catch (err) {
      setError(err?.message || 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const clean = otp.trim();
    if (!/^\d{6}$/.test(clean)) { setError('Enter the 6-digit code from your email.'); return; }

    setLoading(true);
    try {
      await authService.verifyResetOtp(email, clean);
      setOtp(clean);
      goStep('password');
    } catch (err) {
      setError(err?.message || 'Could not verify code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await authService.resetPassword(email, otp.trim(), password);
      setInfo('Password reset. Redirecting to sign in…');
      setTimeout(() => navigate('/login', { replace: true }), 1400);
    } catch (err) {
      setError(err?.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      await authService.requestPasswordReset(email);
      setOtp('');
      setInfo('A new code is on its way. The previous code is now invalid.');
    } catch (err) {
      setError(err?.message || 'Could not resend code.');
    } finally {
      setResending(false);
    }
  };

  const handleBack = () => {
    if (step === 'otp')      { setOtp('');      goStep('email'); }
    if (step === 'password') { setPassword(''); setConfirm(''); goStep('otp'); }
  };

  // ----- step: email -----
  if (step === 'email') {
    return (
      <AuthLayout
        eyebrow="Password reset"
        title="Forgot your password?"
        subtitle="Enter your email — we'll send you a 6-digit code."
        backTo="/login"
        backLabel="Back to login"
        footer="Remembered it?"
        footerLinkText="Sign in"
        footerLinkTo="/login"
      >
        {error && <ErrorBanner message={error} />}
        {info  && <SuccessBanner message={info} />}

        <form onSubmit={handleRequestCode} noValidate>
          <AuthField
            icon={Mail}
            type="email"
            placeholder="Email address"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <AuthButton type="submit" loading={loading} disabled={loading}>
            Send reset code
          </AuthButton>
        </form>
      </AuthLayout>
    );
  }

  // ----- step: otp -----
  if (step === 'otp') {
    return (
      <AuthLayout
        eyebrow="Verify email"
        title="Enter your code"
        subtitle={`We sent a 6-digit code to ${email}.`}
        showBackLink={false}
        footer="Didn't get it?"
        footerLinkText=""
      >
        {error && <ErrorBanner message={error} />}
        {info  && <SuccessBanner message={info} />}

        <form onSubmit={handleVerifyOtp} noValidate>
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: '#545E6E',
              }}
            >
              6-digit code
            </label>
            <OtpInput
              value={otp}
              onChange={setOtp}
              length={6}
              disabled={loading}
              autoFocus
            />
          </div>
          <AuthButton type="submit" loading={loading} disabled={loading || otp.length !== 6}>
            Verify code
          </AuthButton>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
          <button
            type="button"
            onClick={handleBack}
            disabled={loading || resending}
            style={{
              background: 'none', border: 'none', padding: 0,
              color: '#8892A3',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11.5, cursor: 'pointer',
            }}
          >
            ← Use a different email
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={loading || resending}
            style={{
              background: 'none', border: 'none', padding: 0,
              color: 'var(--accent)',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  // ----- step: password -----
  return (
    <AuthLayout
      eyebrow="New password"
      title="Choose a new password"
      subtitle="Minimum 6 characters. This will replace your old one."
      showBackLink={false}
      footer="Back to"
      footerLinkText="Sign in"
      footerLinkTo="/login"
    >
      {error && <ErrorBanner message={error} />}
      {info  && <SuccessBanner message={info} />}

      <form onSubmit={handleSetPassword} noValidate>
        <AuthField
          icon={Lock}
          type="password"
          placeholder="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <PasswordStrength password={password} />
        <AuthField
          icon={Lock}
          type="password"
          placeholder="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <AuthButton type="submit" loading={loading} disabled={loading}>
          Reset password
        </AuthButton>
      </form>

      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <button
          type="button"
          onClick={handleBack}
          disabled={loading}
          style={{
            background: 'none', border: 'none', padding: 0,
            color: '#8892A3',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11.5, cursor: 'pointer',
          }}
        >
          ← Back to code entry
        </button>
      </div>

      <div style={{ marginTop: 10, textAlign: 'center' }}>
        <Link
          to="/login"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11.5,
            color: '#545E6E',
            textDecoration: 'none',
          }}
        >
          Cancel
        </Link>
      </div>
    </AuthLayout>
  );
}