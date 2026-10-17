// apps/web/src/features/personal/chats/components/MessageThread.jsx
//
// Right pane of the chat UI. In DMs, when the caller is not friends with
// the peer and the free-message cap is reached, the composer is replaced
// by a locked banner. When the conversation is archived, the composer is
// replaced by an archived banner with an Unarchive CTA.
//
// PHASE 5 CHANGE (EmptyState migration)
// -------------------------------------
//   • The "Say hi 👋" no-messages state now uses the shared <EmptyState>
//     component (@/shared/components/EmptyState).

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Check,
  CheckCheck,
  Clock,
  Settings,
  Info,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import { formatTime, formatDayLabel, dayKey } from '@/shared/format/datetime';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import {
  useChatMessages,
  useChatConversation,
  useTypingIndicator,
  useMarkRead,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  useSendTyping,
  useUpdateConversation,
} from '@/shared/api/chat';
import { useSendFriendRequest, useFriendStatus } from '@/shared/api/friends';
import EmptyState from '@/shared/components/EmptyState';

import MessageComposer from './MessageComposer';
import MessageContextMenu from './MessageContextMenu';
import GroupAvatar from './GroupAvatar';
import GroupSettingsModal from './GroupSettingsModal';
import UserProfileSidebar from './UserProfileSidebar';

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const LONG_PRESS_MS = 550;

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

function MessageTicks({ msg }) {
  if (msg._optimistic) return <Clock size={12} className="chat-tick is-sending" aria-label="Sending" />;
  if (msg.readAt)      return <CheckCheck size={13} className="chat-tick is-read" aria-label="Read" />;
  if (msg.deliveredAt) return <CheckCheck size={13} className="chat-tick is-delivered" aria-label="Delivered" />;
  return <Check size={12} className="chat-tick is-sent" aria-label="Sent" />;
}

export default function MessageThread({
  conversationId,
  onBack,
  onConversationClosed,
  onOpenThread,
}) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const currentUserId = user?.id;

  const timeFormat = settings.preferences.timeFormat;
  const sendReadReceipts = settings.chats.sendReadReceipts;
  const timezone = settings.preferences.timezone;
  const showTypingInThread = settings.chats.showTypingInThread;

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
  const updateConversation = useUpdateConversation();

  const isGroup = !!conversation?.isGroup;
  const peer = conversation?.peer;

  const { data: friendStatus } = useFriendStatus(peer?.id, {
    enabled: !isGroup && !!peer?.id,
  });
  const sendFriendRequest = useSendFriendRequest();

  const isLocked =
    !isGroup &&
    conversation &&
    conversation.isFriend === false &&
    typeof conversation.messagesRemaining === 'number' &&
    conversation.messagesRemaining <= 0;

  const friendRequestPending = !!friendStatus?.hasOutgoingRequest;

  const handleComposerAddFriend = useCallback(async () => {
    if (!peer?.id) return;
    try {
      await sendFriendRequest.mutateAsync({ toUserId: peer.id });
      toast.success(`Friend request sent to ${displayNameOf(peer)}`);
    } catch (err) {
      toast.error(err?.message || 'Could not send friend request');
    }
  }, [peer, sendFriendRequest]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setProfileOpen(false);
    setSettingsOpen(false);
  }, [conversationId]);

  const canManageGroup =
    isGroup &&
    conversation &&
    (
      user?.role === 'superadmin' ||
      (user?.role === 'admin' && conversation.visibility === 'public') ||
      conversation.createdById === currentUserId
    );

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

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);
  const atBottomRef = useRef(true);
  const lastCountRef = useRef(0);
  const prependAnchorRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      const d = el.scrollHeight - el.scrollTop - el.clientHeight;
      atBottomRef.current = d < 120;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    lastCountRef.current = 0;
    atBottomRef.current = true;
    const el = scrollRef.current;
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [conversationId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const n = messages.length;
    if (n > lastCountRef.current && atBottomRef.current) {
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
    lastCountRef.current = n;
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
      if (delta > 0) el.scrollTop = prev.top + delta;
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

  const lastReadCountRef = useRef(0);
  useEffect(() => {
    if (!conversationId) return;
    if (!sendReadReceipts) return;
    if (messages.length === lastReadCountRef.current) return;
    lastReadCountRef.current = messages.length;
    if (document.visibilityState !== 'visible') return;
    markRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages.length, sendReadReceipts]);

  const [nowTs, setNowTs] = useState(0);
  useEffect(() => {
    setNowTs(Date.now());
    const iv = setInterval(() => setNowTs(Date.now()), 30_000);
    return () => clearInterval(iv);
  }, []);

  const [ctxMenu, setCtxMenu] = useState(null);
  const openContextMenu = useCallback((x, y, message) => {
    setCtxMenu({ x, y, message });
  }, []);
  const closeContextMenu = useCallback(() => setCtxMenu(null), []);

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

  const handleDeleteMe = useCallback(
    (msg) => deleteMessage.mutate({ conversationId, messageId: msg.id, scope: 'me' }),
    [conversationId, deleteMessage]
  );
  const handleDeleteAll = useCallback(
    (msg) => deleteMessage.mutate({ conversationId, messageId: msg.id, scope: 'all' }),
    [conversationId, deleteMessage]
  );

  const handleSend = useCallback(
    (body) => sendMessage.mutate({ conversationId, body, senderId: currentUserId }),
    [conversationId, currentUserId, sendMessage]
  );

  const handleTyping = useCallback(
    (isTyping) => sendTyping.mutate({ conversationId, isTyping }),
    [conversationId, sendTyping]
  );

  const isArchived = !!conversation?.isArchived;

  const handleUnarchive = useCallback(() => {
    updateConversation.mutate({
      conversationId,
      patch: { isArchived: false },
    });
  }, [conversationId, updateConversation]);

  const headerName = isGroup
    ? (conversation?.name || 'Untitled group')
    : displayNameOf(peer);

  const threadSubText = (() => {
    if (peerTyping && showTypingInThread) return 'typing…';
    if (isGroup) {
      const mc = conversation?.memberCount ?? 0;
      const vis = conversation?.visibility === 'private' ? 'Private' : 'Public';
      return `${mc} member${mc === 1 ? '' : 's'} · ${vis}`;
    }
    return peer?.email || '';
  })();

  const threadSubClass =
    peerTyping && showTypingInThread ? 'chat-thread-sub is-typing' : 'chat-thread-sub';

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

  return (
    <div className="chat-thread-wrap">
      <div className="chat-thread">
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
            <button
              type="button"
              className="chat-thread-avatar-btn"
              onClick={() => setProfileOpen((v) => !v)}
              aria-label={`Open ${headerName}'s profile`}
              title="Open profile"
            >
              <span className="chat-avatar" style={{ width: 36, height: 36, fontSize: 12 }}>
                {peer?.photoUrl ? <img src={peer.photoUrl} alt="" /> : initialsOf(peer)}
              </span>
            </button>
          )}

          <div className="chat-thread-peer">
            <span className="chat-thread-name">{headerName}</span>
            <span className={threadSubClass}>{threadSubText}</span>
          </div>

          {!isGroup && (
            <button
              type="button"
              className={`chat-thread-settings${profileOpen ? ' is-active' : ''}`}
              onClick={() => setProfileOpen((v) => !v)}
              aria-label="Toggle profile"
              title="Profile"
            >
              <Info size={15} />
            </button>
          )}

          {isGroup && canManageGroup && (
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
              ) : ('Load earlier messages')}
            </button>
          )}

          {messagesLoading && messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)', fontSize: 12 }}>
              Loading messages…
            </div>
          )}

          {!messagesLoading && messages.length === 0 && (
            <div style={{ padding: '20px 12px' }}>
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
          )}

          {messages.map((msg, idx) => {
            const prev = messages[idx - 1];
            const next = messages[idx + 1];
            const showDaySep =
              !prev ||
              dayKey(prev.createdAt, timezone) !== dayKey(msg.createdAt, timezone);
            const isOwn = msg.senderId === currentUserId;
            const isDeleted = !!msg.deleted;
            const isEditing = editingId === msg.id;

            const sameDayAsNext =
              next && dayKey(next.createdAt) === dayKey(msg.createdAt, timezone);
            const sameMinuteAsNext =
              next &&
              formatTime(next.createdAt, timeFormat) ===
                formatTime(msg.createdAt, timeFormat, timezone);
            const sameSenderAsNext = next && next.senderId === msg.senderId;
            const isLastInGroup =
              !next || !sameDayAsNext || !sameMinuteAsNext || !sameSenderAsNext;

            const showEditedBadge = !!(msg.editedAt && !isDeleted);
            const showTicks = isOwn && !isDeleted;
            const showMetaRow = isLastInGroup || showEditedBadge || showTicks;

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
                  <div className="chat-day-sep">
                    {formatDayLabel(msg.createdAt, timezone)}
                  </div>
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
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submitEdit();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEdit();
                          }
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
                          {isLastInGroup && (
                            <span>{formatTime(msg.createdAt, timeFormat, timezone)}</span>
                          )}
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

        <MessageComposer
          conversationId={conversationId}
          onSend={handleSend}
          onTyping={handleTyping}
          disabled={false}
          isSending={sendMessage.isPending}
          isLocked={isLocked}
          peer={peer}
          friendRequestPending={friendRequestPending}
          onAddFriend={handleComposerAddFriend}
          isArchived={isArchived}
          onUnarchive={handleUnarchive}
          unarchiving={updateConversation.isPending}
        />
      </div>

      {!isGroup && profileOpen && (
        <UserProfileSidebar
          peer={peer}
          conversation={conversation}
          onClose={() => setProfileOpen(false)}
        />
      )}

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

      {isGroup && canManageGroup && (
        <GroupSettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          conversation={conversation}
          onConversationClosed={onConversationClosed}
          onOpenThread={onOpenThread}
        />
      )}

      <style>{`@keyframes chatSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}