import { useState, useMemo, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { useChatConversations } from '@/shared/api/chat';
import { useFriendRequests } from '@/shared/api/friends';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { useSettingsModal } from '@/app/layout/Settings/SettingsModalContext';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import EmptyState from '@/shared/components/EmptyState';

import ChatRail from './components/ChatRail';
import ConversationList from './components/ConversationList';
import MessageThread from './components/MessageThread';
import MaveAiThreads from './components/MaveAiThreads';
import FriendsTab from './components/FriendsTab';
import NewChatModal from './components/NewChatModal';
import GroupDiscoverModal from './components/GroupDiscoverModal';
import CreateGroupModal from './components/CreateGroupModal';
import AddFriendModal from './components/AddFriendModal';
import { useSwipeBack } from './hooks/useSwipeBack';

import './ChatsShell.css';

const AI_HUB_ID = '__mave_ai_hub__';

export default function ChatsPage() {
  const { user } = useAuth();
  const { openSettings } = useSettingsModal();

  const [activeTab, setActiveTab] = useState('dms');
  const [selectedId, setSelectedId] = useState(null);
  const [archivedMode, setArchivedMode] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);

  const { data: conversations = [], isLoading } = useChatConversations();
  const { data: friendRequestsData } = useFriendRequests();
  const friendRequestCount = friendRequestsData?.incoming?.length ?? 0;
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (activeTab !== 'dms' && activeTab !== 'groups') {
      setSelectedId(null);
      setMobileThreadOpen(false);
      setArchivedMode(false);
    }
  }, [activeTab]);

  const aiConversations = useMemo(
    () => conversations.filter((c) => c.isAi),
    [conversations]
  );
  const humanConversations = useMemo(
    () => conversations.filter((c) => !c.isAi),
    [conversations]
  );

  const isAiHubSelected = selectedId === AI_HUB_ID;

  const selectedConversation = useMemo(
    () =>
      isAiHubSelected
        ? null
        : conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId, isAiHubSelected]
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

  const filteredHumanConversations = useMemo(() => {
    if (activeTab === 'dms') return humanConversations.filter((c) => !c.isGroup);
    if (activeTab === 'groups') return humanConversations.filter((c) => c.isGroup);
    return [];
  }, [humanConversations, activeTab]);

  const aiHub = useMemo(() => {
    if (aiConversations.length === 0) return null;
    const personaOrder = { guide: 0, trainer: 1, chat: 2 };
    const sortedByPersona = [...aiConversations].sort((a, b) => {
      return (personaOrder[a.aiPersona] ?? 9) - (personaOrder[b.aiPersona] ?? 9);
    });
    const latest = sortedByPersona.reduce(
      (acc, c) => {
        const ts = new Date(c.lastMessageAt).getTime();
        return ts > acc.ts ? { ts, c } : acc;
      },
      { ts: 0, c: null }
    );
    return {
      conversations: sortedByPersona,
      unreadCount: sortedByPersona.reduce((s, c) => s + (c.unreadCount || 0), 0),
      lastMessageAt: latest.ts || 0,
      lastMessageText: latest.c?.lastMessageText || null,
      selected: isAiHubSelected,
    };
  }, [aiConversations, isAiHubSelected]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setMobileThreadOpen(true);
  };

  const handleSelectAiHub = () => {
    setSelectedId(AI_HUB_ID);
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
    subtitle: 'Private DMs, groups, friends, and Mave AI',
  });

  if (isLoading) return <PageSkeleton />;

  let shellClass = 'chat-shell';
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
          onOpenAiHub={handleSelectAiHub}
        />
      );
    }

    return (
      <>
        <aside className="chat-sidebar" aria-label="Conversations">
          <ConversationList
            conversations={filteredHumanConversations}
            aiHub={activeTab === 'dms' ? aiHub : null}
            onSelectAiHub={handleSelectAiHub}
            selectedId={isAiHubSelected ? AI_HUB_ID : selectedId}
            currentUserId={user?.id}
            onSelect={handleSelect}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            archivedMode={archivedMode}
            onArchivedToggle={handleArchivedToggle}
            onCreateDm={() => setNewChatOpen(true)}
            onCreateGroup={() => setCreateGroupOpen(true)}
            onDiscover={() => setDiscoverOpen(true)}
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
          {isAiHubSelected && aiHub ? (
            <MaveAiThreads
              aiConversations={aiHub.conversations}
              onBack={handleMobileBack}
              onOpenThread={handleOpenThread}
            />
          ) : selectedConversation ? (
            <MessageThread
              conversationId={selectedId}
              onBack={handleMobileBack}
              onConversationClosed={handleConversationClosed}
              onOpenThread={handleOpenThread}
            />
          ) : (
            <div className="chat-thread-empty">
              <EmptyState
                size="md"
                variant="bare"
                icon={MessageSquare}
                eyebrow="Select a conversation"
                title="No conversation selected"
                description="Pick a conversation from the sidebar, or start a new one. Only you and the other participants can see these messages."
              />
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

      <GroupDiscoverModal
        isOpen={discoverOpen}
        onClose={() => setDiscoverOpen(false)}
        onJoined={handleOpenThread}
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