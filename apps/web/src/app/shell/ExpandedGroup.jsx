// apps/web/src/app/shell/ExpandedGroup.jsx
import { NavLink } from 'react-router-dom';
import { groupHasActive } from './nav.config';

export function ExpandedGroup({ group, onNavigate, pathname }) {
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
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}