import { Menu as MenuIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAdminHealth } from '../api';
import { useAdminPageHeaderContext } from '../AdminPageHeader';

const SEGMENT_LABELS = {
  admin: 'Dashboard',
  users: 'Users',
  accounts: 'Accounts',
  trades: 'Trades',
  strategies: 'Strategies',
  groups: 'Groups',
  calendar: 'Calendar',
  gex: 'GEX Levels',
  sessions: 'Sessions',
  broadcast: 'Broadcast',
  audit: 'Audit log',
  settings: 'Settings',
  system: 'System',
  'health-check': 'Health Checkup',
};

function currentFromPath(pathname) {
  const segs = pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean);
  if (segs.length === 0) return 'Dashboard';
  return SEGMENT_LABELS[segs[0]] || segs[0];
}

export default function AdminHeader({ user, onMobileMenuClick }) {
  const { data: health } = useAdminHealth();
  const location = useLocation();
  const { config } = useAdminPageHeaderContext();

  const fallbackTitle = currentFromPath(location.pathname);

  const eyebrow = config?.eyebrow || 'Admin';
  const title = config?.title || fallbackTitle;
  const subtitle = config?.subtitle || null;

  const status = health?.status === 'ok' ? 'ok' : 'degraded';
  const initials =
    ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase() ||
    'A';

  return (
    <header
      className="admin-header"
      style={{
        height: 56,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid rgba(255,255,255,.08)',
        background: '#0F121A',
      }}
    >
      <button
        type="button"
        className="admin-mobile-menu"
        onClick={onMobileMenuClick}
        aria-label="Open navigation"
      >
        <MenuIcon size={16} />
      </button>

      <div className="admin-header-title">
        <div className="admin-header-title-row">
          <span className="admin-header-eyebrow">{eyebrow}</span>
          <h1 className="admin-header-title-text" title={title}>
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="admin-header-sub" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="admin-header-spacer" style={{ flex: 1 }} />

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