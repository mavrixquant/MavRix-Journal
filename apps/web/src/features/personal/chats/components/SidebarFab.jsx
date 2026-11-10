import { MessageSquarePlus, Compass, UserRoundPlus, Plus } from 'lucide-react';

/**
 * Bottom action bar of the sidebar: one clear primary action + optional
 * admin "create group" button.
 */
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

  const primary =
    activeTab === 'groups'
      ? { icon: Compass, label: 'Discover groups', title: 'Discover public groups', onClick: onDiscover }
      : activeTab === 'friends'
        ? { icon: UserRoundPlus, label: 'Add friend', title: 'Send a friend request', onClick: onAddFriend }
        : { icon: MessageSquarePlus, label: 'New message', title: 'Start a new direct message', onClick: onCreateDm };

  if (activeTab !== 'dms' && activeTab !== 'groups' && activeTab !== 'friends') return null;

  const Icon = primary.icon;
  const showCreateGroup = isAdmin && (activeTab === 'dms' || activeTab === 'groups');

  return (
    <div className="chat-sidebar-foot">
      <button type="button" className="chat-sidebar-cta" onClick={primary.onClick} title={primary.title}>
        <Icon size={16} />
        <span>{primary.label}</span>
      </button>
      {showCreateGroup && (
        <button
          type="button"
          className="chat-sidebar-icon-btn"
          onClick={onCreateGroup}
          title="Create group"
          aria-label="Create group"
        >
          <Plus size={18} />
        </button>
      )}
    </div>
  );
}
