// apps/web/src/features/personal/chats/ChatsPage.jsx
//
// Two-pane chat UI. Left = conversation list (filterable by All/DMs/Groups),
// right = active thread. Fully private — no admin role can see DMs.
//
// Title + subtitle are published to the GLOBAL header bar via usePageHeader().
//
// Mobile (< 900px): single pane. Selecting a conversation slides in the
// thread; the back button returns to the list.
//
// Admin users also get a "New group" button in the list header (opens
// CreateGroupModal). All users get "Discover" (opens GroupDiscoverModal).

import { useState, useMemo } from 'react';
import { MessageSquare } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { useChatConversations } from '@/shared/api/chat';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { PageSkeleton } from '@/shared/ui/page-skeleton';

import ConversationList from './components/ConversationList';
import MessageThread from './components/MessageThread';
import NewChatModal from './components/NewChatModal';
import GroupDiscoverModal from './components/GroupDiscoverModal';
import CreateGroupModal from './components/CreateGroupModal';

import './ChatsPage.css';

export default function ChatsPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const { data: conversations = [], isLoading } = useChatConversations();

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  );

  // Tab counts — computed once here so the list doesn't need to.
  const counts = useMemo(() => {
    let dmCount = 0;
    let groupCount = 0;
    for (const c of conversations) {
      if (c.isGroup) groupCount++;
      else dmCount++;
    }
    return {
      all: conversations.length,
      dms: dmCount,
      groups: groupCount,
    };
  }, [conversations]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setMobileThreadOpen(true);
  };

  const handleMobileBack = () => {
    setMobileThreadOpen(false);
  };

  const handleCreated = (id) => {
    setSelectedId(id);
    setMobileThreadOpen(true);
  };

  // Publish title + subtitle to the global header bar.
  usePageHeader({
    title: 'Chats',
    subtitle: 'Private DMs and team groups · visible only to participants',
  });

  if (isLoading) return <PageSkeleton />;

  // Root class drives which pane is visible on mobile.
  let rootClass = 'chat-root';
  if (!selectedId) rootClass += ' is-mobile-list-open';
  else if (mobileThreadOpen) rootClass += ' is-mobile-thread-open';

  return (
    <div className="chat-page">
      <div className={rootClass}>
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          currentUserId={user?.id}
          onSelect={handleSelect}
          onNewChat={() => setNewChatOpen(true)}
          onDiscover={() => setDiscoverOpen(true)}
          onCreateGroup={() => setCreateGroupOpen(true)}
          isAdmin={isAdmin}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={counts}
        />

        {selectedConversation ? (
          <MessageThread
            conversationId={selectedId}
            onBack={handleMobileBack}
          />
        ) : (
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
        )}
      </div>

      {/* ---------- New-DM modal ---------- */}
      <NewChatModal
        isOpen={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreated={handleCreated}
      />

      {/* ---------- Discover public groups modal ---------- */}
      <GroupDiscoverModal
        isOpen={discoverOpen}
        onClose={() => setDiscoverOpen(false)}
        onJoined={handleCreated}
      />

      {/* ---------- Create group modal (admin / superadmin only) ---------- */}
      {isAdmin && (
        <CreateGroupModal
          isOpen={createGroupOpen}
          onClose={() => setCreateGroupOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}