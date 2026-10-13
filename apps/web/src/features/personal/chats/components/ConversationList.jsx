// apps/web/src/features/personal/chats/components/ConversationList.jsx
//
// Left pane of the chat UI. Renders the current user's conversations,
// grouped into "Direct Messages" and "Groups" sections when the "All" tab
// is active. Filterable via segmented tabs (All / DMs / Groups).
//
// Preferences honoured:
//   notifications.showTypingInList → hide the inline "typing…" hint when off
//   preferences.timeFormat         → 12h / 24h for today's timestamps
//
// Header actions:
//   • Discover     — always visible, opens the public-groups modal
//   • New group    — admin / superadmin only, opens the create-group modal
//   • New DM       — always visible, opens the user-search modal

import { useMemo } from 'react';
import {
  MessageSquarePlus,
  Pin,
  Compass,
  Users,
} from 'lucide-react';

import { useTypingConversations } from '@/shared/api/chat';
import { formatRelative } from '@/shared/format/datetime';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import GroupAvatar from './GroupAvatar';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'dms', label: 'DMs' },
  { id: 'groups', label: 'Groups' },
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

function displayNameOf(user) {
  if (!user) return 'Unknown';
  const a = (user.firstName || '').trim();
  const b = (user.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return user.email || 'Unknown';
}



function sortConversations(arr) {
  return [...arr].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const at = new Date(a.lastMessageAt).getTime() || 0;
    const bt = new Date(b.lastMessageAt).getTime() || 0;
    return bt - at;
  });
}

/* ------------------------------------------------------------------ */
/*  Empty states                                                       */
/* ------------------------------------------------------------------ */

function EmptyTabState({ activeTab, onNewChat, onDiscover, onCreateGroup, isAdmin }) {
  if (activeTab === 'dms') {
    return (
      <div className="chat-list-empty-filtered">
        <MessageSquarePlus size={22} style={{ opacity: .5 }} />
        <strong>No direct messages</strong>
        <p>Start a conversation with a teammate.</p>
        <div className="chat-list-empty-actions">
          <button type="button" className="chat-new-btn-lg" onClick={onNewChat}>
            <MessageSquarePlus size={12} />
            New DM
          </button>
        </div>
      </div>
    );
  }

  if (activeTab === 'groups') {
    return (
      <div className="chat-list-empty-filtered">
        <Users size={22} style={{ opacity: .5 }} />
        <strong>No groups yet</strong>
        <p>Discover public groups or create your own.</p>
        <div className="chat-list-empty-actions">
          <button type="button" className="chat-new-btn-lg" onClick={onDiscover}>
            <Compass size={12} />
            Discover
          </button>
          {isAdmin && (
            <button type="button" className="chat-new-btn-lg" onClick={onCreateGroup}>
              <Users size={12} />
              Create
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-list-empty">
      <p>No conversations yet.</p>
      <button type="button" className="chat-new-btn-lg" onClick={onNewChat}>
        <MessageSquarePlus size={12} />
        Start a chat
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function ConversationList({
  conversations,
  selectedId,
  currentUserId,
  onSelect,
  onNewChat,
  onDiscover,
  onCreateGroup,
  isAdmin,
  activeTab,
  onTabChange,
  counts,
}) {
  const { settings } = useSettings();
  const showTypingInList = settings.notifications.showTypingInList;
  const timeFormat = settings.preferences.timeFormat;
  const timezone = settings.preferences.timezone;

  const typingSet = useTypingConversations(currentUserId);

  const filtered = useMemo(() => {
    if (activeTab === 'dms') return conversations.filter((c) => !c.isGroup);
    if (activeTab === 'groups') return conversations.filter((c) => c.isGroup);
    return conversations;
  }, [conversations, activeTab]);

  const { dms, groups } = useMemo(() => {
    const dmArr = [];
    const grpArr = [];
    for (const c of filtered) {
      if (c.isGroup) grpArr.push(c);
      else dmArr.push(c);
    }
    return {
      dms: sortConversations(dmArr),
      groups: sortConversations(grpArr),
    };
  }, [filtered]);

  const showDmHeader = activeTab === 'all' && dms.length > 0 && groups.length > 0;
  const showGroupHeader = activeTab === 'all' && dms.length > 0 && groups.length > 0;

  /* ---------------- Row renderers ---------------- */

  const renderDmRow = (c) => {
    const peer = c.peer;
    const isOwn = c.lastMessageById === currentUserId;
    const isTyping = showTypingInList && typingSet.has(c.id);
    const preview = c.lastMessageText
      ? (isOwn ? `You: ${c.lastMessageText}` : c.lastMessageText)
      : 'No messages yet';

    return (
      <button
        key={c.id}
        type="button"
        className={`chat-list-row${c.id === selectedId ? ' is-active' : ''}`}
        onClick={() => onSelect(c.id)}
      >
        <div className="chat-avatar">
          {peer?.photoUrl ? (
            <img src={peer.photoUrl} alt="" />
          ) : (
            initialsOf(peer)
          )}
        </div>

        <div className="chat-list-body">
          <div className="chat-list-row-top">
            <span className="chat-list-name">{displayNameOf(peer)}</span>
            <span className="chat-list-time">{formatRelative(c.lastMessageAt, timeFormat, timezone)}</span>
          </div>
          <div className="chat-list-row-bottom">
            <span className={`chat-list-preview${isTyping ? ' is-typing' : ''}`}>
              {isTyping ? 'typing...' : preview}
            </span>
            {c.isPinned && <Pin size={10} className="chat-list-pin" />}
            {c.unreadCount > 0 && (
              <span className="chat-list-badge">
                {c.unreadCount > 99 ? '99+' : c.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  const renderGroupRow = (c) => {
    const isOwn = c.lastMessageById === currentUserId;
    const isTyping = showTypingInList && typingSet.has(c.id);
    const preview = c.lastMessageText
      ? (isOwn ? `You: ${c.lastMessageText}` : c.lastMessageText)
      : 'No messages yet';

    return (
      <button
        key={c.id}
        type="button"
        className={`chat-list-row is-group${c.id === selectedId ? ' is-active' : ''}`}
        onClick={() => onSelect(c.id)}
      >
        <GroupAvatar group={c} size={40} />

        <div className="chat-list-body">
          <div className="chat-list-row-top">
            <span className="chat-list-name">{c.name || 'Untitled group'}</span>
            <span className="chat-list-time">{formatRelative(c.lastMessageAt, timeFormat, timezone)}</span>
          </div>
          <div className="chat-list-row-bottom">
            <span className={`chat-list-preview${isTyping ? ' is-typing' : ''}`}>
              {isTyping ? 'typing...' : preview}
            </span>
            {c.isPinned && <Pin size={10} className="chat-list-pin" />}
            {c.unreadCount > 0 && (
              <span className="chat-list-badge">
                {c.unreadCount > 99 ? '99+' : c.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  /* ---------------- Render ---------------- */

  const showEmptyState = filtered.length === 0;

  return (
    <aside className="chat-list">
      <div className="chat-list-header">
        <span className="chat-list-title">Conversations</span>
        <div className="chat-list-actions">
          {isAdmin && (
            <button
              type="button"
              className="chat-new-btn is-accent"
              onClick={onCreateGroup}
              title="New group"
              aria-label="New group"
            >
              <Users size={14} />
            </button>
          )}
          <button
            type="button"
            className="chat-new-btn"
            onClick={onDiscover}
            title="Discover public groups"
            aria-label="Discover public groups"
          >
            <Compass size={14} />
          </button>
          <button
            type="button"
            className="chat-new-btn"
            onClick={onNewChat}
            title="New direct message"
            aria-label="New direct message"
          >
            <MessageSquarePlus size={14} />
          </button>
        </div>
      </div>

      <div className="chat-tabs" role="tablist" aria-label="Filter conversations">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`chat-tab${activeTab === t.id ? ' is-active' : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            <span>{t.label}</span>
            <span className="chat-tab-count">{counts?.[t.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="chat-list-items">
        {showEmptyState ? (
          <EmptyTabState
            activeTab={activeTab}
            onNewChat={onNewChat}
            onDiscover={onDiscover}
            onCreateGroup={onCreateGroup}
            isAdmin={isAdmin}
          />
        ) : (
          <>
            {dms.length > 0 && (
              <>
                {showDmHeader && (
                  <div className="chat-list-section">Direct Messages</div>
                )}
                {dms.map(renderDmRow)}
              </>
            )}

            {groups.length > 0 && (
              <>
                {showGroupHeader && (
                  <div className="chat-list-section">Groups</div>
                )}
                {groups.map(renderGroupRow)}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}