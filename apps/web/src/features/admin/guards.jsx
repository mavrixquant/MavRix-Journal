
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';

const ADMIN_ROLES = new Set(['admin', 'superadmin']);

export function RequireAdmin({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (!ADMIN_ROLES.has(user.role)) return <Navigate to="/journal" replace />;

  return children;
}

export function RequireSuperadmin({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (user.role !== 'superadmin') return <Navigate to="/admin" replace />;

  return children;
}