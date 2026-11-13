import { MessageSquarePlus, UserRoundPlus, Plus } from 'lucide-react';

/**
 * Bottom action bar of the sidebar.
 *
 * DMs     -> New message (all users)
 * Groups  -> New channel (superadmin only; other admins cannot create
 *                       user-facing channels from the UI, and non-admins
 *                       see nothing)
 * Friends -> Add friend (all users)
 *
 * Discovery was removed -- users cannot browse channels they aren't in.
 */
export default function SidebarFab({
  activeTab,
  archivedMode = false,
  isAdmin = false,
  onCreateDm,
  onCreateGroup,
  onAddFriend,
}) {
  if (archivedMode) return null;

  const primary =
    activeTab === 'groups'
      ? (isAdmin
          ? { icon: Plus, label: 'New channel', title: 'Create a channel', onClick: onCreateGroup }
          : null)
      : activeTab === 'friends'
        ? { icon: UserRoundPlus, label: 'Add friend', title: 'Send a friend request', onClick: onAddFriend }
        : activeTab === 'dms'
          ? { icon: MessageSquarePlus, label: 'New message', title: 'Start a new direct message', onClick: onCreateDm }
          : null;

  if (!primary) return null;
  const Icon = primary.icon;

  return (
    <div className="chat-sidebar-foot">
      <button type="button" className="chat-sidebar-cta" onClick={primary.onClick} title={primary.title}>
        <Icon size={16} />
        <span>{primary.label}</span>
      </button>
    </div>
  );
}