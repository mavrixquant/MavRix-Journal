// apps/web/src/features/personal/chats/ChatsPage.jsx
//
// Two-pane chat UI. Left = conversation list, right = active thread.
// Fully private — no admin role can see these conversations.
//
// Title + subtitle are published to the GLOBAL header bar via usePageHeader().
//
// Mobile (< 900px): single pane. Selecting a conversation slides in the
// thread; the back button returns to the list.

import { useState, useMemo } from 'react';
import { MessageSquare } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { useChatConversations } from '@/shared/api/chat';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { PageSkeleton } from '@/shared/ui/page-skeleton';

import ConversationList from './components/ConversationList';
import MessageThread from './components/MessageThread';
import NewChatModal from './components/NewChatModal';

import './ChatsPage.css';

export default function ChatsPage() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const { data: conversations = [], isLoading } = useChatConversations();

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  );

  const handleSelect = (id) => {
    setSelectedId(id);
    setMobileThreadOpen(true);
  };

  const handleMobileBack = () => {
    setMobileThreadOpen(false);
  };

  const handleCreatedConversation = (id) => {
    setSelectedId(id);
    setMobileThreadOpen(true);
  };

  // Publish title + subtitle to the global header bar.
  usePageHeader({
    title: 'Chats',
    subtitle: 'Private direct messages · visible only to you and the other person',
  });

  if (isLoading) return <PageSkeleton />;

  // Root class drives which pane is visible on mobile.
  let rootClass = 'chat-root';
  if (!selectedId) rootClass += ' is-mobile-list-open';
  else if (mobileThreadOpen) rootClass += ' is-mobile-thread-open';

  return (
    <div className="chat-page">
      {/* ---------- Two-pane body ---------- */}
      <div className={rootClass}>
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          currentUserId={user?.id}
          onSelect={handleSelect}
          onNewChat={() => setNewChatOpen(true)}
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
                Only you and the other person can see these messages.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ---------- New-chat modal ---------- */}
      <NewChatModal
        isOpen={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreated={handleCreatedConversation}
      />
    </div>
  );
}