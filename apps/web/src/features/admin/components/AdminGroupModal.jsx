
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  X, Hash, Lock, Crown, Trash2, Loader2, UserPlus,
} from 'lucide-react';

import Portal from '@/shared/components/Portal';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  useAdminGroup,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useAddGroupMember,
  useRemoveGroupMember,
  useSetGroupMemberRole,
  useChatUserSearch,
} from '@/shared/api/chat';
import {
  GROUP_COLORS,
  GROUP_NAME_MAX,
  GROUP_DESCRIPTION_MAX,
  GROUP_ICON_EMOJI_MAX,
} from '@mavrix/shared';


const CSS = `
  .agm-modal {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;

    width: 100%;
    max-width: 560px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow:
      0 40px 100px -30px rgba(0,0,0,.95),
      0 0 0 1px var(--accent-soft);
    color: var(--ink-1);
    overflow: hidden;
    position: relative;
    animation: agmPop .28s cubic-bezier(.2,.8,.25,1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .agm-modal::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: agmGrad 4s linear infinite;
    pointer-events: none;
    z-index: 1;
  }

  .agm-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .agm-title { font-size: 15px; font-weight: 700; margin: 0; letter-spacing: -.01em; }
  .agm-sub {
    margin: 3px 0 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    letter-spacing: .02em;
  }
  .agm-close {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
    transition: all .2s;
    flex-shrink: 0;
  }
  .agm-close:hover:not(:disabled) { color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .agm-close:disabled { opacity: .35; cursor: not-allowed; }

  .agm-tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    margin: 12px 22px 0;
    background: rgba(0,0,0,.32);
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.06);
    flex-shrink: 0;
  }
  .agm-tab {
    flex: 1;
    padding: 8px 12px;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .18s;
  }
  .agm-tab:hover:not(.is-active) { color: var(--ink-1); background: rgba(255,255,255,.04); }
  .agm-tab.is-active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-weight: 700;
    box-shadow: 0 6px 16px -8px color-mix(in srgb, var(--accent) 60%, transparent);
  }

  .agm-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 16px 22px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .agm-body::-webkit-scrollbar { width: 6px; }
  .agm-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 99px; }

  .agm-field { display: flex; flex-direction: column; gap: 6px; }
  .agm-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .agm-label-hint {
    font-weight: 500;
    letter-spacing: .02em;
    text-transform: none;
    color: var(--ink-3);
    opacity: .75;
  }
  .agm-input, .agm-textarea {
    width: 100%;
    padding: 10px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: var(--ink-1);
    font-size: 13px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    outline: none;
    box-sizing: border-box;
    transition: border-color .18s, box-shadow .2s;
  }
  .agm-textarea { resize: vertical; min-height: 62px; font-family: Inter, sans-serif; line-height: 1.55; }
  .agm-input::placeholder, .agm-textarea::placeholder { color: var(--ink-3); }
  .agm-input:focus, .agm-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }
  .agm-input:disabled, .agm-textarea:disabled { opacity: .55; cursor: not-allowed; }

  .agm-vis-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .agm-vis-tile {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(255,255,255,.02);
    cursor: pointer;
    transition: all .18s;
    text-align: left;
  }
  .agm-vis-tile:hover:not(:disabled) { border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.04); }
  .agm-vis-tile.is-active { border-color: var(--accent-soft2); background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .agm-vis-tile:disabled { opacity: .4; cursor: not-allowed; }
  .agm-vis-icon {
    flex-shrink: 0;
    width: 28px; height: 28px;
    border-radius: 9px;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    color: var(--ink-2);
    margin-top: 1px;
  }
  .agm-vis-tile.is-active .agm-vis-icon {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    border-color: var(--accent-soft2);
    color: var(--accent);
  }
  .agm-vis-name { font-size: 12.5px; font-weight: 700; color: var(--ink-1); margin-bottom: 2px; }
  .agm-vis-desc {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; line-height: 1.55; color: var(--ink-2);
  }

  .agm-colors { display: flex; flex-wrap: wrap; gap: 8px; }
  .agm-color {
    width: 30px; height: 30px; padding: 0;
    border-radius: 10px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform .18s, border-color .18s, box-shadow .2s;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.3);
  }
  .agm-color:hover:not(:disabled) { transform: scale(1.08); }
  .agm-color.is-active {
    border-color: #FFFFFF;
    box-shadow:
      0 0 0 3px rgba(255,255,255,.14),
      0 0 18px var(--swatch-color, transparent),
      inset 0 1px 0 rgba(255,255,255,.3);
  }
  .agm-color:disabled { opacity: .4; cursor: not-allowed; transform: none; }

  .agm-emoji-row { display: flex; gap: 8px; align-items: stretch; }
  .agm-emoji-preview {
    flex-shrink: 0;
    width: 42px; height: 42px;
    border-radius: 10px;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    font-size: 20px;
    color: var(--ink-3);
  }

  .agm-search { position: relative; flex-shrink: 0; }
  .agm-search input {
    width: 100%;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(10,13,19,.7);
    color: var(--ink-1);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    outline: none;
    box-sizing: border-box;
    transition: border-color .2s, box-shadow .2s;
  }
  .agm-search input::placeholder { color: var(--ink-3); }
  .agm-search input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }

  .agm-add-results {
    margin-top: 6px;
    padding: 6px;
    border-radius: 10px;
    border: 1px solid var(--line-soft);
    background: rgba(0,0,0,.28);
    max-height: 200px;
    overflow-y: auto;
  }
  .agm-add-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 7px 8px;
    border-radius: 7px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: all .15s;
  }
  .agm-add-row:hover:not(:disabled) { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.06); }
  .agm-add-row:disabled { opacity: .5; cursor: not-allowed; }

  .agm-member-list { display: flex; flex-direction: column; gap: 2px; }
  .agm-member {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border-radius: 9px;
    border: 1px solid transparent;
    transition: background-color .15s, border-color .15s;
  }
  .agm-member:hover { background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.06); }
  .agm-member-avatar {
    flex-shrink: 0;
    width: 34px; height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, transparent), color-mix(in srgb, var(--accent) 5%, transparent));
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 700;
    display: inline-flex; align-items: center; justify-content: center;
    overflow: hidden;
    letter-spacing: .02em;
  }
  .agm-member-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .agm-member-body { flex: 1; min-width: 0; }
  .agm-member-name {
    font-size: 13px; font-weight: 600; color: var(--ink-1);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .agm-member-email {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: var(--ink-3);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .agm-role-chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 99px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
    border: 1px solid;
    white-space: nowrap;
  }
  .agm-role-chip.is-owner { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); border-color: var(--accent-soft2); }
  .agm-role-chip.is-moderator { color: #60a5fa; background: rgba(96,165,250,.10); border-color: rgba(96,165,250,.32); }
  .agm-role-chip.is-member { color: var(--ink-2); background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.10); }

  .agm-member-actions { display: inline-flex; gap: 4px; flex-shrink: 0; opacity: .5; transition: opacity .15s; }
  .agm-member:hover .agm-member-actions { opacity: 1; }

  .agm-icon-btn {
    width: 26px; height: 26px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025);
    color: var(--ink-2);
    cursor: pointer;
    transition: all .18s;
  }
  .agm-icon-btn:hover:not(:disabled) {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border-color: var(--accent-soft2);
  }
  .agm-icon-btn.is-danger:hover:not(:disabled) {
    color: #f87171;
    background: rgba(239,68,68,.10);
    border-color: rgba(239,68,68,.42);
  }
  .agm-icon-btn:disabled { opacity: .35; cursor: not-allowed; }

  .agm-error {
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.28);
    color: #fca5a5;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; line-height: 1.55;
  }

  .agm-empty {
    padding: 30px 16px;
    text-align: center;
    color: var(--ink-3);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px; line-height: 1.7;
  }

  .agm-foot {
    padding: 14px 22px;
    border-top: 1px solid var(--line-soft);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: rgba(0,0,0,.15);
    flex-shrink: 0;
  }
  .agm-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .2s;
    white-space: nowrap;
  }
  .agm-btn:hover:not(:disabled) {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .agm-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
  .agm-btn-primary {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    border: none;
    font-weight: 700;
    box-shadow: 0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent), inset 0 1px 0 rgba(255,255,255,.4);
  }
  .agm-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px color-mix(in srgb, var(--accent) 70%, transparent), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .agm-btn-danger {
    background: rgba(239,68,68,.06);
    border-color: rgba(239,68,68,.32);
    color: #f87171;
  }
  .agm-btn-danger:hover:not(:disabled) {
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55);
    color: #fca5a5;
  }

  @keyframes agmPop {
    from { opacity: 0; transform: translateY(-10px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes agmGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .agm-modal, .agm-modal::before { animation: none !important; }
    .agm-btn, .agm-color, .agm-vis-tile, .agm-icon-btn, .agm-close, .agm-tab, .agm-member { transition: none !important; }
  }
`;


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

const EMPTY_FORM = {
  name: '',
  description: '',
  visibility: 'public',
  color: 'var(--accent)',
  iconEmoji: '',
};

export default function AdminGroupModal({ isOpen, onClose, groupId = null }) {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const isCreate = !groupId;

  const [tab, setTab] = useState('settings');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  const {
    data: group,
    isLoading: loadingGroup,
  } = useAdminGroup(groupId);

  const { data: searchResults = [], isFetching: searchingUsers } =
    useChatUserSearch(debouncedTerm);

  const createMutation = useCreateGroup();
  const updateMutation = useUpdateGroup();
  const deleteMutation = useDeleteGroup();
  const addMemberMutation = useAddGroupMember();
  const removeMemberMutation = useRemoveGroupMember();
  const setRoleMutation = useSetGroupMemberRole();

  const saving =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setTab('settings');
    setError('');
    setSearchTerm('');
    setDebouncedTerm('');
    if (isCreate) {
      setForm(EMPTY_FORM);
    } else if (group) {
      setForm({
        name: group.name || '',
        description: group.description || '',
        visibility: group.visibility || 'public',
        color: group.color || 'var(--accent)',
        iconEmoji: group.iconEmoji || '',
      });
    }
  }, [isOpen, isCreate, group]);

  const members = group?.members || [];
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


  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = useCallback(async () => {
    setError('');
    const trimmedName = form.name.trim();
    if (!trimmedName) { setError('Name is required.'); return; }

    try {
      if (isCreate) {
        await createMutation.mutateAsync({
          name: trimmedName,
          description: form.description.trim(),
          visibility: isSuperadmin ? form.visibility : 'public',
          color: form.color,
          iconEmoji: form.iconEmoji.trim() || null,
        });
      } else {
        const patch = {};
        if (trimmedName !== (group.name || '')) patch.name = trimmedName;
        if (form.description.trim() !== (group.description || '')) {
          patch.description = form.description.trim();
        }
        if (isSuperadmin && form.visibility !== group.visibility) {
          patch.visibility = form.visibility;
        }
        if (form.color !== group.color) patch.color = form.color;
        if ((form.iconEmoji.trim() || null) !== (group.iconEmoji || null)) {
          patch.iconEmoji = form.iconEmoji.trim() || null;
        }
        if (Object.keys(patch).length === 0) {
          setError('No changes to save.');
          return;
        }
        await updateMutation.mutateAsync({ groupId, patch });
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not save.');
    }
  }, [form, isCreate, isSuperadmin, createMutation, updateMutation, group, groupId, onClose]);

  const handleAddMember = useCallback(
    async (userId) => {
      setError('');
      try {
        await addMemberMutation.mutateAsync({ groupId, userId });
        setSearchTerm('');
        setDebouncedTerm('');
      } catch (err) {
        setError(err?.message || 'Could not add member.');
      }
    },
    [addMemberMutation, groupId]
  );

  const handleRemoveMember = useCallback(
    async (userId) => {
      setError('');
      try {
        await removeMemberMutation.mutateAsync({ groupId, userId });
      } catch (err) {
        setError(err?.message || 'Could not remove member.');
      }
    },
    [removeMemberMutation, groupId]
  );

  const handleMakeOwner = useCallback(
    async (userId) => {
      setError('');
      try {
        await setRoleMutation.mutateAsync({ groupId, userId, role: 'owner' });
      } catch (err) {
        setError(err?.message || 'Could not change role.');
      }
    },
    [setRoleMutation, groupId]
  );

  const handleDelete = useCallback(async () => {
    if (!window.confirm(
      `Delete "${group?.name}"?\n\nAll messages and members will be removed. This cannot be undone.`
    )) return;
    setError('');
    try {
      await deleteMutation.mutateAsync(groupId);
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not delete group.');
    }
  }, [group, deleteMutation, groupId, onClose]);

  if (!isOpen) return null;


  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="chat-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) onClose();
        }}
      >
        <div className="agm-modal" role="dialog" aria-modal="true">
          {}
          <div className="agm-head">
            <div style={{ minWidth: 0 }}>
              <h2 className="agm-title">
                {isCreate ? 'New group' : (group?.name || 'Loading…')}
              </h2>
              <p className="agm-sub">
                {isCreate
                  ? 'Create a new chat group'
                  : `${members.length} member${members.length === 1 ? '' : 's'} · ${group?.visibility || '—'}`}
              </p>
            </div>
            <button
              type="button"
              className="agm-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {}
          {!isCreate && (
            <div className="agm-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'settings'}
                className={`agm-tab${tab === 'settings' ? ' is-active' : ''}`}
                onClick={() => setTab('settings')}
              >
                Settings
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'members'}
                className={`agm-tab${tab === 'members' ? ' is-active' : ''}`}
                onClick={() => setTab('members')}
              >
                Members
              </button>
            </div>
          )}

          {}
          <div className="agm-body">
            {error && <div className="agm-error">{error}</div>}

            {!isCreate && loadingGroup && (
              <div className="agm-empty">
                <Loader2 size={18} style={{ animation: 'agmSpin .8s linear infinite' }} />
                <style>{`@keyframes agmSpin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {}
            {(isCreate || tab === 'settings') && (!loadingGroup || isCreate) && (
              <>
                <div className="agm-field">
                  <label className="agm-label" htmlFor="agm-name">
                    <span>Name</span>
                    <span className="agm-label-hint">{form.name.length} / {GROUP_NAME_MAX}</span>
                  </label>
                  <input
                    id="agm-name"
                    className="agm-input"
                    type="text"
                    value={form.name}
                    maxLength={GROUP_NAME_MAX}
                    placeholder="e.g. NQ Desk"
                    autoFocus
                    disabled={saving}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </div>

                <div className="agm-field">
                  <label className="agm-label" htmlFor="agm-desc">
                    <span>Description</span>
                    <span className="agm-label-hint">optional</span>
                  </label>
                  <textarea
                    id="agm-desc"
                    className="agm-textarea"
                    value={form.description}
                    maxLength={GROUP_DESCRIPTION_MAX}
                    placeholder="What is this group about?"
                    disabled={saving}
                    onChange={(e) => set('description', e.target.value)}
                  />
                </div>

                <div className="agm-field">
                  <span className="agm-label">
                    <span>Visibility</span>
                    {!isSuperadmin && <span className="agm-label-hint">superadmin only</span>}
                  </span>
                  <div className="agm-vis-row">
                    <button
                      type="button"
                      className={`agm-vis-tile ${form.visibility === 'public' ? 'is-active' : ''}`}
                      onClick={() => isSuperadmin && set('visibility', 'public')}
                      disabled={saving || !isSuperadmin}
                    >
                      <span className="agm-vis-icon"><Hash size={13} /></span>
                      <span>
                        <div className="agm-vis-name">Public</div>
                        <div className="agm-vis-desc">Anyone can discover and join.</div>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`agm-vis-tile ${form.visibility === 'private' ? 'is-active' : ''}`}
                      onClick={() => isSuperadmin && set('visibility', 'private')}
                      disabled={saving || !isSuperadmin}
                    >
                      <span className="agm-vis-icon"><Lock size={13} /></span>
                      <span>
                        <div className="agm-vis-name">Private</div>
                        <div className="agm-vis-desc">Invite-only. Hidden from discovery.</div>
                      </span>
                    </button>
                  </div>
                </div>

                <div className="agm-field">
                  <span className="agm-label"><span>Accent color</span></span>
                  <div className="agm-colors">
                    {GROUP_COLORS.map((c) => {
                      const active = form.color === c.hex;
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          className={`agm-color ${active ? 'is-active' : ''}`}
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

                <div className="agm-field">
                  <label className="agm-label" htmlFor="agm-emoji">
                    <span>Icon emoji</span>
                    <span className="agm-label-hint">max {GROUP_ICON_EMOJI_MAX}</span>
                  </label>
                  <div className="agm-emoji-row">
                    <input
                      id="agm-emoji"
                      className="agm-input"
                      type="text"
                      value={form.iconEmoji}
                      maxLength={GROUP_ICON_EMOJI_MAX}
                      placeholder="e.g. 📈 or 🎯"
                      disabled={saving}
                      onChange={(e) => set('iconEmoji', e.target.value)}
                    />
                    <span className="agm-emoji-preview">{form.iconEmoji.trim() || '·'}</span>
                  </div>
                </div>

                {!isCreate && (
                  <div className="agm-field">
                    <button
                      type="button"
                      className="agm-btn agm-btn-danger"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      <Trash2 size={11} />
                      Delete group
                    </button>
                  </div>
                )}
              </>
            )}

            {}
            {!isCreate && tab === 'members' && !loadingGroup && (
              <>
                <div className="agm-search">
                  <input
                    type="text"
                    placeholder="Search by name or email to add…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    spellCheck={false}
                  />

                  {debouncedTerm.length >= 2 && (
                    <div className="agm-add-results">
                      {searchingUsers && addableUsers.length === 0 && (
                        <div className="agm-empty" style={{ padding: 16 }}>
                          <Loader2 size={16} style={{ animation: 'agmSpin .8s linear infinite' }} />
                        </div>
                      )}

                      {!searchingUsers && addableUsers.length === 0 && (
                        <div className="agm-empty" style={{ padding: 16 }}>
                          No new users match “{debouncedTerm}”.
                        </div>
                      )}

                      {addableUsers.slice(0, 8).map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="agm-add-row"
                          onClick={() => handleAddMember(u.id)}
                          disabled={addMemberMutation.isPending}
                        >
                          <span className="agm-member-avatar">
                            {u.photoUrl ? <img src={u.photoUrl} alt="" /> : initialsOf(u)}
                          </span>
                          <span className="agm-member-body">
                            <span className="agm-member-name">{displayNameOf(u)}</span>
                            <span className="agm-member-email">{u.email}</span>
                          </span>
                          <UserPlus size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="agm-member-list">
                  {members.length === 0 && (
                    <div className="agm-empty">No members yet.</div>
                  )}
                  {members.map((m) => {
                    const chipCls =
                      m.role === 'owner' ? 'is-owner'
                      : m.role === 'moderator' ? 'is-moderator'
                      : 'is-member';
                    const canRemove = !(m.role === 'owner' && ownerCount <= 1);
                    const canMakeOwner = m.role !== 'owner';

                    return (
                      <div key={m.id} className="agm-member">
                        <span className="agm-member-avatar">
                          {m.user?.photoUrl ? <img src={m.user.photoUrl} alt="" /> : initialsOf(m.user)}
                        </span>
                        <div className="agm-member-body">
                          <div className="agm-member-name">{displayNameOf(m.user)}</div>
                          <div className="agm-member-email">{m.user?.email}</div>
                        </div>
                        <span className={`agm-role-chip ${chipCls}`}>
                          {ROLE_LABELS[m.role] || m.role}
                        </span>
                        <div className="agm-member-actions">
                          {canMakeOwner && (
                            <button
                              type="button"
                              className="agm-icon-btn"
                              onClick={() => handleMakeOwner(m.userId)}
                              disabled={setRoleMutation.isPending}
                              title="Make owner"
                              aria-label="Make owner"
                            >
                              <Crown size={12} />
                            </button>
                          )}
                          {canRemove && (
                            <button
                              type="button"
                              className="agm-icon-btn is-danger"
                              onClick={() => handleRemoveMember(m.userId)}
                              disabled={removeMemberMutation.isPending}
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
          </div>

          {}
          <div className="agm-foot">
            <button type="button" className="agm-btn" onClick={onClose} disabled={saving}>
              Close
            </button>
            {(isCreate || tab === 'settings') && (
              <button
                type="button"
                className="agm-btn agm-btn-primary"
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
              >
                {saving ? 'Saving…' : (isCreate ? 'Create group' : 'Save changes')}
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}