// apps/web/src/features/personal/chats/components/MessageThread.jsx
//
// Right pane of the chat UI. Renders:
//   - header (peer info + typing indicator + mobile back button)
//   - infinite-scroll message list (sentinel at the top loads older pages)
//   - composer
//
// Auto-scroll behavior:
//   - On conversation change → jump to bottom.
//   - When a new message arrives → scroll to bottom ONLY if the user was
//     already near the bottom (tracked live by the scroll handler).

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react';

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

const EDIT_WINDOW_MS = 15 * 60 * 1000;

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

/* ------------------------------------------------------------------ */

export default function MessageThread({ conversationId, onBack }) {
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

  /* ---------------- Flatten paginated messages ---------------- */
  // pages[0] = newest page; within each page messages are ascending.
  // Display order: oldest → newest.

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
  const prependAnchorRef = useRef(null); // { height, top } before fetchNextPage

  // Track whether the user is at (or very near) the bottom.
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

  // On conversation change: jump to bottom, reset counters.
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

  // On new message arriving: scroll to bottom IF user was already at bottom.
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

  // Preserve scroll position when older messages are prepended.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // When a fetch-next-page begins, record the current scrollHeight.
    if (isFetchingNextPage && !prependAnchorRef.current) {
      prependAnchorRef.current = { height: el.scrollHeight, top: el.scrollTop };
    }

    // When it completes, adjust scrollTop by the added height.
    if (!isFetchingNextPage && prependAnchorRef.current) {
      const prev = prependAnchorRef.current;
      const delta = el.scrollHeight - prev.height;
      if (delta > 0) {
        el.scrollTop = prev.top + delta;
      }
      prependAnchorRef.current = null;
    }
  }, [isFetchingNextPage]);

  // Sentinel observer — loads the next page when the top sentinel enters view.
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

  /* ---------------- Editing state ---------------- */

  const [nowTs, setNowTs] = useState(0);
  useEffect(() => {
    setNowTs(Date.now());
    const iv = setInterval(() => setNowTs(Date.now()), 30_000);
    return () => clearInterval(iv);
  }, []);

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

  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDelete = useCallback(
    (scope) => {
      if (!deleteTarget) return;
      deleteMessage.mutate(
        { conversationId, messageId: deleteTarget.id, scope },
        { onSuccess: () => setDeleteTarget(null) }
      );
    },
    [deleteTarget, conversationId, deleteMessage]
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

  /* ---------------- Peer info ---------------- */

  const peer = conversation?.peer;
  const peerName = displayNameOf(peer);

  const threadSubClass = peerTyping ? 'chat-thread-sub is-typing' : 'chat-thread-sub';
  const threadSubText = peerTyping ? 'typing…' : (peer?.email || '');

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

        <div className="chat-avatar" style={{ width: 36, height: 36, fontSize: 12 }}>
          {peer?.photoUrl ? <img src={peer.photoUrl} alt="" /> : initialsOf(peer)}
        </div>

        <div className="chat-thread-peer">
          <span className="chat-thread-name">{peerName}</span>
          <span className={threadSubClass}>{threadSubText}</span>
        </div>
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
              This is the beginning of your conversation with {peerName}.
              Send a message to get started.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const prev = messages[idx - 1];
          const showDaySep = !prev || dayKey(prev.createdAt) !== dayKey(msg.createdAt);
          const isOwn = msg.senderId === currentUserId;
          const isDeleted = !!msg.deleted;
          const withinEditWindow =
            isOwn &&
            !isDeleted &&
            nowTs > 0 && (nowTs - new Date(msg.createdAt).getTime()) < EDIT_WINDOW_MS;
          const isEditing = editingId === msg.id;

          return (
            <div key={msg.id} style={{ display: 'contents' }}>
              {showDaySep && (
                <div className="chat-day-sep">{formatDayLabel(msg.createdAt)}</div>
              )}

              <div className={`chat-msg ${isOwn ? 'is-own' : 'is-peer'} ${isDeleted ? 'is-deleted' : ''} ${msg._optimistic ? 'chat-msg-optimistic' : ''}`}>
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
                    {!msg._optimistic && (
                      <div className="chat-msg-actions">
                        {withinEditWindow && (
                          <button
                            type="button"
                            className="chat-msg-btn"
                            onClick={() => startEdit(msg)}
                            title="Edit"
                            aria-label="Edit message"
                          >
                            <Pencil size={11} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="chat-msg-btn is-danger"
                          onClick={() => setDeleteTarget(msg)}
                          title="Delete"
                          aria-label="Delete message"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}

                    <div className="chat-msg-bubble">
                      {isDeleted ? '[message deleted]' : (msg.body || '')}
                    </div>

                    <div className="chat-msg-meta">
                      <span>{formatTime(msg.createdAt)}</span>
                      {msg.editedAt && !isDeleted && (
                        <span className="chat-msg-edited">· edited</span>
                      )}
                      {msg._optimistic && (
                        <span className="chat-msg-edited">· sending…</span>
                      )}
                    </div>
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

      {/* ---------- Delete-choice modal ---------- */}
      {deleteTarget && (
        <div
          className="chat-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="chat-modal">
            <h3>Delete message</h3>
            <p>How would you like to delete this message?</p>

            <div className="chat-modal-actions">
              <button
                type="button"
                className="chat-modal-action"
                onClick={() => handleDelete('me')}
                disabled={deleteMessage.isPending}
              >
                <Trash2 size={13} />
                Delete for me
              </button>

              {deleteTarget.senderId === currentUserId && !deleteTarget.deleted && (
                <button
                  type="button"
                  className="chat-modal-action is-danger"
                  onClick={() => handleDelete('all')}
                  disabled={deleteMessage.isPending}
                >
                  <Trash2 size={13} />
                  Delete for everyone
                </button>
              )}
            </div>

            <button
              type="button"
              className="chat-modal-cancel"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes chatSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}