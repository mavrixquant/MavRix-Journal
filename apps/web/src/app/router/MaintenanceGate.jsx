// ============================================================================
// MaintenanceGate — decides whether to render the app or redirect to
// /maintenance, based on /api/system/status + the current user's role.
//
// FIXED 2026-11-15 (round 2):
//   • Landing page ("/") is now BLOCKED during maintenance — previously it
//     was in PUBLIC_ROUTES, so users could still browse the marketing page.
//   • Signup ("/signup") is blocked too — no new accounts during maintenance.
//   • Only the login flow (/login, /forgot-password, /2fa-verify,
//     /verify-email, /set-username) stays reachable, so a superadmin who
//     is not logged in can still sign in and disable maintenance.
//   • Fail-CLOSED: if /api/system/status errors or the browser is offline,
//     status is treated as ON — maintenance beats accessibility.
// ============================================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSystemStatus } from '@/shared/api/systemStatus';
import { BootLoader } from '@/shared/ui/boot-loader';

const PUBLIC_ROUTES = new Set([
  '/maintenance',
  '/login',
  '/forgot-password',
  '/2fa-verify',
  '/verify-email',
  '/set-username',
]);

export function MaintenanceGate({ children }) {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { data: status, isLoading: statusLoading, isError } = useSystemStatus();

  if (authLoading || statusLoading) {
    return <BootLoader label="Loading" />;
  }

  // Fail-closed: unknown status counts as ON.
  const statusKnown = !isError && status && typeof status === 'object';
  const maintenanceOn = statusKnown ? !!status.maintenanceMode : true;

  const isSuperadmin = user?.role === 'superadmin';

  // Left maintenance while user is on /maintenance → send home.
  if (statusKnown && !maintenanceOn && location.pathname === '/maintenance') {
    return <Navigate to="/" replace />;
  }

  // Superadmin bypasses everything.
  if (isSuperadmin) return children;

  // Maintenance OFF, status known → full app.
  if (statusKnown && !maintenanceOn) return children;

  // Maintenance ON (or status unknown) → only public routes.
  if (PUBLIC_ROUTES.has(location.pathname)) return children;

  return <Navigate to="/maintenance" replace />;
}