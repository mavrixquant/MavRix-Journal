// apps/web/src/features/auth/components/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock } from 'lucide-react';
import { loginSchema } from '@mavrix/shared/validators';

import { useAuth } from '@/app/providers/AuthProvider';
import * as google from '@/services/google';
import AuthLayout from './AuthLayout';
import AuthField from './AuthField';
import AuthButton from './AuthButton';
import { ErrorBanner } from './ErrorBanner';
import { Divider } from './Divider';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data) => {
    setError('');
    try {
      const user = await login(data);
      navigate(user.emailVerified ? '/journal' : '/verify-email');
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const accessToken = await google.signIn();
      const user = await googleLogin(accessToken);
      navigate(user.emailVerified ? '/journal' : '/verify-email');
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to your account"
      subtitle="Access your trading analytics dashboard"
      footer="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkTo="/signup"
    >
      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <AuthField
          icon={Mail}
          type="email"
          placeholder="Email address"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <AuthField
          icon={Lock}
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div
          style={{
            textAlign: 'right',
            marginTop: -4,
            marginBottom: 14,
          }}
        >
          <Link
            to="/forgot-password"
            style={{
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: 11.5,
              color: '#8892A3',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#F59E0B')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8892A3')}
          >
            Forgot password?
          </Link>
        </div>

        <AuthButton type="submit" loading={isSubmitting}>
          Sign In
        </AuthButton>
      </form>

      <Divider />

      <AuthButton
        type="button"
        variant="ghost"
        loading={googleLoading}
        onClick={handleGoogle}
      >
        {!googleLoading && <GoogleIcon />}
        Continue with Google
      </AuthButton>
    </AuthLayout>
  );
}