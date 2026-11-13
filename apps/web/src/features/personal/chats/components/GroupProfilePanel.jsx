import { useState } from 'react';
import {
  X,
  Hash,
  Lock,
  Crown,
  ShieldCheck,
  Trash2,
  Settings as SettingsIcon,
  LogOut,
  Loader2,
  Eraser,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useGroupMembers,
  useRemoveGroupMember,
  useSetGroupMemberRole,
  useLeaveGroup,
  useClearChat,
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
  if (u.username) return u.username.slice(0, 2).toUpperCase();
  if (u.email) return u.email.slice(0, 2).toUpperCase();
  return '?';
}

function displayNameOf(u) {
  if (!u) return 'Unknown';
  const a = (u.firstName || '').trim();
  const b = (u.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return u.username || 'Unknown';
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

  const removeMember = useRemoveGroupMember();
  const setRole = useSetGroupMemberRole();
  const leaveGroup = useLeaveGroup();
  const clearChatMutation = useClearChat();

  const [pendingRemove, setPendingRemove] = useState(null);
  const [pendingLeave, setPendingLeave] = useState(false);
  const [pendingClear, setPendingClear] = useState(false);

  const ownerCount = members.filter((m) => m.role === 'owner').length;
  const myRole =
    members.find((m) => m.userId === currentUserId)?.role ||
    conversation.role ||
    'member';
  const isLastOwner = myRole === 'owner' && ownerCount <= 1;
  const isDefault = !!conversation.isDefault;

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
      toast.success('You left the channel');
      onClose?.();
      onConversationClosed?.();
    } catch (err) {
      toast.error(err?.message || 'Could not leave channel');
    }
  };

  const handleConfirmClear = async () => {
    setPendingClear(false);
    try {
      await clearChatMutation.mutateAsync(groupId);
      toast.success('Chat cleared from your view.');
    } catch (err) {
      toast.error(err?.message || 'Could not clear chat');
    }
  };

  const memberCount = members.length || conversation.memberCount || 0;
  const clearBusy = clearChatMutation.isPending;

  return (
    <>
      <div className="chat-panel-inner">
        <div className="chat-panel-head">
          <span className="chat-panel-title">Channel info</span>
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
          {/* ---------- Header ---------- */}
          <div className="panel-profile">
            <GroupAvatar group={conversation} size={72} />
            <div className="panel-name">
              {conversation.name || 'Untitled channel'}
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
              {isDefault && (
                <span
                  className="panel-meta-badge"
                  style={{
                    color: 'var(--accent)',
                    borderColor: 'var(--accent-soft2)',
                    background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                  }}
                  title="Every user is auto-joined and cannot leave"
                >
                  <Lock size={10} /> Default
                </span>
              )}
            </div>
          </div>

          {/* ---------- Members ---------- */}
          <div className="panel-section">
            <div className="panel-section-head">
              <span className="panel-section-label">
                Members
                <span className="panel-section-count">{memberCount}</span>
              </span>
            </div>

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
                        {m.user?.username ? '@' + m.user.username : ''}
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
                            title="Remove from channel"
                            aria-label="Remove from channel"
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

          {/* ---------- Actions ---------- */}
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
                  <span>Channel settings</span>
                </button>
              )}

              <button
                type="button"
                className="panel-action"
                onClick={() => setPendingClear(true)}
                disabled={clearBusy}
              >
                <Eraser size={14} />
                <span>Clear chat</span>
              </button>

              {!isLastOwner && !isDefault && (
                <button
                  type="button"
                  className="panel-action is-danger"
                  onClick={() => setPendingLeave(true)}
                  disabled={leaveGroup.isPending}
                >
                  <LogOut size={14} />
                  <span>Leave channel</span>
                </button>
              )}

              {!isLastOwner && isDefault && (
                <div
                  className="panel-action is-pending"
                  title="Default channels cannot be left"
                >
                  <Lock size={14} />
                  <span>Default channel — auto-joined</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Alert
        isOpen={pendingLeave}
        type="confirm"
        title="Leave this channel?"
        message={`Leave "${conversation.name}"? You can rejoin if it's public.`}
        confirmText="Leave"
        cancelText="Cancel"
        onConfirm={handleLeave}
        onCancel={() => setPendingLeave(false)}
      />

      <Alert
        isOpen={pendingClear}
        type="confirm"
        title="Clear this chat?"
        message={`Clear all messages from "${conversation.name}" in your view? Other members will still see their own copy. This cannot be undone.`}
        confirmText="Clear chat"
        cancelText="Cancel"
        onConfirm={handleConfirmClear}
        onCancel={() => setPendingClear(false)}
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