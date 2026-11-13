import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, MessageSquarePlus, Lock } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { useChatConversations } from '@/shared/api/chat';
import { useFriendRequests } from '@/shared/api/friends';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { useSettingsModal } from '@/app/layout/Settings/SettingsModalContext';
import { PageSkeleton } from '@/shared/ui/page-skeleton';

import ChatRail from './components/ChatRail';
import ConversationList from './components/ConversationList';
import MessageThread from './components/MessageThread';
import FriendsTab from './components/FriendsTab';
import NewChatModal from './components/NewChatModal';
import CreateGroupModal from './components/CreateGroupModal';
import AddFriendModal from './components/AddFriendModal';
import { useSwipeBack } from './hooks/useSwipeBack';

import './ChatsPanels.css';
import './ChatsShell.css';

export default function ChatsPage() {
  const { user } = useAuth();
  const { openSettings } = useSettingsModal();

  const [activeTab, setActiveTab] = useState('dms');
  const [selectedId, setSelectedId] = useState(null);
  const [archivedMode, setArchivedMode] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);

  // -- Notification / deep-link routing ------------------------------------
  // Handles three params from the notification sidebar:
  //   ?c=<conversationId>       ? open that DM/group
  //   ?tab=friends|groups|dms   ? switch sidebar tab
  //   ?requests=1               ? auto-open the friend-request panel
  // Params are cleared after consumption so closing the panel stays closed.
  const [friendRequestsOpen, setFriendRequestsOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const c       = searchParams.get('c');
    const tab     = searchParams.get('tab');
    const requests = searchParams.get('requests');

    if (!c && !tab && !requests) return;

    if (c) {
      setActiveTab('dms');
      setSelectedId(c);
      setMobileThreadOpen(true);
    }
    if (tab === 'friends' || tab === 'groups' || tab === 'dms') {
      setActiveTab(tab);
    }
    if (requests === '1') {
      setFriendRequestsOpen(true);
    }

    const next = new URLSearchParams(searchParams);
    next.delete('c');
    next.delete('tab');
    next.delete('requests');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const { data: allConversations = [], isLoading } = useChatConversations();
  const { data: friendRequestsData } = useFriendRequests();
  const friendRequestCount = friendRequestsData?.incoming?.length ?? 0;
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Mave AI conversations are filtered out at the source — AI lives in the
  // dedicated sidebar, not in Chats.
  const conversations = useMemo(
    () => allConversations.filter((c) => !c.isAi),
    [allConversations]
  );

  useEffect(() => {
    if (activeTab !== 'dms' && activeTab !== 'groups') {
      setSelectedId(null);
      setMobileThreadOpen(false);
      setArchivedMode(false);
    }
  }, [activeTab]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  );

  const counts = useMemo(() => {
    let dmUnread = 0;
    let groupUnread = 0;
    for (const c of conversations) {
      if (c.isArchived) continue;
      if (c.isGroup) groupUnread += c.unreadCount || 0;
      else dmUnread += c.unreadCount || 0;
    }
    return { dmUnread, groupUnread };
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    if (activeTab === 'dms') return conversations.filter((c) => !c.isGroup);
    if (activeTab === 'groups') return conversations.filter((c) => c.isGroup);
    return [];
  }, [conversations, activeTab]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setMobileThreadOpen(true);
  };

  const handleMobileBack = () => setMobileThreadOpen(false);

  const threadSwipeRef = useSwipeBack({
    onBack: handleMobileBack,
    enabled: !!selectedId && mobileThreadOpen,
  });

  const handleOpenThread = (id) => {
    setSelectedId(id);
    setActiveTab('dms');
    setArchivedMode(false);
    setMobileThreadOpen(true);
  };

  const handleConversationClosed = () => {
    setSelectedId(null);
    setMobileThreadOpen(false);
  };

  const handleArchivedToggle = () => {
    setArchivedMode((prev) => {
      const next = !prev;
      setSelectedId(null);
      setMobileThreadOpen(false);
      return next;
    });
  };

  usePageHeader({
    title: 'Chats',
    subtitle: 'Private DMs, channels, and friends',
  });

  if (isLoading) return <PageSkeleton />;

  let shellClass = 'chat-shell page-fade-in';
  if (activeTab === 'dms' || activeTab === 'groups') {
    if (!selectedId) shellClass += ' is-mobile-sidebar';
    else if (mobileThreadOpen) shellClass += ' is-mobile-thread';
  }

  const renderBody = () => {
    if (activeTab === 'friends') {
      return (
        <FriendsTab
          onOpenAddFriend={() => setAddFriendOpen(true)}
          onOpenThread={handleOpenThread}
          requestsOpen={friendRequestsOpen}
          onRequestsOpenChange={setFriendRequestsOpen}
        />
      );
    }

    return (
      <>
        <aside className="chat-sidebar" aria-label="Conversations">
          <ConversationList
            conversations={filteredConversations}
            selectedId={selectedId}
            currentUserId={user?.id}
            onSelect={handleSelect}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            archivedMode={archivedMode}
            onArchivedToggle={handleArchivedToggle}
            onCreateDm={() => setNewChatOpen(true)}
            onCreateGroup={() => setCreateGroupOpen(true)}
            onAddFriend={() => setAddFriendOpen(true)}
            isAdmin={isAdmin}
            isLoading={isLoading}
          />
        </aside>

        <section
          className="chat-thread-pane"
          aria-label="Conversation"
          ref={threadSwipeRef}
        >
          {selectedConversation ? (
            <MessageThread
              conversationId={selectedId}
              onBack={handleMobileBack}
              onConversationClosed={handleConversationClosed}
              onOpenThread={handleOpenThread}
            />
          ) : (
            <div className="chat-thread-empty">
              <div className="chat-landing">
                <div className="chat-landing-art" aria-hidden>
                  <span className="chat-landing-ring is-1" />
                  <span className="chat-landing-ring is-2" />
                  <span className="chat-landing-icon"><MessageSquare size={34} strokeWidth={1.75} /></span>
                </div>
                <h2 className="chat-landing-title">
                  {activeTab === 'groups' ? 'Pick a channel to jump in' : 'Your messages live here'}
                </h2>
                <p className="chat-landing-text">
                  Select a conversation from the list, or start a new one.
                </p>
                <div className="chat-landing-actions">
                  {activeTab === 'groups'
                  ? (isAdmin && (
                      <button type="button" className="chat-landing-btn is-primary" onClick={() => setCreateGroupOpen(true)}>
                        <MessageSquarePlus size={16} /> New channel
                      </button>
                    ))
                  : (
                      <button type="button" className="chat-landing-btn is-primary" onClick={() => setNewChatOpen(true)}>
                        <MessageSquarePlus size={16} /> New message
                      </button>
                    )}
                </div>
                <div className="chat-landing-note">
                  <Lock size={12} aria-hidden /> Only you and the people in a conversation can see its messages.
                </div>
              </div>
            </div>
          )}
        </section>
      </>
    );
  };

  return (
    <>
      <div className={shellClass}>
        <ChatRail
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unreadDms={counts.dmUnread}
          unreadGroups={counts.groupUnread}
          friendRequestCount={friendRequestCount}
          onOpenSettings={() => openSettings('chats')}
          onOpenProfile={() => openSettings('account')}
        />
        <div className="chat-body">{renderBody()}</div>
      </div>

      <NewChatModal
        isOpen={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreated={handleOpenThread}
        onOpenAddFriend={() => setAddFriendOpen(true)}
      />

            <AddFriendModal
        isOpen={addFriendOpen}
        onClose={() => setAddFriendOpen(false)}
      />

      {isAdmin && (
        <CreateGroupModal
          isOpen={createGroupOpen}
          onClose={() => setCreateGroupOpen(false)}
          onCreated={handleOpenThread}
        />
      )}
    </>
  );
}

