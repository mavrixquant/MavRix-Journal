// apps/web/src/features/personal/chats/components/ConversationList.jsx
//
// Left pane of the chat UI. Renders the current user's conversations,
// newest activity first, pinned ahead of unpinned.
//
// Live "typing..." hint: uses useTypingConversations(currentUserId) which
// returns a Set<string> of conversation IDs where the peer is typing.
// Replaces the preview text with an accent-colored "typing..." while the
// peer is active. One subscription for the whole list, not one per row.

import { useMemo } from 'react';
import { MessageSquarePlus, Pin } from 'lucide-react';
import { useTypingConversations } from '@/shared/api/chat';

/* ------------------------------------------------------------------ */
/*  Local helpers                                                      */
/* ------------------------------------------------------------------ */

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

function formatRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today - msgDay) / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ------------------------------------------------------------------ */

export default function ConversationList({
  conversations,
  selectedId,
  currentUserId,
  onSelect,
  onNewChat,
}) {
  const sorted = useMemo(() => {
    return [...conversations].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const at = new Date(a.lastMessageAt).getTime() || 0;
      const bt = new Date(b.lastMessageAt).getTime() || 0;
      return bt - at;
    });
  }, [conversations]);

  // Set of conversation ids where the peer is currently typing.
  const typingSet = useTypingConversations(currentUserId);

  return (
    <aside className="chat-list">
      <div className="chat-list-header">
        <span className="chat-list-title">Conversations</span>
        <button
          type="button"
          className="chat-new-btn"
          onClick={onNewChat}
          title="Start a new chat"
          aria-label="Start a new chat"
        >
          <MessageSquarePlus size={14} />
        </button>
      </div>

      <div className="chat-list-items">
        {sorted.length === 0 ? (
          <div className="chat-list-empty">
            <p>No conversations yet.</p>
            <button type="button" className="chat-new-btn-lg" onClick={onNewChat}>
              <MessageSquarePlus size={12} />
              Start a chat
            </button>
          </div>
        ) : (
          sorted.map((c) => {
            const peer = c.peer;
            const isOwn = c.lastMessageById === currentUserId;
            const isTyping = typingSet.has(c.id);
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
                    <span className="chat-list-time">
                      {formatRelative(c.lastMessageAt)}
                    </span>
                  </div>
                  <div className="chat-list-row-bottom">
                    <span
                      className={`chat-list-preview${isTyping ? ' is-typing' : ''}`}
                    >
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
          })
        )}
      </div>
    </aside>
  );
}