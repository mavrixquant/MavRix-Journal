import { NavLink } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { groupHasActive } from './nav.config';
import { useAuth } from '@/app/providers/AuthProvider';

export function ExpandedGroup({ group, onNavigate, pathname }) {
  const { user } = useAuth();
  const isPro = user?.plan === 'pro' || user?.role === 'admin' || user?.role === 'superadmin';
  const hasActive = groupHasActive(pathname, group);

  return (
    <div className={`sb-group${hasActive ? ' has-active' : ''}`}>
      <div className="sb-group-head">
        <span className="sb-group-label">{group.label}</span>
      </div>

      <div className="sb-group-items-wrap">
        <div className="sb-group-items">
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) => `sb-item${isActive ? ' is-active' : ''}`}
              >
                <span className="sb-icon">
                  <Icon size={13} />
                </span>
                <span className="sb-label">{item.label}</span>
                {item.pro && !isPro && (
                  <span className="sb-pro-lock" title="PRO feature">
                    <Lock size={10} strokeWidth={2.5} />
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}