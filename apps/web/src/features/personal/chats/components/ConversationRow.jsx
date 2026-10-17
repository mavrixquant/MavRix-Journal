// apps/web/src/features/personal/chats/components/ConversationRow.jsx
//
// One row in the sidebar list. Pure presentation — no state, no hooks.

import { Pin, Lock } from 'lucide-react';
import { formatRelative } from '@/shared/format/datetime';
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

export default function ConversationRow({
  conversation,
  selected = false,
  currentUserId,
  onClick,
  timeFormat = '12h',
  timezone,
  isTyping = false,
}) {
  const isGroup = conversation.isGroup;
  const isOwn = conversation.lastMessageById === currentUserId;

  const preview = conversation.lastMessageText
    ? (isOwn ? `You: ${conversation.lastMessageText}` : conversation.lastMessageText)
    : 'No messages yet';

  const showFriendPill =
    !isGroup &&
    conversation.isFriend === false &&
    typeof conversation.messagesRemaining === 'number';

  const name = isGroup
    ? (conversation.name || 'Untitled group')
    : displayNameOf(conversation.peer);

  return (
    <button
      type="button"
      className={`conv-row${selected ? ' is-active' : ''}`}
      onClick={onClick}
    >
      {isGroup ? (
        <GroupAvatar group={conversation} size={40} />
      ) : (
        <div className="conv-avatar">
          {conversation.peer?.photoUrl ? (
            <img src={conversation.peer.photoUrl} alt="" />
          ) : (
            initialsOf(conversation.peer)
          )}
        </div>
      )}

      <div className="conv-body">
        <div className="conv-row-top">
          <span className="conv-name">{name}</span>
          <span className="conv-time">
            {formatRelative(conversation.lastMessageAt, timeFormat, timezone)}
          </span>
        </div>

        <div className="conv-row-bottom">
          <span className={`conv-preview${isTyping ? ' is-typing' : ''}`}>
            {isTyping ? 'typing…' : preview}
          </span>

          {showFriendPill && (
            <span
              className={`chat-list-friend-pill${conversation.messagesRemaining === 0 ? ' is-locked' : ''}`}
              title={
                conversation.messagesRemaining === 0
                  ? 'Add as friend to keep chatting'
                  : `${conversation.messagesRemaining} free messages left`
              }
            >
              <Lock size={9} />
              {conversation.messagesRemaining}/3
            </span>
          )}

          {conversation.isPinned && <Pin size={10} className="conv-pin" />}

          {conversation.unreadCount > 0 && (
            <span className="conv-badge">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}