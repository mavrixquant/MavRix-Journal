import { ArrowLeft, Info, Sparkles } from 'lucide-react';
import GroupAvatar from './GroupAvatar';
import MaveAiAvatar from './MaveAiAvatar';
import Avatar, { displayNameOf } from './Avatar';

export default function ChatHeader({
  conversation,
  typingUserIds = [],
  showTypingInThread = true,
  onBack,
  onTogglePanel,
  panelOpen = false,
}) {
  const isGroup = !!conversation?.isGroup;
  const isAi = !!conversation?.isAi;
  const peer = conversation?.peer;
  const isTyping = typingUserIds.length > 0 && showTypingInThread;

  const name = isGroup ? (conversation?.name || 'Untitled group') : displayNameOf(peer);

  const subText = (() => {
    if (isTyping) return 'typing';
    if (isGroup) {
      const mc = conversation?.memberCount ?? 0;
      const vis = conversation?.visibility === 'private' ? 'Private' : 'Public';
      return `${mc} member${mc === 1 ? '' : 's'} · ${vis}`;
    }
    if (isAi) return 'AI Assistant';
    if (peer?.username) return '@' + peer.username;
    return '';
  })();

  return (
    <header className="chat-header">
      <button type="button" className="chat-header-back" onClick={onBack} aria-label="Back to conversations">
        <ArrowLeft size={20} />
      </button>

      {isGroup ? (
        <GroupAvatar group={conversation} size={42} />
      ) : isAi ? (
        <MaveAiAvatar size={42} />
      ) : (
        <Avatar user={peer} size={42} />
      )}

      <div className="chat-header-text">
        <h3 className="chat-header-name">{name}</h3>
        <span className={`chat-header-sub${isTyping ? ' is-typing' : ''}`}>
          {isAi && !isTyping && <Sparkles size={11} aria-hidden />}
          {subText}
          {isTyping && (
            <span className="typing-dots is-inline" aria-hidden>
              <span /><span /><span />
            </span>
          )}
        </span>
      </div>

      <div className="chat-header-actions">
        <button
          type="button"
          className={`chat-header-action${panelOpen ? ' is-active' : ''}`}
          onClick={onTogglePanel}
          title={isGroup ? 'Group info' : 'Profile'}
          aria-label={isGroup ? 'Toggle group info' : 'Toggle profile'}
          aria-pressed={panelOpen}
        >
          <Info size={19} />
        </button>
      </div>
    </header>
  );
}
