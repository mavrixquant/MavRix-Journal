// apps/web/src/features/admin/layout/AdminHeader.jsx
import { Menu as MenuIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAdminHealth } from '../api';

const SEGMENT_LABELS = {
  admin: 'Admin',
  users: 'Users',
  accounts: 'Accounts',
  trades: 'Trades',
  calendar: 'Calendar',
  sessions: 'Sessions',
  broadcast: 'Broadcast',
  audit: 'Audit log',
  settings: 'Settings',
  system: 'System',
};

function crumbsFromPath(pathname) {
  const segs = pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean);
  if (segs.length === 0) return { current: 'Dashboard' };
  return { current: SEGMENT_LABELS[segs[0]] || segs[0] };
}

export default function AdminHeader({ user, onMobileMenuClick }) {
  const { data: health } = useAdminHealth();
  const location = useLocation();
  const { current } = crumbsFromPath(location.pathname);

  const status = health?.status === 'ok' ? 'ok' : 'degraded';
  const initials =
    ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase() ||
    'A';

  return (
    <header className="admin-header">
      <button
        type="button"
        className="admin-mobile-menu"
        onClick={onMobileMenuClick}
        aria-label="Open navigation"
      >
        <MenuIcon size={16} />
      </button>

      <div className="admin-header-crumbs">
        <span className="admin-header-crumbs-root">Admin</span>
        <span className="admin-header-crumbs-sep">/</span>
        <span className="admin-header-crumbs-current">{current}</span>
      </div>

      <div className="admin-header-spacer" />

      <span className={`admin-health is-${status}`}>
        <span className="admin-health-dot" aria-hidden />
        {status === 'ok' ? 'All systems' : 'Degraded'}
      </span>

      <div className="admin-header-user">
        <span className="admin-header-avatar">{initials}</span>
        <span>{user?.email || ''}</span>
      </div>
    </header>
  );
}