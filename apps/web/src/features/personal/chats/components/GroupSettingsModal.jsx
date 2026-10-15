// apps/web/src/features/personal/chats/components/GroupSettingsModal.jsx
//
// Group administration modal. Two tabs:
//   Members  — list, role chips, add-member search, per-member actions.
//              Each member row is wrapped in <MemberProfilePopover /> so
//              clicking the avatar/name opens a mini profile card.
//   Settings — edit name / description / visibility / color / emoji,
//              plus a danger zone (leave, delete).
//
// Permission model:
//   superadmin → may edit every field, create private groups, delete any
//   admin      → may edit public groups + groups they created; may NOT
//                flip visibility or create private groups

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  X,
  Hash,
  Lock,
  Crown,
  Trash2,
  Loader2,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';

import Portal from '@/shared/components/Portal';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  useGroupMembers,
  useChatUserSearch,
  useUpdateGroup,
  useDeleteGroup,
  useAddGroupMember,
  useRemoveGroupMember,
  useSetGroupMemberRole,
  useLeaveGroup,
} from '@/shared/api/chat';
import {
  GROUP_COLORS,
  GROUP_NAME_MAX,
  GROUP_DESCRIPTION_MAX,
  GROUP_ICON_EMOJI_MAX,
} from '@mavrix/shared';
import GroupAvatar from './GroupAvatar';
import MemberProfilePopover from './MemberProfilePopover';

function initialsOf(user) {
  if (!user) return '?';
  const a = (user.firstName || '').trim();
  const b = (user.lastName || '').trim();
  if (a && b) return (a[0] + b[0]).toUpperCase();
  if (a) return a.slice(0, 2).toUpperCase();
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  return '?';
}

function displayNameOf(user) {
  if (!user) return 'Unknown';
  const a = (user.firstName || '').trim();
  const b = (user.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return user.email || 'Unknown';
}

const ROLE_LABELS = { owner: 'Owner', moderator: 'Mod', member: 'Member' };

export default function GroupSettingsModal({
  isOpen,
  onClose,
  conversation,
  onConversationClosed,
  onOpenThread,
}) {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  const [tab, setTab] = useState('members');
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'public',
    color: 'var(--accent)',
    iconEmoji: '',
  });

  const groupId = conversation?.id;

  const { data: members = [], isFetching: loadingMembers } = useGroupMembers(
    groupId,
    { enabled: isOpen && !!groupId }
  );

  const { data: searchResults = [], isFetching: searchingUsers } =
    useChatUserSearch(debouncedTerm);

  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();
  const setRole = useSetGroupMemberRole();
  const leaveGroup = useLeaveGroup();

  const saving =
    updateGroup.isPending ||
    deleteGroup.isPending ||
    leaveGroup.isPending;

  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm, isOpen]);

  useEffect(() => {
    if (!isOpen || !conversation) return;
    setTab('members');
    setError('');
    setSearchTerm('');
    setDebouncedTerm('');
    setForm({
      name: conversation.name || '',
      description: conversation.description || '',
      visibility: conversation.visibility || 'public',
      color: conversation.color || 'var(--accent)',
      iconEmoji: conversation.iconEmoji || '',
    });
  }, [isOpen, conversation]);

  const memberUserIds = useMemo(
    () => new Set(members.map((m) => m.userId)),
    [members]
  );

  const addableUsers = useMemo(
    () => searchResults.filter((u) => !memberUserIds.has(u.id)),
    [searchResults, memberUserIds]
  );

  const ownerCount = useMemo(
    () => members.filter((m) => m.role === 'owner').length,
    [members]
  );

  const myMembership = members.find((m) => m.userId === user?.id) || null;
  const myRole = myMembership?.role || conversation?.role || 'member';
  const isLastOwner = myRole === 'owner' && ownerCount <= 1;

  const handleAddMember = useCallback(
    async (userId) => {
      setError('');
      try {
        await addMember.mutateAsync({ groupId, userId });
        setSearchTerm('');
        setDebouncedTerm('');
      } catch (err) {
        setError(err?.message || 'Could not add member.');
      }
    },
    [addMember, groupId]
  );

  const handleRemoveMember = useCallback(
    async (userId) => {
      setError('');
      try {
        await removeMember.mutateAsync({ groupId, userId });
      } catch (err) {
        setError(err?.message || 'Could not remove member.');
      }
    },
    [removeMember, groupId]
  );

  const handleMakeOwner = useCallback(
    async (userId) => {
      setError('');
      try {
        await setRole.mutateAsync({ groupId, userId, role: 'owner' });
      } catch (err) {
        setError(err?.message || 'Could not change role.');
      }
    },
    [setRole, groupId]
  );

  const handleSaveSettings = useCallback(async () => {
    setError('');
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }

    const patch = {};
    if (trimmedName !== (conversation.name || '')) patch.name = trimmedName;
    if (form.description.trim() !== (conversation.description || '')) {
      patch.description = form.description.trim();
    }
    if (isSuperadmin && form.visibility !== conversation.visibility) {
      patch.visibility = form.visibility;
    }
    if (form.color !== conversation.color) patch.color = form.color;
    if ((form.iconEmoji.trim() || null) !== (conversation.iconEmoji || null)) {
      patch.iconEmoji = form.iconEmoji.trim() || null;
    }

    if (Object.keys(patch).length === 0) {
      setError('No changes to save.');
      return;
    }

    try {
      await updateGroup.mutateAsync({ groupId, patch });
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not save changes.');
    }
  }, [form, conversation, isSuperadmin, updateGroup, groupId, onClose]);

  const handleLeave = useCallback(async () => {
    if (!window.confirm(`Leave "${conversation.name}"?`)) return;
    setError('');
    try {
      await leaveGroup.mutateAsync(groupId);
      onClose();
      if (onConversationClosed) onConversationClosed();
    } catch (err) {
      setError(err?.message || 'Could not leave group.');
    }
  }, [conversation, leaveGroup, groupId, onClose, onConversationClosed]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm(
      `Delete "${conversation.name}"?\n\nAll messages and members will be removed. This cannot be undone.`
    )) return;
    setError('');
    try {
      await deleteGroup.mutateAsync(groupId);
      onClose();
      if (onConversationClosed) onConversationClosed();
    } catch (err) {
      setError(err?.message || 'Could not delete group.');
    }
  }, [conversation, deleteGroup, groupId, onClose, onConversationClosed]);

  if (!isOpen || !conversation) return null;

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <Portal>
      <div
        className="chat-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) onClose();
        }}
      >
        <div className="gsm-modal" role="dialog" aria-modal="true">
          <div className="gsm-head">
            <GroupAvatar group={conversation} size={40} />
            <div className="gsm-head-meta">
              <h2 className="gsm-title">{conversation.name || 'Untitled group'}</h2>
              <p className="gsm-sub">
                {members.length || conversation.memberCount || 0} member
                {(members.length || conversation.memberCount) === 1 ? '' : 's'} ·{' '}
                {conversation.visibility === 'private' ? 'Private' : 'Public'}
              </p>
            </div>
            <button
              type="button"
              className="gsm-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="gsm-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'members'}
              className={`gsm-tab${tab === 'members' ? ' is-active' : ''}`}
              onClick={() => setTab('members')}
            >
              Members
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'settings'}
              className={`gsm-tab${tab === 'settings' ? ' is-active' : ''}`}
              onClick={() => setTab('settings')}
            >
              Settings
            </button>
          </div>

          <div className="gsm-body">
            {error && <div className="gsm-error">{error}</div>}

            {tab === 'members' && (
              <>
                <div className="gsm-search">
                  <input
                    type="text"
                    placeholder="Search by name or email to add…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    spellCheck={false}
                  />

                  {debouncedTerm.length >= 2 && (
                    <div className="gsm-add-results">
                      {searchingUsers && addableUsers.length === 0 && (
                        <div className="gsm-empty" style={{ padding: 16 }}>
                          <Loader2 size={16} style={{ animation: 'gsmSpin .8s linear infinite' }} />
                          <style>{`@keyframes gsmSpin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                      )}

                      {!searchingUsers && addableUsers.length === 0 && (
                        <div className="gsm-empty" style={{ padding: 16 }}>
                          No new users match "{debouncedTerm}".
                        </div>
                      )}

                      {addableUsers.length > 0 && (
                        <>
                          <div className="gsm-add-results-label">Add to group</div>
                          {addableUsers.slice(0, 8).map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              className="gsm-add-row"
                              onClick={() => handleAddMember(u.id)}
                              disabled={addMember.isPending}
                            >
                              <span className="gsm-member-avatar">
                                {u.photoUrl ? <img src={u.photoUrl} alt="" /> : initialsOf(u)}
                              </span>
                              <span className="gsm-member-body">
                                <span className="gsm-member-name">{displayNameOf(u)}</span>
                                <span className="gsm-member-email">{u.email}</span>
                              </span>
                              <UserPlus size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="gsm-member-list">
                  {loadingMembers && members.length === 0 && (
                    <div className="gsm-empty">
                      <Loader2 size={16} style={{ animation: 'gsmSpin .8s linear infinite' }} />
                    </div>
                  )}

                  {!loadingMembers && members.length === 0 && (
                    <div className="gsm-empty">No members yet.</div>
                  )}

                  {members.map((m) => {
                    const isSelf = m.userId === user?.id;
                    const chipCls =
                      m.role === 'owner' ? 'is-owner'
                      : m.role === 'moderator' ? 'is-moderator'
                      : 'is-member';
                    const canRemove = !isSelf && !(m.role === 'owner' && ownerCount <= 1);
                    const canMakeOwner = m.role !== 'owner';

                    /* Wrap the avatar + name + email in the profile popover.
                       Role chip + action buttons stay outside so they keep
                       their existing behaviour. */
                    const triggerContent = (
                      <div className="gsm-member-trigger" role="button" tabIndex={0}>
                        <span className="gsm-member-avatar">
                          {m.user?.photoUrl ? (
                            <img src={m.user.photoUrl} alt="" />
                          ) : (
                            initialsOf(m.user)
                          )}
                        </span>
                        <div className="gsm-member-body">
                          <div className="gsm-member-name">
                            {displayNameOf(m.user)}
                            {isSelf && (
                              <span className="gsm-member-you"> (you)</span>
                            )}
                          </div>
                          <div className="gsm-member-email">{m.user?.email}</div>
                        </div>
                      </div>
                    );

                    return (
                      <div key={m.id} className="gsm-member">
                        {isSelf ? (
                          triggerContent
                        ) : (
                          <MemberProfilePopover
                            member={m}
                            currentUserId={user?.id}
                            onOpenThread={(id) => {
                              onClose();
                              if (onOpenThread) onOpenThread(id);
                            }}
                          >
                            {triggerContent}
                          </MemberProfilePopover>
                        )}

                        <span className={`gsm-role-chip ${chipCls}`}>
                          {ROLE_LABELS[m.role] || m.role}
                        </span>

                        <div className="gsm-member-actions">
                          {canMakeOwner && (
                            <button
                              type="button"
                              className="gsm-icon-btn"
                              onClick={() => handleMakeOwner(m.userId)}
                              disabled={saving || setRole.isPending}
                              title="Make owner"
                              aria-label="Make owner"
                            >
                              <Crown size={12} />
                            </button>
                          )}
                          {canRemove && (
                            <button
                              type="button"
                              className="gsm-icon-btn is-danger"
                              onClick={() => handleRemoveMember(m.userId)}
                              disabled={saving || removeMember.isPending}
                              title="Remove from group"
                              aria-label="Remove from group"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {tab === 'settings' && (
              <>
                <div className="gsm-field">
                  <label className="gsm-label" htmlFor="gsm-name">
                    <span>Name</span>
                    <span className="gsm-label-hint">
                      {form.name.length} / {GROUP_NAME_MAX}
                    </span>
                  </label>
                  <input
                    id="gsm-name"
                    className="gsm-input"
                    type="text"
                    value={form.name}
                    maxLength={GROUP_NAME_MAX}
                    disabled={saving}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </div>

                <div className="gsm-field">
                  <label className="gsm-label" htmlFor="gsm-desc">
                    <span>Description</span>
                  </label>
                  <textarea
                    id="gsm-desc"
                    className="gsm-textarea"
                    value={form.description}
                    maxLength={GROUP_DESCRIPTION_MAX}
                    disabled={saving}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="What is this group about?"
                  />
                </div>

                <div className="gsm-field">
                  <span className="gsm-label">
                    <span>Visibility</span>
                    {!isSuperadmin && (
                      <span className="gsm-label-hint">superadmin only</span>
                    )}
                  </span>
                  <div className="gsm-vis-row">
                    <button
                      type="button"
                      className={`gsm-vis-tile ${form.visibility === 'public' ? 'is-active' : ''}`}
                      onClick={() => isSuperadmin && set('visibility', 'public')}
                      disabled={saving || !isSuperadmin}
                    >
                      <span className="gsm-vis-icon"><Hash size={13} /></span>
                      <span>
                        <div className="gsm-vis-name">Public</div>
                        <div className="gsm-vis-desc">Anyone can discover and join.</div>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`gsm-vis-tile ${form.visibility === 'private' ? 'is-active' : ''}`}
                      onClick={() => isSuperadmin && set('visibility', 'private')}
                      disabled={saving || !isSuperadmin}
                    >
                      <span className="gsm-vis-icon"><Lock size={13} /></span>
                      <span>
                        <div className="gsm-vis-name">Private</div>
                        <div className="gsm-vis-desc">Invite-only. Hidden from discovery.</div>
                      </span>
                    </button>
                  </div>
                </div>

                <div className="gsm-field">
                  <span className="gsm-label"><span>Accent color</span></span>
                  <div className="gsm-colors">
                    {GROUP_COLORS.map((c) => {
                      const active = form.color === c.hex;
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          className={`gsm-color ${active ? 'is-active' : ''}`}
                          style={{ background: c.hex, '--swatch-color': c.hex }}
                          onClick={() => set('color', c.hex)}
                          disabled={saving}
                          title={c.label}
                          aria-label={c.label}
                          aria-pressed={active}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="gsm-field">
                  <label className="gsm-label" htmlFor="gsm-emoji">
                    <span>Icon emoji</span>
                    <span className="gsm-label-hint">max {GROUP_ICON_EMOJI_MAX}</span>
                  </label>
                  <div className="gsm-emoji-row">
                    <input
                      id="gsm-emoji"
                      className="gsm-input"
                      type="text"
                      value={form.iconEmoji}
                      maxLength={GROUP_ICON_EMOJI_MAX}
                      placeholder="e.g. 📈 or 🎯"
                      disabled={saving}
                      onChange={(e) => set('iconEmoji', e.target.value)}
                    />
                    <span className="gsm-emoji-preview">
                      {form.iconEmoji.trim() || '·'}
                    </span>
                  </div>
                </div>

                <div className="gsm-section is-danger">
                  <span className="gsm-section-title">
                    <ShieldCheck size={11} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Danger zone
                  </span>
                  <div className="gsm-danger-actions">
                    {!isLastOwner && (
                      <button
                        type="button"
                        className="gsm-btn gsm-btn-danger"
                        onClick={handleLeave}
                        disabled={saving}
                      >
                        Leave this group
                      </button>
                    )}
                    {(myRole === 'owner' || isSuperadmin) && (
                      <button
                        type="button"
                        className="gsm-btn gsm-btn-danger"
                        onClick={handleDelete}
                        disabled={saving}
                      >
                        <Trash2 size={11} />
                        Delete this group
                      </button>
                    )}
                    {isLastOwner && (
                      <div className="gsm-empty" style={{ padding: 8 }}>
                        You are the only owner. Promote someone else before leaving.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="gsm-foot">
            <button
              type="button"
              className="gsm-btn"
              onClick={onClose}
              disabled={saving}
            >
              Close
            </button>
            {tab === 'settings' && (
              <button
                type="button"
                className="gsm-btn gsm-btn-primary"
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {updateGroup.isPending ? 'Saving…' : 'Save changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}