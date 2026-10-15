// apps/web/src/features/personal/chats/components/ConversationList.jsx
//
// Left pane of the chat UI. Renders the current user's conversations.
//
// Two modes:
//   archivedMode === false  →  main list. An "Archived (N)" row is shown
//                              at the top when any archived conversations
//                              exist, above any pinned rows.
//   archivedMode === true   →  archived-only view. Header shows a back
//                              arrow; the list contains only archived
//                              conversations.
//
// The FAB (passed as a `fab` prop) is rendered inside the pane so it
// anchors to the list column, not the viewport.

import { useMemo } from 'react';
import { ArrowLeft, Archive, Pin, Lock } from 'lucide-react';

import { useTypingConversations } from '@/shared/api/chat';
import { formatRelative } from '@/shared/format/datetime';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import GroupAvatar from './GroupAvatar';

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

function EmptyTabState({ activeTab, archivedMode }) {
  if (archivedMode) {
    return (
      <div className="chat-list-empty-filtered">
        <strong>No archived chats</strong>
        <p>Archived conversations will appear here.</p>
      </div>
    );
  }
  if (activeTab === 'dms') {
    return (
      <div className="chat-list-empty-filtered">
        <strong>No direct messages</strong>
        <p>Tap the + button below to start one.</p>
      </div>
    );
  }
  if (activeTab === 'groups') {
    return (
      <div className="chat-list-empty-filtered">
        <strong>No groups yet</strong>
        <p>Use the + button below to discover or create one.</p>
      </div>
    );
  }
  return (
    <div className="chat-list-empty">
      <p>No conversations yet.</p>
    </div>
  );
}

export default function ConversationList({
  conversations,
  selectedId,
  currentUserId,
  onSelect,
  activeTab = 'all',
  hideHeader = false,
  fab = null,
  archivedMode = false,
  onArchivedToggle,
}) {
  const { settings } = useSettings();
  const showTypingInList = settings.notifications.showTypingInList;
  const timeFormat = settings.preferences.timeFormat;
  const timezone = settings.preferences.timezone;

  const typingSet = useTypingConversations(currentUserId);

  const { archived, active } = useMemo(() => {
    const arch = [];
    const main = [];
    for (const c of conversations) {
      if (c.isArchived) arch.push(c);
      else main.push(c);
    }
    return { archived: arch, active: main };
  }, [conversations]);

  const source = archivedMode ? archived : active;

  const filtered = useMemo(() => {
    if (activeTab === 'dms') return source.filter((c) => !c.isGroup);
    if (activeTab === 'groups') return source.filter((c) => c.isGroup);
    return source;
  }, [source, activeTab]);

  const { dms, groups } = useMemo(() => {
    const dmArr = [];
    const grpArr = [];
    for (const c of filtered) {
      if (c.isGroup) grpArr.push(c);
      else dmArr.push(c);
    }
    return { dms: sortConversations(dmArr), groups: sortConversations(grpArr) };
  }, [filtered]);

  const showSections =
    activeTab === 'all' && dms.length > 0 && groups.length > 0;

  const renderDmRow = (c) => {
    const peer = c.peer;
    const isOwn = c.lastMessageById === currentUserId;
    const isTyping = showTypingInList && typingSet.has(c.id);
    const preview = c.lastMessageText
      ? (isOwn ? `You: ${c.lastMessageText}` : c.lastMessageText)
      : 'No messages yet';

    const showFriendPill =
      c.isFriend === false &&
      typeof c.messagesRemaining === 'number' &&
      c.messagesRemaining >= 0;

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
            <span className="chat-list-time">
              {formatRelative(c.lastMessageAt, timeFormat, timezone)}
            </span>
          </div>
          <div className="chat-list-row-bottom">
            <span className={`chat-list-preview${isTyping ? ' is-typing' : ''}`}>
              {isTyping ? 'typing...' : preview}
            </span>
            {showFriendPill && (
              <span
                className={`chat-list-friend-pill${
                  c.messagesRemaining === 0 ? ' is-locked' : ''
                }`}
                title={
                  c.messagesRemaining === 0
                    ? 'Add as friend to keep chatting'
                    : `${c.messagesRemaining} free messages left`
                }
              >
                <Lock size={9} />
                {c.messagesRemaining}/3
              </span>
            )}
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
            <span className="chat-list-time">
              {formatRelative(c.lastMessageAt, timeFormat, timezone)}
            </span>
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

  const showEmptyState = filtered.length === 0;

  const headerContent = archivedMode ? (
    <>
      <button
        type="button"
        className="chat-list-back"
        onClick={onArchivedToggle}
        aria-label="Back to conversations"
        title="Back to conversations"
      >
        <ArrowLeft size={14} />
      </button>
      <span className="chat-list-title">Archived</span>
      <span className="chat-list-count-badge">{archived.length}</span>
    </>
  ) : (
    <span className="chat-list-title">Conversations</span>
  );

  return (
    <aside className="chat-list">
      {!hideHeader && (
        <div className={`chat-list-header${archivedMode ? ' is-archived' : ''}`}>
          {headerContent}
        </div>
      )}

      <div className="chat-list-items">
        {!archivedMode && archived.length > 0 && (
          <button
            type="button"
            className="chat-list-archived"
            onClick={onArchivedToggle}
            aria-label={`Archived chats (${archived.length})`}
          >
            <span className="chat-list-archived-icon" aria-hidden>
              <Archive size={14} />
            </span>
            <span className="chat-list-archived-label">Archived</span>
            <span className="chat-list-archived-count">{archived.length}</span>
          </button>
        )}

        {showEmptyState ? (
          <EmptyTabState activeTab={activeTab} archivedMode={archivedMode} />
        ) : (
          <>
            {dms.length > 0 && (
              <>
                {showSections && (
                  <div className="chat-list-section">Direct Messages</div>
                )}
                {dms.map(renderDmRow)}
              </>
            )}
            {groups.length > 0 && (
              <>
                {showSections && <div className="chat-list-section">Groups</div>}
                {groups.map(renderGroupRow)}
              </>
            )}
          </>
        )}
      </div>

      {fab}
    </aside>
  );
}