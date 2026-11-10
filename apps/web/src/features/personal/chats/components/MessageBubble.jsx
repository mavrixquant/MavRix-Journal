import { Pencil, MoreHorizontal, CornerUpLeft, Check, CheckCheck, Clock } from 'lucide-react';
import { formatTime } from '@/shared/format/datetime';
import MaveAiAvatar from './MaveAiAvatar';
import SystemMessage from './SystemMessage';
import MessageBody from './MessageBody';
import Avatar, { displayNameOf } from './Avatar';

function Ticks({ message }) {
  if (message._optimistic) return <Clock size={12} className="msg-tick is-sending" aria-label="Sending" />;
  if (message.readAt) return <CheckCheck size={14} className="msg-tick is-read" aria-label="Read" />;
  if (message.deliveredAt) return <CheckCheck size={14} className="msg-tick is-delivered" aria-label="Delivered" />;
  return <Check size={13} className="msg-tick is-sent" aria-label="Sent" />;
}

export default function MessageBubble({
  message, isOwn, isGroup, isFirstInGroup, isLastInGroup, timeFormat, timezone,
  isEditing, editText, onEditChange, onEditSubmit, onEditCancel, onEditStart,
  onReply, onContextMenu, canEdit, replyParent, onJumpToReply,
  onTouchStart, onTouchMove, onTouchEnd, onTouchCancel,
}) {
  const isSystem = message.kind === 'system' || message.kind === 'ai_switch';
  if (isSystem) return <SystemMessage body={message.body} kind={message.kind} />;

  const isDeleted = !!message.deleted;
  const isAi = message.sender?.isAi;
  const showSenderName = !isOwn && isGroup && isFirstInGroup;
  const showHover = !message._optimistic && !isDeleted && !isEditing;

  const rowCls = [
    'msg-row',
    isOwn ? 'is-own' : 'is-peer',
    isFirstInGroup ? 'is-first' : '',
    isLastInGroup ? 'is-last' : '',
    message._optimistic ? 'is-optimistic' : '',
    isDeleted ? 'is-deleted' : '',
  ].filter(Boolean).join(' ');

  const jump = (e) => {
    e.stopPropagation();
    if (message.replyToId) onJumpToReply?.(message.replyToId);
  };
  const jumpKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      jump(e);
    }
  };

  return (
    <div
      className={rowCls}
      data-msg-id={message.id}
      onContextMenu={(e) => {
        if (message._optimistic) return;
        e.preventDefault();
        onContextMenu(message, e);
      }}
      onTouchStart={(e) => onTouchStart?.(message, e)}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      {!isOwn && (
        isFirstInGroup ? (
          isAi ? <MaveAiAvatar size={34} /> : <Avatar user={message.sender} size={34} />
        ) : (
          <div className="msg-avatar-spacer" aria-hidden />
        )
      )}

      <div className="msg-col">
        {showSenderName && (
          <div className="msg-sender">{isAi ? 'Mave AI' : displayNameOf(message.sender)}</div>
        )}

        {isEditing ? (
          <div className="msg-edit-wrap">
            <textarea
              className="msg-edit-input"
              value={editText}
              autoFocus
              maxLength={4000}
              aria-label="Edit message"
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onEditSubmit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onEditCancel();
                }
              }}
            />
            <div className="msg-edit-actions">
              <span className="msg-edit-hint">Esc to cancel · Enter to save</span>
              <button type="button" className="msg-edit-btn" onClick={onEditCancel}>Cancel</button>
              <button type="button" className="msg-edit-btn is-save" onClick={onEditSubmit} disabled={!editText.trim()}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="msg-bubble-wrap">
            <div className={`msg-bubble${isDeleted ? ' is-deleted' : ''}`}>
              {replyParent && !isDeleted && (
                <div
                  className="msg-reply-quote"
                  role="button"
                  tabIndex={0}
                  title="Jump to replied message"
                  onClick={jump}
                  onKeyDown={jumpKey}
                >
                  <span className="msg-reply-quote-name">
                    <CornerUpLeft size={11} />
                    {displayNameOf(replyParent.sender)}
                  </span>
                  <span className="msg-reply-quote-body">
                    {(replyParent.body || 'earlier message').slice(0, 120)}
                  </span>
                </div>
              )}
              {isDeleted ? 'This message was deleted' : <MessageBody body={message.body || ''} />}
            </div>

            {showHover && (
              <div className="msg-hover-actions">
                <button type="button" className="msg-hover-btn" onClick={() => onReply(message)} title="Reply" aria-label="Reply">
                  <CornerUpLeft size={14} />
                </button>
                {canEdit && (
                  <button type="button" className="msg-hover-btn" onClick={() => onEditStart(message)} title="Edit" aria-label="Edit message">
                    <Pencil size={14} />
                  </button>
                )}
                <button type="button" className="msg-hover-btn" onClick={(e) => onContextMenu(message, e)} title="More" aria-label="More actions">
                  <MoreHorizontal size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {isLastInGroup && !isEditing && (
          <div className="msg-meta">
            <span>{formatTime(message.createdAt, timeFormat, timezone)}</span>
            {message.editedAt && !isDeleted && <span className="msg-edited">· edited</span>}
            {isOwn && !isDeleted && <Ticks message={message} />}
          </div>
        )}
      </div>
    </div>
  );
}
