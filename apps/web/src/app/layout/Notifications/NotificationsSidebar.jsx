// ============================================================================
// Notifications sidebar - the right-edge panel opened by the bell icon.
//
// Two tabs:
//   - Common     : chat messages, friend requests, GEX uploads
//   - Broadcasts : admin announcements (changelog reserved for later)
//
// Broadcast notifications are colour-coded by severity (info / warning /
// critical) using the same palette the Admin -> Broadcast page shows, so
// the level a user sees in the feed matches the level an admin picked when
// composing it.
//
// Backed by per-user rows in Postgres. Live updates arrive via the
// `notification:new` SSE event which invalidates the ['notifications']
// query prefix - this panel refreshes itself automatically.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  MessageCircle,
  UserPlus,
  UserCheck,
  Layers,
  Megaphone,
  Sparkles,
  Info,
  CheckCheck,
  Trash2,
  Eraser,
  Inbox,
  Loader2,
} from 'lucide-react';

import Portal from '@/shared/components/Portal';
import { useChangelogModal } from '@/features/changelog/ChangelogContext';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useClearReadNotifications,
} from '@/shared/api/notifications';

import './NotificationsSidebar.css';

/* Non-broadcast types still use a fixed colour per type. */
const TYPE_META = {
  chat:           { icon: MessageCircle, color: '#378ADD', label: 'Chat' },
  friend_request: { icon: UserPlus,      color: '#A78BFA', label: 'Friend request' },
  friend_accept:  { icon: UserCheck,     color: '#4ade80', label: 'Friend accepted' },
  gex_update:     { icon: Layers,        color: '#F59E0B', label: 'GEX update' },
  broadcast:      { icon: Megaphone,     color: '#F87171', label: 'Announcement' },
  changelog:      { icon: Sparkles,      color: '#22D3EE', label: 'Changelog' },
  system:         { icon: Info,          color: '#8892A3', label: 'System' },
};

/* Broadcast colour scale - mirrors Admin -> Broadcast page levels.
 *  info     : var(--accent)   (amber, subtle)      - matches .abp-preview.info
 *  warning  : var(--accent-2) (brighter amber + glow) - matches .abp-preview.warning
 *  critical : red + glow                             - matches .abp-preview.critical
 * Using CSS custom properties so the palette follows the user's accent choice.
 */
const BROADCAST_LEVEL_STYLE = {
  info: {
    color: 'var(--accent)',
    background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
    border: '1px solid color-mix(in srgb, var(--accent) 32%, transparent)',
    boxShadow: undefined,
  },
  warning: {
    color: 'var(--accent-2, #FDE68A)',
    background: 'color-mix(in srgb, var(--accent) 22%, transparent)',
    border: '1px solid color-mix(in srgb, var(--accent) 55%, transparent)',
    boxShadow: '0 0 12px -4px color-mix(in srgb, var(--accent) 55%, transparent)',
  },
  critical: {
    color: '#f87171',
    background: 'rgba(239,68,68,.14)',
    border: '1px solid rgba(239,68,68,.48)',
    boxShadow: '0 0 14px -4px rgba(239,68,68,.55)',
  },
};

function resolveVisual(n) {
  if (n.type === 'broadcast') {
    const lvl = String(n.data && n.data.level ? n.data.level : 'info').toLowerCase();
    const s = BROADCAST_LEVEL_STYLE[lvl] || BROADCAST_LEVEL_STYLE.info;
    return {
      icon: Megaphone,
      color: s.color,
      background: s.background,
      border: s.border,
      boxShadow: s.boxShadow,
    };
  }
  const base = TYPE_META[n.type] || TYPE_META.system;
  return {
    icon: base.icon,
    color: base.color,
    background: base.color + '18',
    border: '1px solid ' + base.color + '44',
    boxShadow: undefined,
  };
}

const TABS = [
  { id: 'common',     label: 'Common' },
  { id: 'broadcasts', label: 'Broadcasts' },
];

function relTime(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  const d = Math.floor(h / 24);
  if (d < 7) return d + 'd';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dayKey(iso) {
  const d = new Date(iso);
  return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
}

function groupByDay(items) {
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const y0 = new Date(t0); y0.setDate(t0.getDate() - 1);

  const groups = new Map();
  for (const n of items) {
    const d = new Date(n.createdAt);
    const dk = dayKey(n.createdAt);
    let label;
    if (d >= t0) label = 'Today';
    else if (d >= y0) label = 'Yesterday';
    else label = d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
    if (!groups.has(dk)) groups.set(dk, { label: label, items: [] });
    groups.get(dk).items.push(n);
  }
  return [...groups.values()];
}

export default function NotificationsSidebar({ isOpen = false, onClose }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('common');
  const { openSpecific } = useChangelogModal();

  const { data: common = [], isLoading: loadingCommon } = useNotifications({
    section: 'common', limit: 100, enabled: isOpen,
  });
  const { data: broadcasts = [], isLoading: loadingBroadcasts } = useNotifications({
    section: 'broadcasts', limit: 100, enabled: isOpen,
  });

  const { data: commonUnread = 0 } = useUnreadNotificationCount({
    section: 'common', enabled: isOpen,
  });
  const { data: broadcastsUnread = 0 } = useUnreadNotificationCount({
    section: 'broadcasts', enabled: isOpen,
  });

  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const del = useDeleteNotification();
  const clearRead = useClearReadNotifications();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const items = tab === 'common' ? common : broadcasts;
  const loading = tab === 'common' ? loadingCommon : loadingBroadcasts;
  const unreadForTab = tab === 'common' ? commonUnread : broadcastsUnread;

  const groups = useMemo(() => groupByDay(items), [items]);
  const hasRead = useMemo(() => items.some((n) => n.readAt), [items]);

  if (!isOpen) return null;

  const handleClick = (n) => {
    if (!n.readAt) markRead.mutate(n.id);
    const d = n.data || {};

    if (n.type === 'chat' && d.conversationId) {
      onClose();
      navigate(`/personal/chats?c=${encodeURIComponent(d.conversationId)}`);
    } else if (n.type === 'friend_request' || n.type === 'friend_accept') {
      onClose();
      navigate('/personal/chats?tab=friends&requests=1');
    } else if (n.type === 'gex_update') {
      onClose();
      const params = new URLSearchParams();
      if (d.symbol) params.set('symbol', d.symbol);
      if (d.date) params.set('date', d.date);
      const qs = params.toString();
      navigate(`/utilities/gex${qs ? `?${qs}` : ''}`);
    } else if (n.type === 'changelog' && d.version) {
      onClose();
      openSpecific(d.version);
    } else if (d.link) {
      onClose();
      navigate(d.link);
    }
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    del.mutate(id);
  };

  return (
    <Portal>
      <div
        className="notif-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        <aside className="notif-sidebar">
          <header className="notif-header">
            <span className="notif-header-icon" aria-hidden>
              <Bell size={17} />
            </span>
            <div className="notif-header-text">
              <h2 className="notif-header-title">Notifications</h2>
              <p className="notif-header-sub">
                {commonUnread + broadcastsUnread > 0
                  ? (commonUnread + broadcastsUnread) + ' unread'
                  : 'All caught up'}
              </p>
            </div>
            <button
              type="button"
              className="notif-header-btn"
              onClick={onClose}
              aria-label="Close notifications"
              title="Close"
            >
              <X size={16} />
            </button>
          </header>

          <div className="notif-tabs" role="tablist">
            {TABS.map((t) => {
              const unread = t.id === 'common' ? commonUnread : broadcastsUnread;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={'notif-tab' + (active ? ' is-active' : '')}
                  onClick={() => setTab(t.id)}
                >
                  <span>{t.label}</span>
                  {unread > 0 && (
                    <span className="notif-tab-badge">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {(unreadForTab > 0 || hasRead) && (
            <div className="notif-actions">
              <button
                type="button"
                className="notif-action-btn"
                onClick={() => markAll.mutate(tab)}
                disabled={markAll.isPending || unreadForTab === 0}
                title="Mark every notification in this tab as read"
              >
                <CheckCheck size={11} /> Mark all read
              </button>
              {hasRead && (
                <button
                  type="button"
                  className="notif-action-btn"
                  onClick={() => clearRead.mutate()}
                  disabled={clearRead.isPending}
                  title="Delete every notification that has already been read"
                >
                  <Eraser size={11} /> Clear read
                </button>
              )}
            </div>
          )}

          <div className="notif-body">
            {loading ? (
              <div className="notif-loading">
                <Loader2 size={20} className="notif-spinner" />
                <span>Loading notifications...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">
                  <Inbox size={24} />
                </div>
                <span className="notif-empty-title">No notifications yet</span>
                <span>
                  {tab === 'common'
                    ? 'New messages, friend requests and GEX uploads will appear here.'
                    : 'Admin announcements and future changelogs will appear here.'}
                </span>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.label}>
                  <div className="notif-day-header">{group.label}</div>
                  {group.items.map((n) => {
                    const v = resolveVisual(n);
                    const Icon = v.icon;
                    const unread = !n.readAt;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        className={'notif-item' + (unread ? ' is-unread' : '')}
                        style={{ '--notif-accent': v.color }}
                        onClick={() => handleClick(n)}
                      >
                        <span
                          className="notif-icon"
                          style={{
                            background: v.background,
                            border: v.border,
                            color: v.color,
                            boxShadow: v.boxShadow,
                          }}
                        >
                          <Icon size={16} />
                        </span>
                        <div className="notif-content">
                          <div className="notif-title-row">
                            <span className="notif-title">{n.title}</span>
                            <span className="notif-time">{relTime(n.createdAt)}</span>
                          </div>
                          {n.body && (
                            <div className="notif-body-text">{n.body}</div>
                          )}
                        </div>
                        <div className="notif-item-actions">
                          <button
                            type="button"
                            className="notif-icon-btn is-danger"
                            onClick={(e) => handleDelete(e, n.id)}
                            title="Delete"
                            aria-label="Delete notification"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </Portal>
  );
}