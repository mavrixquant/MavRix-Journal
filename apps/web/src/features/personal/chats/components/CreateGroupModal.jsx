// apps/web/src/features/personal/chats/components/CreateGroupModal.jsx
//
// Admin/superadmin-only modal. Admins see only the "Public" radio; the
// backend also enforces this — the UI just hides the option so the user
// doesn't get a surprise 403.
//
// Uses GROUP_COLORS + GROUP_DEFAULT_COLOR + GROUP_VISIBILITIES from
// @mavrix/shared so the palette stays in sync with the rest of the app.
//
// NOTE: useCreateGroup lives in @/shared/api/chat.js (not features/admin/api.js)
// because that file targets /api/admin/groups/* but is called from the chat
// feature, and the feature-boundary ESLint rule forbids
// features/personal/* → features/admin/* imports.

import { useEffect, useState } from 'react';
import { X, Hash, Lock } from 'lucide-react';
import Portal from '@/shared/components/Portal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useCreateGroup } from '@/shared/api/chat';
import {
  GROUP_COLORS,
  GROUP_DEFAULT_COLOR,
  GROUP_NAME_MAX,
  GROUP_DESCRIPTION_MAX,
  GROUP_ICON_EMOJI_MAX,
} from '@mavrix/shared';

/* ------------------------------------------------------------------ */
/*  Scoped styles                                                      */
/* ------------------------------------------------------------------ */

const CSS = `
  .cgm-modal {
    
    
    
    
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;

    width: 100%;
    max-width: 520px;
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
    animation: cgmPop .28s cubic-bezier(.2,.8,.25,1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .cgm-modal::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: cgmGrad 4s linear infinite;
    pointer-events: none;
    z-index: 1;
  }

  .cgm-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .cgm-title {
    font-size: 15px;
    font-weight: 700;
    margin: 0;
    letter-spacing: -.01em;
  }
  .cgm-sub {
    margin: 3px 0 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    letter-spacing: .02em;
  }
  .cgm-close {
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
  }
  .cgm-close:hover:not(:disabled) {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }
  .cgm-close:disabled { opacity: .35; cursor: not-allowed; }

  .cgm-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .cgm-body::-webkit-scrollbar { width: 6px; }
  .cgm-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  .cgm-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .cgm-label {
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
  .cgm-label .cgm-label-hint {
    font-weight: 500;
    letter-spacing: .02em;
    text-transform: none;
    color: var(--ink-3);
    opacity: .75;
  }
  .cgm-input,
  .cgm-textarea {
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
  .cgm-textarea {
    resize: vertical;
    min-height: 62px;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    line-height: 1.55;
  }
  .cgm-input::placeholder,
  .cgm-textarea::placeholder { color: var(--ink-3); }
  .cgm-input:focus,
  .cgm-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }
  .cgm-input:disabled,
  .cgm-textarea:disabled { opacity: .55; cursor: not-allowed; }

  .cgm-vis-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .cgm-vis-tile {
    position: relative;
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
  .cgm-vis-tile:hover:not(.is-disabled) {
    border-color: rgba(255,255,255,.16);
    background: rgba(255,255,255,.04);
  }
  .cgm-vis-tile.is-active {
    border-color: var(--accent-soft2);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }
  .cgm-vis-tile.is-disabled {
    opacity: .4;
    cursor: not-allowed;
  }
  .cgm-vis-icon {
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
  .cgm-vis-tile.is-active .cgm-vis-icon {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    border-color: var(--accent-soft2);
    color: var(--accent);
  }
  .cgm-vis-name {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ink-1);
    margin-bottom: 2px;
  }
  .cgm-vis-desc {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    line-height: 1.55;
    color: var(--ink-2);
  }
  .cgm-vis-warn {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    color: var(--ink-3);
    margin-top: 3px;
    letter-spacing: .02em;
  }

  .cgm-colors {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .cgm-color {
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: 10px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform .18s, border-color .18s, box-shadow .2s;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.3);
  }
  .cgm-color:hover:not(:disabled) { transform: scale(1.08); }
  .cgm-color.is-active {
    border-color: #FFFFFF;
    box-shadow:
      0 0 0 3px rgba(255,255,255,.14),
      0 0 18px var(--swatch-color, transparent),
      inset 0 1px 0 rgba(255,255,255,.3);
  }
  .cgm-color:disabled { opacity: .4; cursor: not-allowed; transform: none; }

  .cgm-emoji-row {
    display: flex;
    gap: 8px;
    align-items: stretch;
  }
  .cgm-emoji-preview {
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

  .cgm-error {
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.28);
    color: #fca5a5;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    line-height: 1.55;
  }

  .cgm-foot {
    padding: 14px 22px;
    border-top: 1px solid var(--line-soft);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: rgba(0,0,0,.15);
    flex-shrink: 0;
  }
  .cgm-btn {
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
  }
  .cgm-btn:hover:not(:disabled) {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .cgm-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }

  .cgm-btn-primary {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    border: none;
    font-weight: 700;
    box-shadow:
      0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent),
      inset 0 1px 0 rgba(255,255,255,.4);
  }
  .cgm-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow:
      0 16px 42px -10px color-mix(in srgb, var(--accent) 70%, transparent),
      inset 0 1px 0 rgba(255,255,255,.5);
  }
  .cgm-btn-primary:disabled {
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 32%, transparent), color-mix(in srgb, var(--accent-2) 28%, transparent));
    color: rgba(13,17,23,.55);
    box-shadow: none;
  }

  @keyframes cgmPop {
    from { opacity: 0; transform: translateY(-10px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes cgmGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cgm-modal, .cgm-modal::before { animation: none !important; }
    .cgm-btn, .cgm-color, .cgm-vis-tile, .cgm-close { transition: none !important; }
  }
`;

/* ------------------------------------------------------------------ */

export default function CreateGroupModal({ isOpen, onClose, onCreated }) {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'public',
    color: GROUP_DEFAULT_COLOR,
    iconEmoji: '',
  });
  const [error, setError] = useState('');

  const createMutation = useCreateGroup();
  const saving = createMutation.isPending;

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: '',
      description: '',
      visibility: 'public',
      color: GROUP_DEFAULT_COLOR,
      iconEmoji: '',
    });
    setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const trimmedName = form.name.trim();
  const canSubmit = trimmedName.length > 0 && !saving;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;
    setError('');

    try {
      const payload = {
        name: trimmedName,
        description: form.description.trim(),
        visibility: isSuperadmin ? form.visibility : 'public',
        color: form.color,
        iconEmoji: form.iconEmoji.trim() || null,
      };
      const group = await createMutation.mutateAsync(payload);
      onClose();
      if (onCreated) onCreated(group.id);
    } catch (err) {
      setError(err?.message || 'Could not create group.');
    }
  };

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="chat-modal-overlay"
        onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
      >
        <form className="cgm-modal" onSubmit={handleSubmit} role="dialog" aria-modal="true">
          <div className="cgm-head">
            <div style={{ minWidth: 0 }}>
              <h2 className="cgm-title">New group</h2>
              <p className="cgm-sub">Create a chat room your team can join</p>
            </div>
            <button
              type="button"
              className="cgm-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="cgm-body">
            {error && <div className="cgm-error">{error}</div>}

            {/* Name */}
            <div className="cgm-field">
              <label className="cgm-label" htmlFor="cgm-name">
                <span>Name</span>
                <span className="cgm-label-hint">
                  {form.name.length} / {GROUP_NAME_MAX}
                </span>
              </label>
              <input
                id="cgm-name"
                className="cgm-input"
                type="text"
                value={form.name}
                maxLength={GROUP_NAME_MAX}
                placeholder="e.g. NQ Desk"
                autoFocus
                disabled={saving}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="cgm-field">
              <label className="cgm-label" htmlFor="cgm-desc">
                <span>Description</span>
                <span className="cgm-label-hint">optional</span>
              </label>
              <textarea
                id="cgm-desc"
                className="cgm-textarea"
                value={form.description}
                maxLength={GROUP_DESCRIPTION_MAX}
                placeholder="What is this group about?"
                disabled={saving}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>

            {/* Visibility */}
            <div className="cgm-field">
              <span className="cgm-label">
                <span>Visibility</span>
                {!isSuperadmin && <span className="cgm-label-hint">admin: public only</span>}
              </span>
              <div className="cgm-vis-row">
                <button
                  type="button"
                  className={`cgm-vis-tile ${form.visibility === 'public' ? 'is-active' : ''}`}
                  onClick={() => set('visibility', 'public')}
                  disabled={saving}
                >
                  <span className="cgm-vis-icon"><Hash size={13} /></span>
                  <span>
                    <div className="cgm-vis-name">Public</div>
                    <div className="cgm-vis-desc">Anyone can discover and join.</div>
                  </span>
                </button>

                <button
                  type="button"
                  className={`cgm-vis-tile ${form.visibility === 'private' ? 'is-active' : ''} ${!isSuperadmin ? 'is-disabled' : ''}`}
                  onClick={() => { if (isSuperadmin) set('visibility', 'private'); }}
                  disabled={saving || !isSuperadmin}
                  title={!isSuperadmin ? 'Only superadmins can create private groups' : ''}
                >
                  <span className="cgm-vis-icon"><Lock size={13} /></span>
                  <span>
                    <div className="cgm-vis-name">Private</div>
                    <div className="cgm-vis-desc">Invite-only. Hidden from discovery.</div>
                    {!isSuperadmin && <div className="cgm-vis-warn">Superadmin only</div>}
                  </span>
                </button>
              </div>
            </div>

            {/* Color */}
            <div className="cgm-field">
              <span className="cgm-label"><span>Accent color</span></span>
              <div className="cgm-colors">
                {GROUP_COLORS.map((c) => {
                  const active = form.color === c.hex;
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      className={`cgm-color ${active ? 'is-active' : ''}`}
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

            {/* Emoji */}
            <div className="cgm-field">
              <label className="cgm-label" htmlFor="cgm-emoji">
                <span>Icon emoji</span>
                <span className="cgm-label-hint">optional · max {GROUP_ICON_EMOJI_MAX}</span>
              </label>
              <div className="cgm-emoji-row">
                <input
                  id="cgm-emoji"
                  className="cgm-input"
                  type="text"
                  value={form.iconEmoji}
                  maxLength={GROUP_ICON_EMOJI_MAX}
                  placeholder="e.g. 📈 or 🎯"
                  disabled={saving}
                  onChange={(e) => set('iconEmoji', e.target.value)}
                />
                <span className="cgm-emoji-preview">
                  {form.iconEmoji.trim() || '·'}
                </span>
              </div>
            </div>
          </div>

          <div className="cgm-foot">
            <button
              type="button"
              className="cgm-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cgm-btn cgm-btn-primary"
              disabled={!canSubmit}
            >
              {saving ? 'Creating…' : 'Create group'}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}