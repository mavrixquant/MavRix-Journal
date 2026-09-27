// apps/web/src/features/auth/components/SignupPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, User } from 'lucide-react';
import { z } from 'zod';
import { signupSchema } from '@mavrix/shared/validators';

import { useAuth } from '@/app/providers/AuthProvider';
import * as google from '@/services/google';
import AuthLayout from './AuthLayout';
import AuthField from './AuthField';
import AuthButton from './AuthButton';
import PasswordStrength from './PasswordStrength';
import { ErrorBanner, Divider } from './LoginPage';

// Extend the shared schema with a client-only confirmPassword field.
const signupFormSchema = signupSchema
  .extend({
    confirmPassword: z.string().min(6).max(128),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

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

export default function Signup() {
  const navigate = useNavigate();
  const { signup, googleLogin } = useAuth();
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');

  const onSubmit = async (data) => {
    setError('');
    try {
      const { confirmPassword, ...payload } = data;
      await signup(payload);
      navigate('/verify-email');
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const accessToken = await google.signIn();
      const user = await googleLogin(accessToken);
      navigate(user.emailVerified ? '/dashboard' : '/verify-email');
    } catch (err) {
      setError(err.message || 'Google sign-up failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your account"
      subtitle="Start backtesting and discovering your edge"
      footer="Already have an account?"
      footerLinkText="Sign in"
      footerLinkTo="/login"
      cardMaxWidth={480}
    >
      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <AuthField
              icon={User}
              type="text"
              placeholder="First name"
              autoComplete="given-name"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
          </div>
          <div style={{ flex: 1 }}>
            <AuthField
              icon={User}
              type="text"
              placeholder="Last name"
              autoComplete="family-name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>
        </div>

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
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <PasswordStrength password={passwordValue} />

        <AuthField
          icon={Lock}
          type="password"
          placeholder="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <AuthButton type="submit" loading={isSubmitting} style={{ marginTop: 6 }}>
          Get Started Free
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