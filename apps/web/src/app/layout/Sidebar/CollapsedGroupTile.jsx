import { NavLink } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { HoverCard as HoverCardPrimitive } from 'radix-ui';
import { useAuth } from '@/app/providers/AuthProvider';
import { groupHasActive } from './nav.config';

export function CollapsedGroupTile({ group, onNavigate, pathname }) {
  const { user } = useAuth();
  const isPro = user?.plan === 'pro' || user?.role === 'admin' || user?.role === 'superadmin';
  const hasActive = groupHasActive(pathname, group);
  const Icon = group.icon;
  const defaultItem = group.items[0];

  return (
    <HoverCardPrimitive.Root openDelay={80} closeDelay={80}>
      <HoverCardPrimitive.Trigger asChild>
        <NavLink
          to={defaultItem.to}
          end={defaultItem.end}
          onClick={onNavigate}
          className={`sb-item sb-group-tile${hasActive ? ' is-active' : ''}`}
          aria-label={group.label}
        >
          <span className="sb-icon">
            <Icon size={19} />
          </span>
        </NavLink>
      </HoverCardPrimitive.Trigger>

      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          side="right"
          align="start"
          sideOffset={10}
          className="sb-flyout"
        >
          <div className="sb-flyout-label">{group.label}</div>
          <div className="sb-flyout-items">
            {group.items.map((item) => {
              const ItemIcon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `sb-flyout-item${isActive ? ' is-active' : ''}`
                  }
                >
                  <span className="sb-icon">
                    <ItemIcon size={12} />
                  </span>
                  {item.label}
                  {item.pro && !isPro && (
                    <span className="sb-pro-lock" title="PRO feature">
                      <Lock size={10} strokeWidth={2.5} />
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}