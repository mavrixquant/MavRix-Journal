
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { BootLoader } from '@/shared/ui/boot-loader';

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <BootLoader label="Authenticating" />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export function RequireVerified({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <BootLoader label="Authenticating" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;

  return children;
}

export function RequireGuest({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <BootLoader label="Authenticating" />;
  if (!user) return children;

  const authedHome = user.emailVerified ? '/journal' : '/verify-email';
  return <Navigate to={authedHome} replace />;
}