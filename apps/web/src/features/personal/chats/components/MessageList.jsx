
import { useMemo, useRef, useEffect, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';

import EmptyState from '@/shared/components/EmptyState';
import { formatDayLabel, dayKey } from '@/shared/format/datetime';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ThreadSkeleton from './ThreadSkeleton';
import MaveAiTyping from './MaveAiTyping';

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const LONG_PRESS_MS = 550;
const HIGHLIGHT_MS = 2000;

function displayNameOf(user) {
  if (!user) return 'Unknown';
  const a = (user.firstName || '').trim();
  const b = (user.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return user.username || 'Unknown';
}

export default function MessageList({
  messages,
  currentUserId,
  isGroup,
  headerName,
  typingUserIds = [],
  showTypingInThread = true,
  waitingForAi = false,
  timeFormat,
  timezone,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  isLoading,
  editingId,
  editText,
  onEditChange,
  onEditSubmit,
  onEditCancel,
  onEditStart,
  onReply,
  onContextMenu,
  unreadBoundaryMsgId,
  scrollRef,
  sentinelRef,
  canEditMessage,
}) {
  const longPressRef = useRef({ timer: null, fired: false });
  const highlightTimerRef = useRef(null);

  const cancelLongPress = () => {
    if (longPressRef.current.timer) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current.timer = null;
    }
  };

  const handleTouchStart = (msg, e) => {
    if (msg._optimistic) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    longPressRef.current.fired = false;
    longPressRef.current.timer = setTimeout(() => {
      longPressRef.current.fired = true;
      onContextMenu(msg, {
        preventDefault: () => {},
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
    }, LONG_PRESS_MS);
  };

  useEffect(() => () => {
    cancelLongPress();
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
  }, []);

  const handleJumpToMessage = useCallback(
    (messageId) => {
      const container = scrollRef?.current;
      if (!container || !messageId) return;

      const target = container.querySelector(
        `[data-msg-id="${CSS.escape(String(messageId))}"]`
      );
      if (!target) return;

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });

      container.querySelectorAll('.is-jump-highlight').forEach((el) => {
        el.classList.remove('is-jump-highlight');
      });

      const highlightEl = target.closest('.chat-msg-group') || target;
      highlightEl.classList.add('is-jump-highlight');

      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        highlightEl.classList.remove('is-jump-highlight');
        highlightTimerRef.current = null;
      }, HIGHLIGHT_MS);
    },
    [scrollRef]
  );

  const groups = useMemo(() => {
    const list = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const t = new Date(msg.createdAt).getTime();
      const day = dayKey(msg.createdAt, timezone);

      const isFirstInGroup =
        !prev ||
        prev.senderId !== msg.senderId ||
        dayKey(prev.createdAt, timezone) !== day ||
        t - new Date(prev.createdAt).getTime() > GROUP_WINDOW_MS;

      const isLastInGroup =
        !next ||
        next.senderId !== msg.senderId ||
        dayKey(next.createdAt, timezone) !== day ||
        new Date(next.createdAt).getTime() - t > GROUP_WINDOW_MS;

      list.push({ msg, prev, next, day, isFirstInGroup, isLastInGroup });
    }
    return list;
  }, [messages, timezone]);

  const byId = useMemo(() => {
    const m = new Map();
    for (const msg of messages) m.set(msg.id, msg);
    return m;
  }, [messages]);

  const getReplyParent = (msg) => {
    if (!msg.replyToId) return null;
    return (
      byId.get(msg.replyToId) || {
        id: msg.replyToId,
        body: 'earlier message',
        sender: null,
      }
    );
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="chat-messages-scroll" ref={scrollRef}>
        <ThreadSkeleton rows={7} />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="chat-messages-scroll" ref={scrollRef}>
        <div className="chat-messages-empty">
          <EmptyState
            size="md"
            variant="bare"
            icon={MessageSquare}
            eyebrow="No messages"
            title="Say hi 👋"
            description={
              isGroup
                ? `This is the beginning of ${headerName}. Send a message to get started.`
                : `This is the beginning of your conversation with ${headerName}. Send a message to get started.`
            }
          />
        </div>
        <div ref={sentinelRef} />
      </div>
    );
  }

  let lastDay = null;
  let unreadSeparatorRendered = false;

  return (
    <div
      className="chat-messages-scroll"
      ref={scrollRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="Message thread"
    >
      <div ref={sentinelRef} style={{ height: 1 }} />

      {hasNextPage && (
        <button
          type="button"
          className="chat-load-more"
          onClick={() => onLoadMore()}
          disabled={isFetchingNextPage}
          aria-label="Load earlier messages"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
        </button>
      )}

      {groups.map(({ msg, day, isFirstInGroup, isLastInGroup }) => {
        const isOwn = msg.senderId === currentUserId;
        const showDaySep = day !== lastDay;
        lastDay = day;

        const showUnreadSep =
          !unreadSeparatorRendered &&
          unreadBoundaryMsgId &&
          msg.id === unreadBoundaryMsgId;

        if (showUnreadSep) unreadSeparatorRendered = true;

        const replyParent = getReplyParent(msg);
        const canEdit =
          isOwn && !msg.deleted && !msg._optimistic && canEditMessage(msg);

        return (
          <div key={msg.id} className="chat-msg-group">
            {showDaySep && (
              <div className="chat-day-sep" role="separator">
                <time dateTime={msg.createdAt}>
                  {formatDayLabel(msg.createdAt, timezone)}
                </time>
              </div>
            )}
            {showUnreadSep && (
              <div className="chat-unread-sep">
                <span>New messages</span>
              </div>
            )}

            <MessageBubble
              message={msg}
              isOwn={isOwn}
              isGroup={isGroup}
              isFirstInGroup={isFirstInGroup}
              isLastInGroup={isLastInGroup}
              timeFormat={timeFormat}
              timezone={timezone}
              isEditing={editingId === msg.id}
              editText={editText}
              onEditChange={onEditChange}
              onEditSubmit={onEditSubmit}
              onEditCancel={onEditCancel}
              onEditStart={onEditStart}
              onReply={onReply}
              onContextMenu={onContextMenu}
              canEdit={canEdit}
              replyParent={replyParent}
              onJumpToReply={handleJumpToMessage}
              onTouchStart={handleTouchStart}
              onTouchMove={cancelLongPress}
              onTouchEnd={cancelLongPress}
              onTouchCancel={cancelLongPress}
            />
          </div>
        );
      })}

      {}
      {waitingForAi && <MaveAiTyping />}

      {typingUserIds.length > 0 && showTypingInThread && (
        <TypingIndicator
          names={typingUserIds.map((id) => {
            for (const m of messages) {
              if (m.senderId === id) return displayNameOf(m.sender);
            }
            return 'Someone';
          })}
        />
      )}
    </div>
  );
}