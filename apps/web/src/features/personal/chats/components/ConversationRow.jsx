import { Pin, Lock, BellOff } from 'lucide-react';
import { formatRelative } from '@/shared/format/datetime';
import GroupAvatar from './GroupAvatar';
import Avatar, { displayNameOf } from './Avatar';

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
  const unread = conversation.unreadCount || 0;

  const preview = conversation.lastMessageText
    ? (isOwn ? `You: ${conversation.lastMessageText}` : conversation.lastMessageText)
    : conversation.clearedByMe
      ? 'Chat cleared'
      : 'No messages yet';

  const showFriendPill =
    !isGroup &&
    conversation.isFriend === false &&
    typeof conversation.messagesRemaining === 'number';

  const name = isGroup ? (conversation.name || 'Untitled group') : displayNameOf(conversation.peer);

  const ariaLabel = [
    name,
    unread > 0 ? `${unread} unread` : null,
    conversation.isMuted ? 'muted' : null,
    conversation.isPinned ? 'pinned' : null,
    isTyping ? 'typing' : null,
    conversation.clearedByMe && !conversation.lastMessageText ? 'cleared' : null,
  ]
    .filter(Boolean)
    .join(', ');

  const cls = [
    'conv-row',
    selected ? 'is-active' : '',
    unread > 0 ? 'has-unread' : '',
    conversation.isMuted ? 'is-muted' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      data-conv-row=""
      aria-current={selected ? 'true' : undefined}
      aria-label={ariaLabel}
    >
      {isGroup ? (
        <GroupAvatar group={conversation} size={46} />
      ) : (
        <Avatar user={conversation.peer} size={46} />
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

          <span className="conv-flags">
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
            {conversation.isMuted && <BellOff size={12} className="conv-muted" aria-hidden />}
            {conversation.isPinned && <Pin size={12} className="conv-pin" aria-hidden />}
            {unread > 0 && <span className="conv-badge">{unread > 99 ? '99+' : unread}</span>}
          </span>
        </div>
      </div>
    </button>
  );
}
