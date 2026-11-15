import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSystemStatus } from '@/shared/api/systemStatus';
import { BootLoader } from '@/shared/ui/boot-loader';

// FIXED 2026-11-15 — defense in depth: every guard that gates a real app
// route (RequireVerified, RequireAdmin) now re-checks maintenance status.
// Even if MaintenanceGate is bypassed by an edge case (stale deploy, direct
// URL nav, race), the guard catches it on the same render.

function useMaintenanceRedirect() {
  const { user } = useAuth();
  const { data: status, isLoading, isError } = useSystemStatus();

  if (isLoading) return { redirect: null, loading: true };
  if (user?.role === 'superadmin') return { redirect: null, loading: false };

  const statusKnown = !isError && status && typeof status === 'object';
  const maintenanceOn = statusKnown ? !!status.maintenanceMode : true;

  if (maintenanceOn) return { redirect: '/maintenance', loading: false };
  return { redirect: null, loading: false };
}

export function RequireAuth({ children }) {
  const { user, loading, pending2FA } = useAuth();

  if (loading) return <BootLoader label="Authenticating" />;
  if (pending2FA) return <Navigate to="/2fa-verify" replace />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export function RequireVerified({ children }) {
  const { user, loading, pending2FA } = useAuth();
  const { redirect, loading: statusLoading } = useMaintenanceRedirect();

  if (loading || statusLoading) return <BootLoader label="Authenticating" />;
  if (pending2FA) return <Navigate to="/2fa-verify" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (!user.username) return <Navigate to="/set-username" replace />;
  if (redirect) return <Navigate to={redirect} replace />;

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