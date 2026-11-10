import { MessageCircle, Users, UserRoundPlus, Settings } from 'lucide-react';

import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip';
import { useAuth } from '@/app/providers/AuthProvider';
import { initialsOf } from './Avatar';

const TABS = [
  { id: 'dms',     icon: MessageCircle, label: 'Direct Messages', short: 'Chats' },
  { id: 'groups',  icon: Users,         label: 'Groups',          short: 'Groups' },
  { id: 'friends', icon: UserRoundPlus, label: 'Friends',         short: 'Friends' },
];

function RailButton({ icon: Icon, label, short, active = false, badge, variant, onClick }) {
  const cls = ['chat-rail-btn', active ? 'is-active' : '', variant === 'secondary' ? 'is-secondary' : '']
    .filter(Boolean)
    .join(' ');
  const showBadge = typeof badge === 'number' && badge > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cls}
          onClick={onClick}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
        >
          <span className="chat-rail-icon" aria-hidden>
            <Icon size={20} strokeWidth={active ? 2.25 : 1.9} />
          </span>
          {short && <span className="chat-rail-label" aria-hidden>{short}</span>}
          {showBadge && (
            <span className="chat-rail-badge" aria-hidden>
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12} className="chat-rail-tip">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export default function ChatRail({
  activeTab,
  onTabChange,
  unreadDms = 0,
  unreadGroups = 0,
  friendRequestCount = 0,
  onOpenSettings,
  onOpenProfile,
}) {
  const { user } = useAuth();

  const badgeFor = (id) => {
    if (id === 'dms') return unreadDms;
    if (id === 'groups') return unreadGroups;
    if (id === 'friends') return friendRequestCount;
    return 0;
  };

  return (
    <nav className="chat-rail" aria-label="Chat sections">
      <div className="chat-rail-stack">
        {TABS.map((t) => (
          <RailButton
            key={t.id}
            icon={t.icon}
            label={t.label}
            short={t.short}
            active={activeTab === t.id}
            badge={badgeFor(t.id)}
            onClick={() => onTabChange(t.id)}
          />
        ))}
      </div>

      <div className="chat-rail-spacer" aria-hidden />

      <div className="chat-rail-stack">
        <RailButton
          icon={Settings}
          label="Chat settings"
          short="Settings"
          variant="secondary"
          onClick={onOpenSettings}
        />
      </div>

      <div className="chat-rail-divider" aria-hidden />

      {user && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="chat-rail-avatar"
              onClick={onOpenProfile}
              aria-label="Your profile"
            >
              {user.photoUrl ? <img src={user.photoUrl} alt="" /> : <span>{initialsOf(user)}</span>}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="chat-rail-tip">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'You'}
          </TooltipContent>
        </Tooltip>
      )}
    </nav>
  );
}
