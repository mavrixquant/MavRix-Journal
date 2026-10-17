// apps/web/src/features/personal/chats/components/GroupProfilePanel.jsx
//
// Right-panel contents for a group. This is where member management now
// lives (previously in GroupSettingsModal's Members tab).
//
//   Group card     → avatar + name + description + visibility badges
//   Members list   → role chips + per-member actions (admin only) +
//                    inline "Add member" search (admin only)
//   Actions        → Group settings (admin only) · Leave group

import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Hash,
  Lock,
  Crown,
  ShieldCheck,
  UserPlus,
  Trash2,
  Settings as SettingsIcon,
  LogOut,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useGroupMembers,
  useAddGroupMember,
  useRemoveGroupMember,
  useSetGroupMemberRole,
  useLeaveGroup,
  useChatUserSearch,
} from '@/shared/api/chat';
import Alert from '@/shared/components/Alert';
import GroupAvatar from './GroupAvatar';
import MemberProfilePopover from './MemberProfilePopover';

const ROLE_LABELS = {
  owner: { label: 'Owner', icon: Crown },
  moderator: { label: 'Mod', icon: ShieldCheck },
  member: null,
};

function initialsOf(u) {
  if (!u) return '?';
  const a = (u.firstName || '').trim();
  const b = (u.lastName || '').trim();
  if (a && b) return (a[0] + b[0]).toUpperCase();
  if (a) return a.slice(0, 2).toUpperCase();
  if (u.email) return u.email.slice(0, 2).toUpperCase();
  return '?';
}

function displayNameOf(u) {
  if (!u) return 'Unknown';
  const a = (u.firstName || '').trim();
  const b = (u.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return u.email || 'Unknown';
}

export default function GroupProfilePanel({
  conversation,
  currentUserId,
  canManageGroup,
  onClose,
  onOpenSettings,
  onConversationClosed,
  onOpenThread,
}) {
  const groupId = conversation.id;

  const { data: members = [], isFetching: loadingMembers } =
    useGroupMembers(groupId);

  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();
  const setRole = useSetGroupMemberRole();
  const leaveGroup = useLeaveGroup();

  const [addMode, setAddMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const { data: searchResults = [], isFetching: searchingUsers } =
    useChatUserSearch(debouncedTerm);

  const [pendingRemove, setPendingRemove] = useState(null);
  const [pendingLeave, setPendingLeave] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const memberUserIds = useMemo(
    () => new Set(members.map((m) => m.userId)),
    [members]
  );
  const addableUsers = useMemo(
    () => searchResults.filter((u) => !memberUserIds.has(u.id)),
    [searchResults, memberUserIds]
  );

  const ownerCount = members.filter((m) => m.role === 'owner').length;
  const myRole =
    members.find((m) => m.userId === currentUserId)?.role ||
    conversation.role ||
    'member';
  const isLastOwner = myRole === 'owner' && ownerCount <= 1;

  /* ---------------- Handlers ---------------- */

  const handleAdd = async (userId) => {
    try {
      await addMember.mutateAsync({ groupId, userId });
      setSearchTerm('');
      setDebouncedTerm('');
      toast.success('Member added');
    } catch (err) {
      toast.error(err?.message || 'Could not add member');
    }
  };

  const handleConfirmRemove = async () => {
    if (!pendingRemove) return;
    const targetId = pendingRemove.userId;
    setPendingRemove(null);
    try {
      await removeMember.mutateAsync({ groupId, userId: targetId });
      toast.success('Member removed');
    } catch (err) {
      toast.error(err?.message || 'Could not remove member');
    }
  };

  const handleMakeOwner = async (userId) => {
    try {
      await setRole.mutateAsync({ groupId, userId, role: 'owner' });
      toast.success('Ownership transferred');
    } catch (err) {
      toast.error(err?.message || 'Could not change role');
    }
  };

  const handleLeave = async () => {
    setPendingLeave(false);
    try {
      await leaveGroup.mutateAsync(groupId);
      toast.success('You left the group');
      onClose?.();
      onConversationClosed?.();
    } catch (err) {
      toast.error(err?.message || 'Could not leave group');
    }
  };

  /* ---------------- Render ---------------- */

  const memberCount = members.length || conversation.memberCount || 0;

  return (
    <>
      <div className="chat-panel-inner">
        <div className="chat-panel-head">
          <span className="chat-panel-title">Group info</span>
          <button
            type="button"
            className="chat-panel-close"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={14} />
          </button>
        </div>

        <div className="chat-panel-body">
          {/* ────────── Group card ────────── */}
          <div className="panel-profile">
            <GroupAvatar group={conversation} size={72} />
            <div className="panel-name">
              {conversation.name || 'Untitled group'}
            </div>
            {conversation.description && (
              <div className="panel-desc">{conversation.description}</div>
            )}
            <div className="panel-meta-row">
              <span className="panel-meta-badge">
                {conversation.visibility === 'private' ? (
                  <><Lock size={10} /> Private</>
                ) : (
                  <><Hash size={10} /> Public</>
                )}
              </span>
              <span className="panel-meta-badge">
                {memberCount} member{memberCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* ────────── Members ────────── */}
          <div className="panel-section">
            <div className="panel-section-head">
              <span className="panel-section-label">
                Members
                <span className="panel-section-count">{memberCount}</span>
              </span>
              {canManageGroup && !addMode && (
                <button
                  type="button"
                  className="panel-section-action"
                  onClick={() => setAddMode(true)}
                >
                  + Add
                </button>
              )}
              {canManageGroup && addMode && (
                <button
                  type="button"
                  className="panel-section-action"
                  onClick={() => {
                    setAddMode(false);
                    setSearchTerm('');
                    setDebouncedTerm('');
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            {addMode && (
              <div className="panel-add-member">
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  spellCheck={false}
                />
                {debouncedTerm.length >= 2 && (
                  <div className="panel-add-results">
                    {searchingUsers && addableUsers.length === 0 && (
                      <div className="panel-add-empty">
                        <Loader2 size={14} className="panel-spinner" />
                      </div>
                    )}
                    {!searchingUsers && addableUsers.length === 0 && (
                      <div className="panel-add-empty">
                        No new users match "{debouncedTerm}".
                      </div>
                    )}
                    {addableUsers.slice(0, 6).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="panel-add-row"
                        onClick={() => handleAdd(u.id)}
                        disabled={addMember.isPending}
                      >
                        <span className="panel-member-avatar">
                          {u.photoUrl ? (
                            <img src={u.photoUrl} alt="" />
                          ) : (
                            initialsOf(u)
                          )}
                        </span>
                        <span className="panel-add-row-body">
                          <span className="panel-member-name">
                            {displayNameOf(u)}
                          </span>
                          <span className="panel-member-email">{u.email}</span>
                        </span>
                        <UserPlus
                          size={13}
                          style={{ color: 'var(--accent)', flexShrink: 0 }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="panel-members">
              {loadingMembers && members.length === 0 && (
                <div className="panel-members-loading">
                  <Loader2 size={16} className="panel-spinner" />
                </div>
              )}

              {!loadingMembers && members.length === 0 && (
                <div className="panel-members-empty">No members yet.</div>
              )}

              {members.map((m) => {
                const roleMeta = ROLE_LABELS[m.role];
                const isSelf = m.userId === currentUserId;
                const canRemove =
                  canManageGroup &&
                  !isSelf &&
                  !(m.role === 'owner' && ownerCount <= 1);
                const canMakeOwner =
                  canManageGroup && !isSelf && m.role !== 'owner';

                const triggerContent = (
                  <button
                    type="button"
                    className="panel-member-trigger"
                    aria-label={`View ${displayNameOf(m.user)}`}
                  >
                    <span className="panel-member-avatar">
                      {m.user?.photoUrl ? (
                        <img src={m.user.photoUrl} alt="" />
                      ) : (
                        initialsOf(m.user)
                      )}
                    </span>
                    <span className="panel-member-body">
                      <span className="panel-member-name">
                        {displayNameOf(m.user)}
                        {isSelf && (
                          <span className="panel-member-you"> (you)</span>
                        )}
                      </span>
                      <span className="panel-member-email">
                        {m.user?.email}
                      </span>
                    </span>
                  </button>
                );

                return (
                  <div key={m.id} className="panel-member">
                    {isSelf ? (
                      triggerContent
                    ) : (
                      <MemberProfilePopover
                        member={m}
                        currentUserId={currentUserId}
                        onOpenThread={(id) => {
                          onClose?.();
                          onOpenThread?.(id);
                        }}
                      >
                        {triggerContent}
                      </MemberProfilePopover>
                    )}

                    {roleMeta && (
                      <span className={`panel-role panel-role-${m.role}`}>
                        <roleMeta.icon size={9} />
                        {roleMeta.label}
                      </span>
                    )}

                    {(canMakeOwner || canRemove) && (
                      <div className="panel-member-actions">
                        {canMakeOwner && (
                          <button
                            type="button"
                            className="panel-member-btn"
                            onClick={() => handleMakeOwner(m.userId)}
                            disabled={setRole.isPending}
                            title="Make owner"
                            aria-label="Make owner"
                          >
                            <Crown size={11} />
                          </button>
                        )}
                        {canRemove && (
                          <button
                            type="button"
                            className="panel-member-btn is-danger"
                            onClick={() => setPendingRemove(m)}
                            disabled={removeMember.isPending}
                            title="Remove from group"
                            aria-label="Remove from group"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ────────── Actions ────────── */}
          <div className="panel-section">
            <div className="panel-section-label">Actions</div>
            <div className="panel-actions">
              {canManageGroup && (
                <button
                  type="button"
                  className="panel-action"
                  onClick={onOpenSettings}
                >
                  <SettingsIcon size={14} />
                  <span>Group settings</span>
                </button>
              )}
              {!isLastOwner && (
                <button
                  type="button"
                  className="panel-action is-danger"
                  onClick={() => setPendingLeave(true)}
                  disabled={leaveGroup.isPending}
                >
                  <LogOut size={14} />
                  <span>Leave group</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Alert
        isOpen={pendingLeave}
        type="confirm"
        title="Leave this group?"
        message={`Leave "${conversation.name}"? You can rejoin later if it's public.`}
        confirmText="Leave"
        cancelText="Cancel"
        onConfirm={handleLeave}
        onCancel={() => setPendingLeave(false)}
      />

      <Alert
        isOpen={!!pendingRemove}
        type="confirm"
        title="Remove member?"
        message={
          pendingRemove
            ? `Remove ${displayNameOf(pendingRemove.user)} from "${conversation.name}"?`
            : ''
        }
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </>
  );
}