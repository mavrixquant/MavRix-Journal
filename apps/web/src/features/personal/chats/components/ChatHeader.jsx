// apps/web/src/features/personal/chats/components/ChatHeader.jsx
//
// Conversation header. Shows avatar, name, dynamic subtitle (typing /
// member count / email) and per-type actions (info toggle for DMs,
// settings for groups).

import { ArrowLeft, Info, Settings } from 'lucide-react';
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

export default function ChatHeader({
  conversation,
  typingUserIds = [],
  showTypingInThread = true,
  onBack,
  onTogglePanel,
  onOpenGroupSettings,
  canManageGroup = false,
}) {
  const isGroup = !!conversation?.isGroup;
  const peer = conversation?.peer;
  const isTyping = typingUserIds.length > 0 && showTypingInThread;

  const name = isGroup
    ? (conversation?.name || 'Untitled group')
    : displayNameOf(peer);

  const subText = (() => {
    if (isTyping) return 'typing…';
    if (isGroup) {
      const mc = conversation?.memberCount ?? 0;
      const vis = conversation?.visibility === 'private' ? 'Private' : 'Public';
      return `${mc} member${mc === 1 ? '' : 's'} · ${vis}`;
    }
    return peer?.email || '';
  })();

  return (
    <div className="chat-header">
      <button
        type="button"
        className="chat-header-back"
        onClick={onBack}
        aria-label="Back to conversations"
      >
        <ArrowLeft size={15} />
      </button>

      {isGroup ? (
        <GroupAvatar group={conversation} size={36} />
      ) : (
        <div className="chat-header-avatar">
          {peer?.photoUrl ? (
            <img src={peer.photoUrl} alt="" />
          ) : (
            initialsOf(peer)
          )}
        </div>
      )}

      <div className="chat-header-text">
        <span className="chat-header-name">{name}</span>
        <span className={`chat-header-sub${isTyping ? ' is-typing' : ''}`}>
          {subText}
        </span>
      </div>

      {!isGroup && (
        <button
          type="button"
          className="chat-header-action"
          onClick={onTogglePanel}
          title="Profile"
          aria-label="Toggle profile panel"
        >
          <Info size={15} />
        </button>
      )}

      {isGroup && canManageGroup && (
        <button
          type="button"
          className="chat-header-action"
          onClick={onOpenGroupSettings}
          title="Group settings"
          aria-label="Group settings"
        >
          <Settings size={15} />
        </button>
      )}
    </div>
  );
}