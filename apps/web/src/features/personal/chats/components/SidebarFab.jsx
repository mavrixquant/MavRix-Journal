
import {
  MessageSquarePlus,
  Users,
  UserRoundPlus,
  Plus,
} from 'lucide-react';

export default function SidebarFab({
  activeTab,
  archivedMode = false,
  isAdmin = false,
  onCreateDm,
  onCreateGroup,
  onDiscover,
  onAddFriend,
}) {
  if (archivedMode) return null;

  if (activeTab === 'dms') {
    return (
      <div className="chat-sidebar-foot">
        <button
          type="button"
          className="chat-sidebar-cta"
          onClick={onCreateDm}
          title="Start a new direct message"
        >
          <MessageSquarePlus size={12} />
          <span>New message</span>
        </button>
        {isAdmin && (
          <button
            type="button"
            className="chat-sidebar-icon-btn"
            onClick={onCreateGroup}
            title="Create group"
            aria-label="Create group"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    );
  }

  if (activeTab === 'groups') {
    return (
      <div className="chat-sidebar-foot">
        <button
          type="button"
          className="chat-sidebar-cta"
          onClick={onDiscover}
          title="Discover public groups"
        >
          <Users size={12} />
          <span>Discover groups</span>
        </button>
        {isAdmin && (
          <button
            type="button"
            className="chat-sidebar-icon-btn"
            onClick={onCreateGroup}
            title="Create group"
            aria-label="Create group"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    );
  }

  if (activeTab === 'friends') {
    return (
      <div className="chat-sidebar-foot">
        <button
          type="button"
          className="chat-sidebar-cta"
          onClick={onAddFriend}
          title="Send a friend request"
        >
          <UserRoundPlus size={12} />
          <span>Add friend</span>
        </button>
      </div>
    );
  }

  return null;
}