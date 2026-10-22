import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { BootLoader } from '@/shared/ui/boot-loader';

const ADMIN_ROLES = new Set(['admin', 'superadmin']);

/**
 * IMPORTANT: never return `null` while loading.
 *
 * The previous version returned `null` when `useAuth().loading === true`.
 * In production (Render free tier) the initial `/api/auth/refresh` call can
 * take 30–60 s during cold start; during that window the admin route painted
 * a completely blank page. The user perceives it as "broken".
 *
 * Now we always render something:
 *   - loading → BootLoader (visible spinner)
 *   - not logged in → /login
 *   - unverified → /verify-email
 *   - not admin → /journal
 *   - admin → children
 */
export function RequireAdmin({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    if (import.meta.env.PROD) {
      // Helps diagnose slow auth bootstrap in prod console.
      // (Logged only once per render, but React batches, so this is cheap.)
      console.info('[admin-guard] waiting for auth bootstrap…');
    }
    return <BootLoader label="Checking admin access" />;
  }

  if (!user) {
    if (import.meta.env.PROD) {
      console.warn('[admin-guard] not logged in → /login');
    }
    return <Navigate to="/login" replace />;
  }

  if (!user.emailVerified) {
    if (import.meta.env.PROD) {
      console.warn('[admin-guard] email not verified → /verify-email');
    }
    return <Navigate to="/verify-email" replace />;
  }

  if (!ADMIN_ROLES.has(user.role)) {
    if (import.meta.env.PROD) {
      console.warn(
        `[admin-guard] role=${user.role} is not admin → /journal`
      );
    }
    return <Navigate to="/journal" replace />;
  }

  return children;
}

export function RequireSuperadmin({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <BootLoader label="Checking superadmin access" />;
  }

  if (!user) {
    if (import.meta.env.PROD) {
      console.warn('[superadmin-guard] not logged in → /login');
    }
    return <Navigate to="/login" replace />;
  }

  if (!user.emailVerified) {
    if (import.meta.env.PROD) {
      console.warn('[superadmin-guard] email not verified → /verify-email');
    }
    return <Navigate to="/verify-email" replace />;
  }

  if (user.role !== 'superadmin') {
    if (import.meta.env.PROD) {
      console.warn(
        `[superadmin-guard] role=${user.role} is not superadmin → /admin`
      );
    }
    return <Navigate to="/admin" replace />;
  }

  return children;
}