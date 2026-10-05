// apps/web/src/features/admin/guards.jsx
//
// Route guards for the admin subtree.
//
//   RequireAdmin       — user must be logged in + role ∈ { admin, superadmin }
//   RequireSuperadmin  — user must be role === superadmin
//
// Both redirect to /journal (NOT /login) if the user is logged in but lacks
// role. This is friendlier than bouncing them to the login page they just
// came from — they're authenticated, they just don't have admin access.

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