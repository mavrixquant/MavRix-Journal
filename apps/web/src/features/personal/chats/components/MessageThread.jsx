// apps/web/src/features/personal/chats/components/MessageThread.jsx
//
// Right pane of the chat UI. Renders:
//   - header (peer info + typing indicator + mobile back button)
//     For groups: GroupAvatar + name + member count + settings cog (admins only)
//   - infinite-scroll message list (sentinel at the top loads older pages)
//     For groups: sender avatar + name above every peer bubble
//   - composer
//
// Read receipts (ticks) on OWN messages only:
//   _optimistic       -> clock icon (sending)
//   deliveredAt=null  -> single grey check (sent)
//   deliveredAt set   -> double grey check (delivered)
//   readAt set        -> double green check (read)
//
// Message actions (Edit / Delete) via right-click / long-press only.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Check,
  CheckCheck,
  Clock,
  Settings,
} from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import {
  useChatMessages,
  useChatConversation,
  useTypingIndicator,
  useMarkRead,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  useSendTyping,
} from '@/shared/api/chat';

import MessageComposer from './MessageComposer';
import MessageContextMenu from './MessageContextMenu';
import GroupAvatar from './GroupAvatar';
import GroupSettingsModal from './GroupSettingsModal';

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const LONG_PRESS_MS = 550;

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
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

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function dayKey(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDayLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today - msgDay) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function MessageTicks({ msg }) {
  if (msg._optimistic) {
    return <Clock size={12} className="chat-tick is-sending" aria-label="Sending" />;
  }
  if (msg.readAt) {
    return <CheckCheck size={13} className="chat-tick is-read" aria-label="Read" />;
  }
  if (msg.deliveredAt) {
    return <CheckCheck size={13} className="chat-tick is-delivered" aria-label="Delivered" />;
  }
  return <Check size={12} className="chat-tick is-sent" aria-label="Sent" />;
}

/* ------------------------------------------------------------------ */

export default function MessageThread({ conversationId, onBack, onConversationClosed }) {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const { data: conversation, isLoading: convoLoading } =
    useChatConversation(conversationId);

  const {
    data,
    isLoading: messagesLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useChatMessages(conversationId);

  const typingUserIds = useTypingIndicator(conversationId, currentUserId);
  const peerTyping = typingUserIds.length > 0;

  const markRead = useMarkRead();
  const sendMessage = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const sendTyping = useSendTyping();

  const isGroup = !!conversation?.isGroup;

  /* ---------------- Settings modal state ---------------- */
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Who can open the group settings modal?
  //   superadmin → any group
  //   admin      → public groups + groups they created
  const canManageGroup =
    isGroup &&
    conversation &&
    (
      user?.role === 'superadmin' ||
      (user?.role === 'admin' && conversation.visibility === 'public') ||
      conversation.createdById === currentUserId
    );

  /* ---------------- Flatten paginated messages ---------------- */

  const messages = useMemo(() => {
    if (!data?.pages) return [];
    const all = [];
    for (let i = data.pages.length - 1; i >= 0; i--) {
      const page = data.pages[i];
      if (page?.messages) {
        for (const m of page.messages) all.push(m);
      }
    }
    return all;
  }, [data]);

  /* ---------------- Scroll refs + auto-scroll ---------------- */

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);
  const atBottomRef = useRef(true);
  const lastCountRef = useRef(0);
  const prependAnchorRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      atBottomRef.current = distance < 120;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    lastCountRef.current = 0;
    atBottomRef.current = true;
    const el = scrollRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [conversationId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nextCount = messages.length;
    if (nextCount > lastCountRef.current && atBottomRef.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
    lastCountRef.current = nextCount;
  }, [messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (isFetchingNextPage && !prependAnchorRef.current) {
      prependAnchorRef.current = { height: el.scrollHeight, top: el.scrollTop };
    }

    if (!isFetchingNextPage && prependAnchorRef.current) {
      const prev = prependAnchorRef.current;
      const delta = el.scrollHeight - prev.height;
      if (delta > 0) {
        el.scrollTop = prev.top + delta;
      }
      prependAnchorRef.current = null;
    }
  }, [isFetchingNextPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }
      },
      { root: scrollRef.current, rootMargin: '80px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /* ---------------- Mark read on open + new inbound ---------------- */

  const lastReadCountRef = useRef(0);
  useEffect(() => {
    if (!conversationId) return;
    if (messages.length === lastReadCountRef.current) return;
    lastReadCountRef.current = messages.length;
    if (document.visibilityState !== 'visible') return;
    markRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages.length]);

  /* ---------------- nowTs for edit-window checks ---------------- */

  const [nowTs, setNowTs] = useState(0);
  useEffect(() => {
    setNowTs(Date.now());
    const iv = setInterval(() => setNowTs(Date.now()), 30_000);
    return () => clearInterval(iv);
  }, []);

  /* ---------------- Context menu state ---------------- */

  const [ctxMenu, setCtxMenu] = useState(null);
  const openContextMenu = useCallback((x, y, message) => {
    setCtxMenu({ x, y, message });
  }, []);
  const closeContextMenu = useCallback(() => {
    setCtxMenu(null);
  }, []);

  const longPressRef = useRef({ timer: null, fired: false });

  const handleMessageTouchStart = useCallback(
    (msg, e) => {
      if (msg._optimistic) return;
      const touch = e.touches?.[0];
      if (!touch) return;
      longPressRef.current.fired = false;
      longPressRef.current.timer = setTimeout(() => {
        longPressRef.current.fired = true;
        openContextMenu(touch.clientX, touch.clientY, msg);
      }, LONG_PRESS_MS);
    },
    [openContextMenu]
  );

  const cancelLongPress = useCallback(() => {
    if (longPressRef.current.timer) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current.timer = null;
    }
  }, []);

  const handleMessageContextMenu = useCallback(
    (msg, e) => {
      if (msg._optimistic) return;
      e.preventDefault();
      openContextMenu(e.clientX, e.clientY, msg);
    },
    [openContextMenu]
  );

  useEffect(() => () => cancelLongPress(), [cancelLongPress]);

  /* ---------------- Editing state ---------------- */

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const startEdit = useCallback((msg) => {
    setEditingId(msg.id);
    setEditText(msg.body || '');
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const submitEdit = useCallback(() => {
    const trimmed = editText.trim();
    if (!trimmed || !editingId) return;
    editMessage.mutate(
      { conversationId, messageId: editingId, body: trimmed },
      { onSuccess: () => { setEditingId(null); setEditText(''); } }
    );
  }, [editText, editingId, conversationId, editMessage]);

  /* ---------------- Delete flow ---------------- */

  const handleDeleteMe = useCallback(
    (msg) => {
      deleteMessage.mutate({ conversationId, messageId: msg.id, scope: 'me' });
    },
    [conversationId, deleteMessage]
  );

  const handleDeleteAll = useCallback(
    (msg) => {
      deleteMessage.mutate({ conversationId, messageId: msg.id, scope: 'all' });
    },
    [conversationId, deleteMessage]
  );

  /* ---------------- Send ---------------- */

  const handleSend = useCallback(
    (body) => {
      sendMessage.mutate({ conversationId, body, senderId: currentUserId });
    },
    [conversationId, currentUserId, sendMessage]
  );

  const handleTyping = useCallback(
    (isTyping) => {
      sendTyping.mutate({ conversationId, isTyping });
    },
    [conversationId, sendTyping]
  );

  /* ---------------- Header content ---------------- */

  const peer = conversation?.peer;
  const headerName = isGroup
    ? (conversation?.name || 'Untitled group')
    : displayNameOf(peer);

  const threadSubText = (() => {
    if (peerTyping) return 'typing…';
    if (isGroup) {
      const mc = conversation?.memberCount ?? 0;
      const vis = conversation?.visibility === 'private' ? 'Private' : 'Public';
      return `${mc} member${mc === 1 ? '' : 's'} · ${vis}`;
    }
    return peer?.email || '';
  })();

  const threadSubClass = peerTyping ? 'chat-thread-sub is-typing' : 'chat-thread-sub';

  /* ---------------- Early returns ---------------- */

  if (convoLoading && !conversation) {
    return (
      <div className="chat-thread">
        <div className="chat-empty">
          <Loader2 size={22} style={{ animation: 'chatSpin .8s linear infinite' }} />
          <style>{`@keyframes chatSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!conversation) return null;

  /* ---------------- Render ---------------- */

  return (
    <div className="chat-thread">
      {/* ---------- Header ---------- */}
      <div className="chat-thread-header">
        <button
          type="button"
          className="chat-thread-back"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeft size={15} />
        </button>

        {isGroup ? (
          <GroupAvatar group={conversation} size={36} />
        ) : (
          <div className="chat-avatar" style={{ width: 36, height: 36, fontSize: 12 }}>
            {peer?.photoUrl ? <img src={peer.photoUrl} alt="" /> : initialsOf(peer)}
          </div>
        )}

        <div className="chat-thread-peer">
          <span className="chat-thread-name">{headerName}</span>
          <span className={threadSubClass}>{threadSubText}</span>
        </div>

        {canManageGroup && (
          <button
            type="button"
            className="chat-thread-settings"
            onClick={() => setSettingsOpen(true)}
            title="Group settings"
            aria-label="Group settings"
          >
            <Settings size={15} />
          </button>
        )}
      </div>

      {/* ---------- Messages ---------- */}
      <div className="chat-thread-messages" ref={scrollRef}>
        <div ref={sentinelRef} style={{ height: 1 }} />

        {hasNextPage && (
          <button
            type="button"
            className="chat-load-more"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 size={11} style={{ animation: 'chatSpin .8s linear infinite' }} />
                Loading…
              </>
            ) : (
              'Load earlier messages'
            )}
          </button>
        )}

        {messagesLoading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)', fontSize: 12 }}>
            Loading messages…
          </div>
        )}

        {!messagesLoading && messages.length === 0 && (
          <div className="chat-empty" style={{ padding: '60px 20px' }}>
            <div className="chat-empty-icon">
              <Pencil size={22} />
            </div>
            <h3>Say hi 👋</h3>
            <p>
              {isGroup
                ? `This is the beginning of ${headerName}. Send a message to get started.`
                : `This is the beginning of your conversation with ${headerName}. Send a message to get started.`}
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const prev = messages[idx - 1];
          const next = messages[idx + 1];
          const showDaySep = !prev || dayKey(prev.createdAt) !== dayKey(msg.createdAt);
          const isOwn = msg.senderId === currentUserId;
          const isDeleted = !!msg.deleted;
          const isEditing = editingId === msg.id;

          const sameDayAsNext =
            next && dayKey(next.createdAt) === dayKey(msg.createdAt);
          const sameMinuteAsNext =
            next && formatTime(next.createdAt) === formatTime(msg.createdAt);
          const sameSenderAsNext =
            next && next.senderId === msg.senderId;
          const isLastInGroup =
            !next || !sameDayAsNext || !sameMinuteAsNext || !sameSenderAsNext;

          const showEditedBadge = !!(msg.editedAt && !isDeleted);
          const showTicks = isOwn && !isDeleted;
          const showMetaRow = isLastInGroup || showEditedBadge || showTicks;

          // Show sender avatar + name above every peer bubble in groups.
          // Own messages don't need a label — it's implied.
          const showSenderRow = isGroup && !isOwn && !isDeleted;

          const msgCls = [
            'chat-msg',
            isOwn ? 'is-own' : 'is-peer',
            isDeleted ? 'is-deleted' : '',
            isGroup ? 'is-group' : '',
            msg._optimistic ? 'chat-msg-optimistic' : '',
          ].filter(Boolean).join(' ');

          return (
            <div key={msg.id} style={{ display: 'contents' }}>
              {showDaySep && (
                <div className="chat-day-sep">{formatDayLabel(msg.createdAt)}</div>
              )}

              <div
                className={msgCls}
                onContextMenu={(e) => handleMessageContextMenu(msg, e)}
                onTouchStart={(e) => handleMessageTouchStart(msg, e)}
                onTouchMove={cancelLongPress}
                onTouchEnd={cancelLongPress}
                onTouchCancel={cancelLongPress}
              >
                {showSenderRow && (
                  <div className="chat-msg-sender">
                    <span className="chat-msg-sender-avatar">
                      {msg.sender?.photoUrl ? (
                        <img src={msg.sender.photoUrl} alt="" />
                      ) : (
                        initialsOf(msg.sender)
                      )}
                    </span>
                    <span className="chat-msg-sender-name">
                      {displayNameOf(msg.sender)}
                    </span>
                  </div>
                )}

                {isEditing ? (
                  <div className="chat-edit-inline">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value.slice(0, 4000))}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
                        else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                      }}
                    />
                    <div className="chat-edit-actions">
                      <button type="button" className="chat-edit-btn" onClick={cancelEdit}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="chat-edit-btn is-save"
                        onClick={submitEdit}
                        disabled={!editText.trim() || editMessage.isPending}
                      >
                        {editMessage.isPending ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="chat-msg-bubble">
                      {isDeleted ? '[message deleted]' : (msg.body || '')}
                    </div>

                    {showMetaRow && (
                      <div className="chat-msg-meta">
                        {isLastInGroup && <span>{formatTime(msg.createdAt)}</span>}
                        {showEditedBadge && (
                          <span className="chat-msg-edited">
                            {isLastInGroup ? '· edited' : 'edited'}
                          </span>
                        )}
                        {showTicks && <MessageTicks msg={msg} />}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------- Composer ---------- */}
      <MessageComposer
        conversationId={conversationId}
        onSend={handleSend}
        onTyping={handleTyping}
        disabled={false}
        isSending={sendMessage.isPending}
      />

      {/* ---------- Context menu ---------- */}
      {ctxMenu && (
        <MessageContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          canEdit={
            ctxMenu.message.senderId === currentUserId &&
            !ctxMenu.message.deleted &&
            nowTs > 0 &&
            (nowTs - new Date(ctxMenu.message.createdAt).getTime()) < EDIT_WINDOW_MS
          }
          canDeleteAll={
            ctxMenu.message.senderId === currentUserId &&
            !ctxMenu.message.deleted
          }
          onEdit={() => startEdit(ctxMenu.message)}
          onDeleteMe={() => handleDeleteMe(ctxMenu.message)}
          onDeleteAll={() => handleDeleteAll(ctxMenu.message)}
          onClose={closeContextMenu}
        />
      )}

      {/* ---------- Group settings modal (admins only) ---------- */}
      {isGroup && canManageGroup && (
        <GroupSettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          conversation={conversation}
          onConversationClosed={onConversationClosed}
        />
      )}

      <style>{`@keyframes chatSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}