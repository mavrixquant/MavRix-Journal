// apps/web/src/features/personal/chats/components/ChatRail.jsx
//
// Leftmost icon rail. LAYOUT IS DONE VIA INLINE STYLES so that no CSS
// cascade conflict can break the positioning. Colours, hover, active,
// tooltip, and badge animations come from ChatsShell.css.
//
// Structure:
//   DM | Groups | Friends        (tight 4px gap, first-class nav)
//   <flex-grow spacer>
//   Settings                     (secondary action, bottom cluster)
//   ────
//   avatar

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

const RAIL_WIDTH = 76;

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

/** Inline layout for every rail button — visual styles come from CSS. */
const BTN_STYLE = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 52,
  height: 52,
  flexShrink: 0,
  borderRadius: 16,
  border: '1px solid transparent',
  background: 'transparent',
  color: '#8892A3',
  padding: 0,
  cursor: 'pointer',
  outline: 'none',
};

function RailButton({
  icon: Icon,
  label,
  isActive,
  badge,
  mutedBadge,
  variant,
  onClick,
  size = 22,
}) {
  const showBadge = typeof badge === 'number' && badge > 0;
  const cls = [
    'rail-btn',
    isActive ? 'is-active' : '',
    variant === 'secondary' ? 'is-secondary' : '',
  ].filter(Boolean).join(' ');

  const style = variant === 'secondary'
    ? { ...BTN_STYLE, width: 46, height: 46, borderRadius: 14 }
    : BTN_STYLE;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cls}
          style={style}
          onClick={onClick}
          aria-label={label}
          aria-current={isActive ? 'page' : undefined}
        >
          <span className="rail-btn-icon">
            <Icon size={size} strokeWidth={2.1} />
          </span>
          {showBadge && (
            <span
              className={`rail-badge${mutedBadge ? ' is-muted' : ''}`}
              aria-hidden
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12} className="rail-tip">
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
  onOpenSettings,
  onOpenProfile,
}) {
  const { user } = useAuth();

  const badgeFor = (id) => {
    if (id === 'dms') return unreadDms;
    if (id === 'groups') return unreadGroups;
    return 0;
  };

  /* ---------------- Inline layout for the rail ---------------- */

  const navStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: RAIL_WIDTH,
    height: '100%',
    minHeight: 0,
    flexShrink: 0,
    padding: '12px 0',
    boxSizing: 'border-box',
    gap: 4,
    overflow: 'hidden',
    borderRadius: 18,
    background:
      'linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55))',
    border: '1px solid rgba(255,255,255,.085)',
    boxShadow: '0 20px 50px -30px rgba(0,0,0,.9)',
  };

  const stackStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    width: '100%',
    flexShrink: 0,
  };

  const dividerStyle = {
    width: 34,
    height: 1,
    flexShrink: 0,
    margin: '6px 0',
    background:
      'linear-gradient(90deg, transparent, rgba(255,255,255,.10), transparent)',
  };

  const spacerStyle = {
    flex: '1 1 auto',
    minHeight: 8,
    width: '100%',
  };

  const avatarStyle = {
    width: 46,
    height: 46,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,.15)',
    background:
      'linear-gradient(135deg, color-mix(in srgb, var(--accent) 24%, transparent), color-mix(in srgb, var(--accent) 6%, transparent))',
    color: 'var(--accent)',
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '.02em',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    overflow: 'hidden',
    padding: 0,
    flexShrink: 0,
    marginTop: 4,
  };

  return (
    <nav className="chat-rail" style={navStyle} aria-label="Chat sections">
      {/* ---------- Primary nav ---------- */}
      <div className="rail-stack" style={stackStyle}>
        {TABS.map((t) => (
          <RailButton
            key={t.id}
            icon={t.icon}
            label={t.label}
            isActive={activeTab === t.id}
            badge={badgeFor(t.id)}
            onClick={() => onTabChange(t.id)}
            size={22}
          />
        ))}
      </div>

      {/* ---------- Spacer ---------- */}
      <div className="rail-spacer" style={spacerStyle} aria-hidden />

      {/* ---------- Settings ---------- */}
      <div className="rail-stack" style={stackStyle}>
        <RailButton
          icon={Settings}
          label="Chat settings"
          isActive={false}
          variant="secondary"
          onClick={onOpenSettings}
          size={20}
        />
      </div>

      <div className="rail-divider" style={dividerStyle} aria-hidden />

      {/* ---------- Avatar ---------- */}
      {user && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="rail-avatar"
              style={avatarStyle}
              onClick={onOpenProfile}
              aria-label="Your profile"
            >
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <span>{initialsOf(user)}</span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="rail-tip">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') ||
              user.email ||
              'You'}
          </TooltipContent>
        </Tooltip>
      )}
    </nav>
  );
}