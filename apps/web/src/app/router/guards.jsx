import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { BootLoader } from '@/shared/ui/boot-loader';

export function RequireAuth({ children }) {
  const { user, loading, pending2FA } = useAuth();

  if (loading) return <BootLoader label="Authenticating" />;
  if (pending2FA) return <Navigate to="/2fa-verify" replace />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export function RequireVerified({ children }) {
  const { user, loading, pending2FA } = useAuth();

  if (loading) return <BootLoader label="Authenticating" />;
  if (pending2FA) return <Navigate to="/2fa-verify" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (!user.username) return <Navigate to="/set-username" replace />;

  return children;
}

export function RequireGuest({ children }) {
  const { user, loading, pending2FA } = useAuth();

  if (loading) return <BootLoader label="Authenticating" />;
  if (pending2FA) return <Navigate to="/2fa-verify" replace />;
  if (!user) return children;

  const authedHome = user.emailVerified ? '/journal' : '/verify-email';
  return <Navigate to={authedHome} replace />;
}

export function RequireTwoFactor({ children }) {
  const { pending2FA, loading } = useAuth();

  if (loading) return <BootLoader label="Verifying" />;
  if (!pending2FA) return <Navigate to="/login" replace />;

  return children;
}