// apps/web/src/features/personal/chats/components/MessageThread.jsx
//
// State orchestrator for the conversation. Owns all data hooks, scroll
// side-effects, edit/delete/reply state, and renders:
//
//   <ChatHeader />          ← title + subtitle + actions
//   <MessageList />         ← scroll container + message rows
//   <ScrollToBottom />      ← floating pill
//   <chat-reply-banner />   ← slim strip above composer when replying
//   <MessageComposer />     ← unchanged until Phase 3
//   <UserProfileSidebar />  ← unchanged until Phase 4
//   <GroupSettingsModal />  ← unchanged until Phase 4
//   <MessageContextMenu />  ← right-click / long-press

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
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

import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import MessageContextMenu from './MessageContextMenu';
import ScrollToBottom from './ScrollToBottom';
import ThreadSkeleton from './ThreadSkeleton';
import UserProfileSidebar from './UserProfileSidebar';
import GroupSettingsModal from './GroupSettingsModal';

const EDIT_WINDOW_MS = 15 * 60 * 1000;

function displayNameOf(user) {
  if (!user) return 'Unknown';
  const a = (user.firstName || '').trim();
  const b = (user.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return user.email || 'Unknown';
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
    (user?.role === 'superadmin' ||
      (user?.role === 'admin' && conversation.visibility === 'public') ||
      conversation.createdById === currentUserId);

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

  /* ---------------- Scroll side-effects ---------------- */

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);
  const atBottomRef = useRef(true);
  const lastCountRef = useRef(0);
  const prependAnchorRef = useRef(null);
  const [showScrollPill, setShowScrollPill] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      const d = el.scrollHeight - el.scrollTop - el.clientHeight;
      atBottomRef.current = d < 120;
      setShowScrollPill(d > 200);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    lastCountRef.current = 0;
    atBottomRef.current = true;
    setShowScrollPill(false);
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

  /* ---------------- Unread boundary snapshot ----------------
     MUST be declared BEFORE the markRead effect so this runs first on
     mount — markRead sets readAt on peer messages, which would erase the
     information we're trying to capture. */
  const unreadBoundaryRef = useRef(null);
  useEffect(() => {
    if (unreadBoundaryRef.current !== null) return;
    if (messages.length === 0) return;
    const firstUnread = messages.find(
      (m) => m.senderId !== currentUserId && !m.readAt
    );
    unreadBoundaryRef.current = firstUnread?.id || '';
  }, [messages, currentUserId]);

  /* ---------------- Mark read ---------------- */
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

  /* ---------------- Edit-window clock ---------------- */
  const [nowTs, setNowTs] = useState(0);
  useEffect(() => {
    setNowTs(Date.now());
    const iv = setInterval(() => setNowTs(Date.now()), 30_000);
    return () => clearInterval(iv);
  }, []);

  /* ---------------- Context menu ---------------- */
  const [ctxMenu, setCtxMenu] = useState(null);

  const openContextMenu = useCallback((message, event) => {
    const x = event?.clientX ?? 100;
    const y = event?.clientY ?? 100;
    setCtxMenu({ x, y, message });
  }, []);

  const closeContextMenu = useCallback(() => setCtxMenu(null), []);

  /* ---------------- Edit state ---------------- */
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const startEdit = useCallback((msg) => {
    setEditingId(msg.id);
    setEditText(msg.body || '');
    setCtxMenu(null);
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
      {
        onSuccess: () => {
          setEditingId(null);
          setEditText('');
        },
      }
    );
  }, [editText, editingId, conversationId, editMessage]);

  /* ---------------- Delete handlers ---------------- */
  const handleDeleteMe = useCallback(
    (msg) => {
      deleteMessage.mutate(
        { conversationId, messageId: msg.id, scope: 'me' },
        { onSuccess: () => setCtxMenu(null) }
      );
    },
    [conversationId, deleteMessage]
  );

  const handleDeleteAll = useCallback(
    (msg) => {
      deleteMessage.mutate(
        { conversationId, messageId: msg.id, scope: 'all' },
        { onSuccess: () => setCtxMenu(null) }
      );
    },
    [conversationId, deleteMessage]
  );

  /* ---------------- Reply state ---------------- */
  const [replyTo, setReplyTo] = useState(null);

  const handleReply = useCallback((msg) => {
    setReplyTo(msg);
    setCtxMenu(null);
  }, []);

  const cancelReply = useCallback(() => setReplyTo(null), []);

  useEffect(() => {
    setReplyTo(null);
  }, [conversationId]);

  /* ---------------- Send + typing ---------------- */
  const handleSend = useCallback(
    (body) => {
      sendMessage.mutate(
        {
          conversationId,
          body,
          senderId: currentUserId,
          replyToId: replyTo?.id,
        },
        { onSuccess: () => setReplyTo(null) }
      );
    },
    [conversationId, currentUserId, sendMessage, replyTo]
  );

  const handleTyping = useCallback(
    (isTyping) => sendTyping.mutate({ conversationId, isTyping }),
    [conversationId, sendTyping]
  );

  /* ---------------- Archive ---------------- */
  const isArchived = !!conversation?.isArchived;

  const handleUnarchive = useCallback(() => {
    updateConversation.mutate({ conversationId, patch: { isArchived: false } });
  }, [conversationId, updateConversation]);

  /* ---------------- Scroll to bottom ---------------- */
  const handleScrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, []);

  /* ---------------- Helpers ---------------- */
  const canEditMessage = useCallback(
    (msg) => {
      if (!nowTs) return false;
      return (
        nowTs - new Date(msg.createdAt).getTime() < EDIT_WINDOW_MS
      );
    },
    [nowTs]
  );

  /* ---------------- Loading ---------------- */
  if (convoLoading && !conversation) {
    return (
      <div className="chat-thread">
        <ThreadSkeleton rows={8} />
      </div>
    );
  }

  if (!conversation) return null;

  return (
    <>
      <div className="chat-thread">
        <ChatHeader
          conversation={conversation}
          typingUserIds={typingUserIds}
          showTypingInThread={showTypingInThread}
          onBack={onBack}
          onTogglePanel={() => setProfileOpen((v) => !v)}
          onOpenGroupSettings={() => setSettingsOpen(true)}
          canManageGroup={canManageGroup}
        />

        <div className="chat-thread-messages-wrap">
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            isGroup={isGroup}
            headerName={
              isGroup
                ? (conversation.name || 'this group')
                : displayNameOf(peer)
            }
            typingUserIds={typingUserIds}
            showTypingInThread={showTypingInThread}
            timeFormat={timeFormat}
            timezone={timezone}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            isLoading={messagesLoading}
            editingId={editingId}
            editText={editText}
            onEditChange={setEditText}
            onEditSubmit={submitEdit}
            onEditCancel={cancelEdit}
            onEditStart={startEdit}
            onReply={handleReply}
            onContextMenu={openContextMenu}
            unreadBoundaryMsgId={unreadBoundaryRef.current || undefined}
            scrollRef={scrollRef}
            sentinelRef={sentinelRef}
            canEditMessage={canEditMessage}
          />

          <ScrollToBottom
            visible={showScrollPill}
            onClick={handleScrollToBottom}
          />
        </div>

        {replyTo && (
          <div className="chat-reply-banner">
            <div className="chat-reply-banner-body">
              <div className="chat-reply-banner-label">Replying to</div>
              <div className="chat-reply-banner-text">
                {(replyTo.body || '').slice(0, 100)}
              </div>
            </div>
            <button
              type="button"
              className="chat-reply-banner-cancel"
              onClick={cancelReply}
              aria-label="Cancel reply"
            >
              ✕
            </button>
          </div>
        )}

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
          canReply={!ctxMenu.message.deleted}
          canEdit={
            ctxMenu.message.senderId === currentUserId &&
            !ctxMenu.message.deleted &&
            nowTs > 0 &&
            nowTs - new Date(ctxMenu.message.createdAt).getTime() < EDIT_WINDOW_MS
          }
          canDeleteAll={
            ctxMenu.message.senderId === currentUserId &&
            !ctxMenu.message.deleted
          }
          onReply={() => handleReply(ctxMenu.message)}
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
    </>
  );
}