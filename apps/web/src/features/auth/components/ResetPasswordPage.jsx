// apps/web/src/features/auth/components/ResetPasswordPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Key, Lock } from 'lucide-react';
import { z } from 'zod';

import * as authService from '@/services/auth.service';
import AuthLayout from './AuthLayout';
import AuthField from './AuthField';
import AuthButton from './AuthButton';
import PasswordStrength from './PasswordStrength';
import { ErrorBanner } from './ErrorBanner';
import { SuccessBanner } from './SuccessBanner';

const schema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string().min(6, 'At least 6 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { token: '', password: '', confirm: '' },
  });

  // Auto-fill token from ?token=... in the email link
  useEffect(() => {
    const t = searchParams.get('token');
    if (t) setValue('token', t);
  }, [searchParams, setValue]);

  const passwordValue = watch('password');

  const onSubmit = async ({ token, password }) => {
    setError('');
    try {
      await authService.resetPassword(token.trim(), password);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not reset password');
    }
  };

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

      {done ? (
        <>
          <SuccessBanner message="Password updated. You can now sign in with the new password." />
          <AuthButton type="button" onClick={() => navigate('/login')}>
            Go to login
          </AuthButton>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <AuthField
            icon={Key}
            type="text"
            placeholder="Reset token (auto-filled from email link)"
            error={errors.token?.message}
            {...register('token')}
          />
          <AuthField
            icon={Lock}
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrength password={passwordValue} />
          <AuthField
            icon={Lock}
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...register('confirm')}
          />
          <AuthButton type="submit" loading={isSubmitting}>
            Reset password
          </AuthButton>
        </form>
      )}
    </AuthLayout>
  );
}