// apps/web/src/features/personal/chats/components/GroupSettingsModal.jsx
//
// Group administration modal, opened from the group thread header by
// admins / superadmins / the group's own creator. Two tabs:
//
//   Members  — list, role chips, add-member search, per-member actions
//   Settings — edit name / description / visibility / color / emoji,
//              plus a danger zone (leave, delete)
//
// Permission model (mirrors the backend):
//   superadmin → may edit every field on every group
//   admin      → may edit public groups + groups they created; may NOT
//                flip visibility, may NOT create private groups.
//
// All mutations are handled by hooks in @/shared/api/chat.js, which
// invalidate both the admin group cache AND the user chat cache so the
// sidebar updates live.

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

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                         */
/* ------------------------------------------------------------------ */

const CSS = `
  .gsm-modal {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
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
    animation: gsmPop .28s cubic-bezier(.2,.8,.25,1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .gsm-modal::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: gsmGrad 4s linear infinite;
    pointer-events: none;
    z-index: 1;
  }

  .gsm-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .gsm-head-meta { flex: 1; min-width: 0; }
  .gsm-title {
    font-size: 15px;
    font-weight: 700;
    margin: 0;
    letter-spacing: -.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .gsm-sub {
    margin: 3px 0 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    letter-spacing: .02em;
  }
  .gsm-close {
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
  .gsm-close:hover:not(:disabled) {
    color: var(--accent);
    background: rgba(245,158,11,.08);
  }
  .gsm-close:disabled { opacity: .35; cursor: not-allowed; }

  .gsm-tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    margin: 12px 22px 0;
    background: rgba(0,0,0,.32);
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.06);
    flex-shrink: 0;
  }
  .gsm-tab {
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
  .gsm-tab:hover:not(.is-active) {
    color: var(--ink-1);
    background: rgba(255,255,255,.04);
  }
  .gsm-tab.is-active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-weight: 700;
    box-shadow: 0 6px 16px -8px rgba(245,158,11,.6);
  }

  .gsm-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 16px 22px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .gsm-body::-webkit-scrollbar { width: 6px; }
  .gsm-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  .gsm-search { position: relative; flex-shrink: 0; }
  .gsm-search input {
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
  .gsm-search input::placeholder { color: var(--ink-3); }
  .gsm-search input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }

  .gsm-add-results {
    margin-top: 6px;
    padding: 6px;
    border-radius: 10px;
    border: 1px solid var(--line-soft);
    background: rgba(0,0,0,.28);
    max-height: 200px;
    overflow-y: auto;
  }
  .gsm-add-results-label {
    padding: 4px 8px 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .gsm-add-row {
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
  .gsm-add-row:hover:not(:disabled) {
    background: rgba(255,255,255,.04);
    border-color: rgba(255,255,255,.06);
  }
  .gsm-add-row:disabled { opacity: .5; cursor: not-allowed; }

  .gsm-member-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .gsm-member {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border-radius: 9px;
    border: 1px solid transparent;
    transition: background-color .15s, border-color .15s;
  }
  .gsm-member:hover {
    background: rgba(255,255,255,.03);
    border-color: rgba(255,255,255,.06);
  }
  .gsm-member-avatar {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(245,158,11,.20), rgba(245,158,11,.05));
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    letter-spacing: .02em;
  }
  .gsm-member-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .gsm-member-body { flex: 1; min-width: 0; }
  .gsm-member-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .gsm-member-email {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gsm-role-chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 99px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    border: 1px solid;
    white-space: nowrap;
  }
  .gsm-role-chip.is-owner {
    color: var(--accent);
    background: rgba(245,158,11,.10);
    border-color: var(--accent-soft2);
  }
  .gsm-role-chip.is-moderator {
    color: #60a5fa;
    background: rgba(96,165,250,.10);
    border-color: rgba(96,165,250,.32);
  }
  .gsm-role-chip.is-member {
    color: var(--ink-2);
    background: rgba(255,255,255,.03);
    border-color: rgba(255,255,255,.10);
  }

  .gsm-member-actions {
    display: inline-flex;
    gap: 4px;
    flex-shrink: 0;
    opacity: .5;
    transition: opacity .15s;
  }
  .gsm-member:hover .gsm-member-actions { opacity: 1; }

  .gsm-icon-btn {
    width: 26px;
    height: 26px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025);
    color: var(--ink-2);
    cursor: pointer;
    transition: all .18s;
  }
  .gsm-icon-btn:hover:not(:disabled) {
    color: var(--accent);
    background: rgba(245,158,11,.10);
    border-color: var(--accent-soft2);
  }
  .gsm-icon-btn.is-danger:hover:not(:disabled) {
    color: #f87171;
    background: rgba(239,68,68,.10);
    border-color: rgba(239,68,68,.42);
  }
  .gsm-icon-btn:disabled { opacity: .35; cursor: not-allowed; }

  .gsm-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .gsm-label {
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
  .gsm-label-hint {
    font-weight: 500;
    letter-spacing: .02em;
    text-transform: none;
    color: var(--ink-3);
    opacity: .75;
  }
  .gsm-input,
  .gsm-textarea {
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
  .gsm-textarea {
    resize: vertical;
    min-height: 62px;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    line-height: 1.55;
  }
  .gsm-input::placeholder,
  .gsm-textarea::placeholder { color: var(--ink-3); }
  .gsm-input:focus,
  .gsm-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .gsm-input:disabled,
  .gsm-textarea:disabled { opacity: .55; cursor: not-allowed; }

  .gsm-vis-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .gsm-vis-tile {
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
  .gsm-vis-tile:hover:not(:disabled):not(.is-disabled) {
    border-color: rgba(255,255,255,.16);
    background: rgba(255,255,255,.04);
  }
  .gsm-vis-tile.is-active {
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.08);
  }
  .gsm-vis-tile.is-disabled,
  .gsm-vis-tile:disabled {
    opacity: .4;
    cursor: not-allowed;
  }
  .gsm-vis-icon {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    color: var(--ink-2);
    margin-top: 1px;
  }
  .gsm-vis-tile.is-active .gsm-vis-icon {
    background: rgba(245,158,11,.14);
    border-color: var(--accent-soft2);
    color: var(--accent);
  }
  .gsm-vis-name {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ink-1);
    margin-bottom: 2px;
  }
  .gsm-vis-desc {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    line-height: 1.55;
    color: var(--ink-2);
  }

  .gsm-colors {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .gsm-color {
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: 10px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform .18s, border-color .18s, box-shadow .2s;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.3);
  }
  .gsm-color:hover:not(:disabled) { transform: scale(1.08); }
  .gsm-color.is-active {
    border-color: #FFFFFF;
    box-shadow:
      0 0 0 3px rgba(255,255,255,.14),
      0 0 18px var(--swatch-color, transparent),
      inset 0 1px 0 rgba(255,255,255,.3);
  }
  .gsm-color:disabled { opacity: .4; cursor: not-allowed; transform: none; }

  .gsm-emoji-row {
    display: flex;
    gap: 8px;
    align-items: stretch;
  }
  .gsm-emoji-preview {
    flex-shrink: 0;
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    font-size: 20px;
    color: var(--ink-3);
  }

  .gsm-section {
    padding: 14px;
    border-radius: 12px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .gsm-section-title {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .gsm-section.is-danger {
    border-color: rgba(239,68,68,.24);
    background: rgba(239,68,68,.03);
  }
  .gsm-section.is-danger .gsm-section-title { color: #f87171; }

  .gsm-danger-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .gsm-error {
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.28);
    color: #fca5a5;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    line-height: 1.55;
  }

  .gsm-empty {
    padding: 30px 16px;
    text-align: center;
    color: var(--ink-3);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.7;
  }

  .gsm-foot {
    padding: 14px 22px;
    border-top: 1px solid var(--line-soft);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: rgba(0,0,0,.15);
    flex-shrink: 0;
  }
  .gsm-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .2s;
    white-space: nowrap;
  }
  .gsm-btn:hover:not(:disabled) {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .gsm-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
  .gsm-btn-primary {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    border: none;
    font-weight: 700;
    box-shadow: 0 10px 30px -8px rgba(245,158,11,.55), inset 0 1px 0 rgba(255,255,255,.4);
  }
  .gsm-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px rgba(245,158,11,.7), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .gsm-btn-danger {
    background: rgba(239,68,68,.06);
    border-color: rgba(239,68,68,.32);
    color: #f87171;
    width: 100%;
    justify-content: center;
  }
  .gsm-btn-danger:hover:not(:disabled) {
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55);
    color: #fca5a5;
  }

  @keyframes gsmPop {
    from { opacity: 0; transform: translateY(-10px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes gsmGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .gsm-modal, .gsm-modal::before { animation: none !important; }
    .gsm-btn, .gsm-color, .gsm-vis-tile, .gsm-icon-btn, .gsm-close, .gsm-tab, .gsm-member { transition: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */

export default function GroupSettingsModal({
  isOpen,
  onClose,
  conversation,
  onConversationClosed,
}) {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  const [tab, setTab] = useState('members');
  const [error, setError] = useState('');

  // Members tab
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // Settings tab
  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'public',
    color: '#F59E0B',
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

  /* ---------- Debounce the add-member search ---------- */
  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm, isOpen]);

  /* ---------- Reset on open ---------- */
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
      color: conversation.color || '#F59E0B',
      iconEmoji: conversation.iconEmoji || '',
    });
  }, [isOpen, conversation]);

  /* ---------- Derived ---------- */
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

  /* ---------- Handlers ---------- */

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

  /* ---------- Guard ---------- */

  if (!isOpen || !conversation) return null;

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  /* ---------- Render ---------- */

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="chat-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) onClose();
        }}
      >
        <div className="gsm-modal" role="dialog" aria-modal="true">
          {/* ---------- Header ---------- */}
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

          {/* ---------- Tabs ---------- */}
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

          {/* ---------- Body ---------- */}
          <div className="gsm-body">
            {error && <div className="gsm-error">{error}</div>}

            {/* ================== Members tab ================== */}
            {tab === 'members' && (
              <>
                {/* Add-member search */}
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
                          No new users match “{debouncedTerm}”.
                        </div>
                      )}

                      {addableUsers.length > 0 && (
                        <>
                          <div className="gsm-add-results-label">
                            Add to group
                          </div>
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

                {/* Members list */}
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

                    const canRemove =
                      !isSelf &&
                      !(m.role === 'owner' && ownerCount <= 1);

                    const canMakeOwner = m.role !== 'owner';

                    return (
                      <div key={m.id} className="gsm-member">
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
                              <span style={{
                                marginLeft: 6,
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: 10,
                                fontWeight: 600,
                                color: 'var(--ink-3)',
                              }}>
                                (you)
                              </span>
                            )}
                          </div>
                          <div className="gsm-member-email">{m.user?.email}</div>
                        </div>

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

            {/* ================== Settings tab ================== */}
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

                {/* ---------- Danger zone ---------- */}
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

          {/* ---------- Footer ---------- */}
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