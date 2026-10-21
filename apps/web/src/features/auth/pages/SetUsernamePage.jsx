import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AtSign } from 'lucide-react';
import { setUsernameSchema } from '@mavrix/shared/validators';

import { useAuth } from '@/app/providers/AuthProvider';
import * as authService from '@/features/auth/api';
import AuthLayout from '../components/AuthLayout';
import AuthField from '../components/AuthField';
import AuthButton from '../components/AuthButton';

export default function SetUsernamePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(setUsernameSchema),
    defaultValues: { username: '' },
  });

  const onSubmit = async ({ username }) => {
    try {
      await authService.setUsername(username);
      await refreshUser();
      navigate('/', { replace: true });
    } catch (err) {
      setError('username', { message: err?.message || 'Could not set username' });
    }
  };

  return (
    <AuthLayout
      eyebrow="Almost there"
      title="Choose your username"
      subtitle={
        user?.email
          ? 'One more step for ' + user.email + '. Your username is how others find you.'
          : 'Your username is how others find you.'
      }
      showBackLink={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <AuthField
          icon={AtSign}
          type="text"
          placeholder="username (3-30 chars, a-z 0-9 _)"
          autoComplete="username"
          autoFocus
          error={errors.username?.message}
          {...register('username')}
        />
        <p
          style={{
            margin: '0 0 14px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            lineHeight: 1.6,
            color: '#8892A3',
            letterSpacing: '.01em',
          }}
        >
          Lowercase letters, digits, and underscores only. Cannot be changed to
          an existing name.
        </p>
        <AuthButton type="submit" loading={isSubmitting} disabled={isSubmitting}>
          Continue
        </AuthButton>
      </form>
    </AuthLayout>
  );
}