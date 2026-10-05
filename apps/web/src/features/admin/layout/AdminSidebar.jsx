// apps/web/src/features/admin/layout/AdminSidebar.jsx
import { NavLink, Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { ADMIN_NAV, isAdminItemActive } from '../nav.config';

export default function AdminSidebar({ onNavigate }) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-head">
        <span className="admin-sidebar-head-dot" aria-hidden />
        <div style={{ minWidth: 0 }}>
          <div className="admin-sidebar-head-eyebrow">Mavrix · Control</div>
          <div className="admin-sidebar-head-title">Admin Panel</div>
        </div>
      </div>

      <nav className="admin-sidebar-nav">
        {ADMIN_NAV.map((section) => (
          <div key={section.section} className="admin-nav-section">
            <div className="admin-nav-section-label">{section.section}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = isAdminItemActive(pathname, item);

              if (item.soon) {
                return (
                  <div
                    key={item.to}
                    className="admin-nav-item is-soon"
                    title="Coming in a later phase"
                  >
                    <span className="admin-nav-icon"><Icon size={14} /></span>
                    <span>{item.label}</span>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={`admin-nav-item${isActive ? ' is-active' : ''}`}
                >
                  <span className="admin-nav-icon"><Icon size={14} /></span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="admin-sidebar-foot">
        <div className="admin-sidebar-role">
          Signed in as <strong>{user?.role || 'user'}</strong>
        </div>
        <Link to="/journal" className="admin-exit-btn" onClick={onNavigate}>
          <ArrowLeft size={13} />
          <span>Exit to Journal</span>
        </Link>
      </div>
    </aside>
  );
}