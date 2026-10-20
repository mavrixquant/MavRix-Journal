
import DmProfilePanel from './DmProfilePanel';
import GroupProfilePanel from './GroupProfilePanel';

export default function ConversationPanel({
  conversation,
  currentUserId,
  canManageGroup,
  onClose,
  onOpenGroupSettings,
  onConversationClosed,
  onOpenThread,
}) {
  if (!conversation) return null;

  const isGroup = !!conversation.isGroup;

  return (
    <aside className="chat-panel" aria-label="Conversation info">
      {isGroup ? (
        <GroupProfilePanel
          conversation={conversation}
          currentUserId={currentUserId}
          canManageGroup={canManageGroup}
          onClose={onClose}
          onOpenSettings={onOpenGroupSettings}
          onConversationClosed={onConversationClosed}
          onOpenThread={onOpenThread}
        />
      ) : (
        <DmProfilePanel
          peer={conversation.peer}
          conversation={conversation}
          onClose={onClose}
        />
      )}
    </aside>
  );
}