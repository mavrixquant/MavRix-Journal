// apps/web/src/features/personal/chats/ChatsPage.jsx
//
// PHASE 1 of the Chat UI Revamp.
//
// Thin orchestrator. Owns all shared state (active tab, selected
// conversation, archived-mode toggle, modal open flags) and lays out the
// new 3-pane shell:
//
//   ┌────────┬──────────────┬────────────────────────┐
//   │  Rail  │   Sidebar    │   Thread pane          │
//   └────────┴──────────────┴────────────────────────┘
//
// The right panel (Phase 4) will slot in on the right edge of .chat-body.
// For now .chat-thread-pane renders the existing <MessageThread> exactly
// as before, so the app works end-to-end at the end of Phase 1.

import { useState, useMemo, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { useChatConversations } from '@/shared/api/chat';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { useSettingsModal } from '@/app/layout/Settings/SettingsModalContext';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import EmptyState from '@/shared/components/EmptyState';

import ChatRail from './components/ChatRail';
import ConversationList from './components/ConversationList';
import MessageThread from './components/MessageThread';
import FriendsTab from './components/FriendsTab';
import NewChatModal from './components/NewChatModal';
import GroupDiscoverModal from './components/GroupDiscoverModal';
import CreateGroupModal from './components/CreateGroupModal';
import AddFriendModal from './components/AddFriendModal';

import './ChatsShell.css';

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
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

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
    subtitle: 'Private DMs, groups, and friends · visible only to participants',
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
            onDiscover={() => setDiscoverOpen(true)}
            onAddFriend={() => setAddFriendOpen(true)}
            isAdmin={isAdmin}
            isLoading={isLoading}
          />
        </aside>

        <section className="chat-thread-pane" aria-label="Conversation">
          {selectedConversation ? (
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
          onOpenSettings={() => openSettings('chats')}
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