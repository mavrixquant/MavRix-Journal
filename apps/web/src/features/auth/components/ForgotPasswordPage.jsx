// apps/web/src/features/auth/components/ForgotPasswordPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { z } from 'zod';

import * as authService from '@/services/auth.service';
import AuthLayout from './AuthLayout';
import AuthField from './AuthField';
import AuthButton from './AuthButton';
import { ErrorBanner } from './ErrorBanner';
import { SuccessBanner } from './SuccessBanner';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }) => {
    setError('');
    try {
      await authService.requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Could not send reset email');
    }
  };

  return (
    <AuthLayout
      eyebrow="Password reset"
      title="Forgot your password?"
      subtitle={sent ? 'Check your inbox for the reset link.' : "We'll email you a reset link."}
      backTo="/login"
      backLabel="Back to login"
      footer="Remembered it?"
      footerLinkText="Sign in"
      footerLinkTo="/login"
    >
      {error && <ErrorBanner message={error} />}

      {sent ? (
        <>
          <SuccessBanner
            message="If that email is registered, a reset link is on its way. Check your inbox and spam folder."
          />
          <AuthButton type="button" onClick={() => navigate('/login')}>
            Back to login
          </AuthButton>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <AuthField
            icon={Mail}
            type="email"
            placeholder="Email address"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <AuthButton type="submit" loading={isSubmitting}>
            Send reset link
          </AuthButton>
        </form>
      )}
    </AuthLayout>
  );
}