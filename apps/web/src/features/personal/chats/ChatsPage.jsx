// apps/web/src/features/personal/chats/ChatsPage.jsx
//
// 3-rail chat UI. Rail tabs: dms / groups / friends.
//
// The list pane has two modes, toggled by the "Archived (N)" row at the
// top of the list:
//   main      — active (non-archived) conversations
//   archived  — archived-only view; back arrow returns to main

import { useState, useMemo, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { useChatConversations } from '@/shared/api/chat';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { useSettingsModal } from '@/app/layout/Settings/SettingsModalContext';
import { PageSkeleton } from '@/shared/ui/page-skeleton';

import ChatRail from './components/ChatRail';
import ConversationList from './components/ConversationList';
import MessageThread from './components/MessageThread';
import NewChatModal from './components/NewChatModal';
import GroupDiscoverModal from './components/GroupDiscoverModal';
import CreateGroupModal from './components/CreateGroupModal';
import AddFriendModal from './components/AddFriendModal';
import FriendsTab from './components/FriendsTab';
import ChatPageFab from './components/ChatPageFab';

import './ChatsPage.css';
import './ChatsShell.css';

export default function ChatsPage() {
  const { user } = useAuth();
  const { openSettings } = useSettingsModal();

  const [activeTab, setActiveTab] = useState('dms');
  const [selectedId, setSelectedId] = useState(null);
  const [archivedMode, setArchivedMode] = useState(false);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);

  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

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

  let rootClass = 'chat-root';
  if (activeTab === 'dms' || activeTab === 'groups') {
    if (!selectedId) rootClass += ' is-mobile-list-open';
    else if (mobileThreadOpen) rootClass += ' is-mobile-thread-open';
  } else {
    rootClass += ' is-single-pane';
  }

  const renderMiddlePane = () => {
    if (activeTab === 'dms' || activeTab === 'groups') {
      return (
        <ConversationList
          conversations={filteredConversations}
          selectedId={selectedId}
          currentUserId={user?.id}
          onSelect={handleSelect}
          activeTab={activeTab === 'groups' ? 'groups' : 'dms'}
          archivedMode={archivedMode}
          onArchivedToggle={handleArchivedToggle}
          fab={
            <ChatPageFab
              activeTab={activeTab === 'groups' ? 'groups' : 'dms'}
              isAdmin={isAdmin}
              onNewDm={() => setNewChatOpen(true)}
              onNewGroup={() => setCreateGroupOpen(true)}
              onDiscover={() => setDiscoverOpen(true)}
            />
          }
        />
      );
    }
    if (activeTab === 'friends') {
      return (
        <FriendsTab
          onOpenAddFriend={() => setAddFriendOpen(true)}
          onOpenThread={handleOpenThread}
        />
      );
    }
    return null;
  };

  const renderRightPane = () => {
    if (activeTab !== 'dms' && activeTab !== 'groups') return null;

    if (selectedConversation) {
      return (
        <MessageThread
          conversationId={selectedId}
          onBack={handleMobileBack}
          onConversationClosed={handleConversationClosed}
          onOpenThread={handleOpenThread}
        />
      );
    }
    return (
      <div className="chat-thread">
        <div className="chat-empty">
          <div className="chat-empty-icon">
            <MessageSquare size={26} />
          </div>
          <h3>No conversation selected</h3>
          <p>
            Pick a conversation from the list, or start a new one.
            Only you and the other participants can see these messages.
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="chat-shell">
        <ChatRail
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unreadDms={counts.dmUnread}
          unreadGroups={counts.groupUnread}
          onOpenSettings={() => openSettings('chats')}
        />

        <div className="chat-page">
          <div className={rootClass}>
            {renderMiddlePane()}
            {renderRightPane()}
          </div>
        </div>
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