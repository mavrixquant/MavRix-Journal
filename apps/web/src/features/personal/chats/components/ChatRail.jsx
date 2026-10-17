// apps/web/src/features/personal/chats/components/ChatRail.jsx
//
// Discord-style icon rail. All styling is in ChatsShell.css (.chat-rail-*).

import {
  MessageCircle,
  Users,
  UserRoundPlus,
  Settings,
} from 'lucide-react';

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/shared/ui/tooltip';
import { useAuth } from '@/app/providers/AuthProvider';

const TABS = [
  { id: 'dms',     icon: MessageCircle, label: 'Direct Messages' },
  { id: 'groups',  icon: Users,         label: 'Groups' },
  { id: 'friends', icon: UserRoundPlus, label: 'Friends' },
];

function initialsOf(user) {
  if (!user) return '?';
  const a = (user.firstName || '').trim();
  const b = (user.lastName || '').trim();
  if (a && b) return (a[0] + b[0]).toUpperCase();
  if (a) return a.slice(0, 2).toUpperCase();
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  return '?';
}

function RailButton({
  icon: Icon,
  label,
  active = false,
  badge,
  muted = false,
  variant,
  onClick,
}) {
  const cls = [
    'chat-rail-btn',
    active ? 'is-active' : '',
    variant === 'secondary' ? 'is-secondary' : '',
  ].filter(Boolean).join(' ');

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
            <Icon size={variant === 'secondary' ? 18 : 20} strokeWidth={2} />
          </span>
          {showBadge && (
            <span className={`chat-rail-badge${muted ? ' is-muted' : ''}`} aria-hidden>
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
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="" />
              ) : (
                <span>{initialsOf(user)}</span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="chat-rail-tip">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') ||
              user.email ||
              'You'}
          </TooltipContent>
        </Tooltip>
      )}
    </nav>
  );
}