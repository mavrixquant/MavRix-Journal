// apps/web/src/features/personal/chats/components/GroupSettingsModal.jsx
//
// PHASE 4 — trimmed to SETTINGS ONLY. Member management has moved to
// GroupProfilePanel. Kept in this modal:
//   • Name / Description / Visibility / Color / Emoji
//   • Danger zone: Delete group (owner/superadmin only)
// Leave group now lives in GroupProfilePanel.

import { useEffect, useState, useCallback } from 'react';
import { X, Hash, Lock, Trash2, ShieldCheck } from 'lucide-react';

import Portal from '@/shared/components/Portal';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  useUpdateGroup,
  useDeleteGroup,
} from '@/shared/api/chat';
import {
  GROUP_COLORS,
  GROUP_NAME_MAX,
  GROUP_DESCRIPTION_MAX,
  GROUP_ICON_EMOJI_MAX,
} from '@mavrix/shared';
import GroupAvatar from './GroupAvatar';

export default function GroupSettingsModal({
  isOpen,
  onClose,
  conversation,
  onConversationClosed,
}) {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'public',
    color: 'var(--accent)',
    iconEmoji: '',
  });
  const [error, setError] = useState('');

  const groupId = conversation?.id;

  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const saving = updateGroup.isPending || deleteGroup.isPending;

  const myRole = conversation?.role || 'member';
  const canDelete = myRole === 'owner' || isSuperadmin;

  useEffect(() => {
    if (!isOpen || !conversation) return;
    setError('');
    setForm({
      name: conversation.name || '',
      description: conversation.description || '',
      visibility: conversation.visibility || 'public',
      color: conversation.color || 'var(--accent)',
      iconEmoji: conversation.iconEmoji || '',
    });
  }, [isOpen, conversation]);

  const handleSave = useCallback(async () => {
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

  const handleDelete = useCallback(async () => {
    if (!window.confirm(
      `Delete "${conversation.name}"?\n\nAll messages and members will be removed. This cannot be undone.`
    )) return;
    setError('');
    try {
      await deleteGroup.mutateAsync(groupId);
      onClose();
      onConversationClosed?.();
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
              <h2 className="gsm-title">
                {conversation.name || 'Untitled group'}
              </h2>
              <p className="gsm-sub">Edit group settings</p>
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

          <div className="gsm-body">
            {error && <div className="gsm-error">{error}</div>}

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
                <span className="gsm-label-hint">
                  max {GROUP_ICON_EMOJI_MAX}
                </span>
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

            {canDelete && (
              <div className="gsm-section is-danger">
                <span className="gsm-section-title">
                  <ShieldCheck
                    size={11}
                    style={{ verticalAlign: 'middle', marginRight: 6 }}
                  />
                  Danger zone
                </span>
                <div className="gsm-danger-actions">
                  <button
                    type="button"
                    className="gsm-btn gsm-btn-danger"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    <Trash2 size={11} />
                    Delete this group
                  </button>
                </div>
              </div>
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
            <button
              type="button"
              className="gsm-btn gsm-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {updateGroup.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}