// apps/web/src/app/router/guards.jsx
//
// Route guards. Each one either renders its children or redirects.
// Composed inside routes.jsx to gate the app shell.

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';

/** Renders children only when the user is logged in. */
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;                    // handled by App's Suspense
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

/** Renders children only when the user is logged in AND verified. */
export function RequireVerified({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;

  return children;
}

/** Renders children only when NO user is logged in. Otherwise redirects home. */
export function RequireGuest({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return children;

  const authedHome = user.emailVerified ? '/journal' : '/verify-email';
  return <Navigate to={authedHome} replace />;
}