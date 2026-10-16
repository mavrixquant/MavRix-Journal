// apps/web/src/app/router/guards.jsx
//
// Route guards. Each one either renders its children or redirects.
// Composed inside routes.jsx to gate the app shell.
//
// Loading state: while the AuthProvider's initial refresh() is in flight,
// `loading === true` and `user === null`. Rendering `null` here produced a
// blank-white frame on every cold boot. We render the BootLoader instead —
// same dark canvas as the rest of the app, so the loader → content
// transition is a single fade rather than a white flash.

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { BootLoader } from '@/shared/ui/boot-loader';

/** Renders children only when the user is logged in. */
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <BootLoader label="Authenticating" />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

/** Renders children only when the user is logged in AND verified. */
export function RequireVerified({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <BootLoader label="Authenticating" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;

  return children;
}

/** Renders children only when NO user is logged in. Otherwise redirects home. */
export function RequireGuest({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <BootLoader label="Authenticating" />;
  if (!user) return children;

  const authedHome = user.emailVerified ? '/journal' : '/verify-email';
  return <Navigate to={authedHome} replace />;
}