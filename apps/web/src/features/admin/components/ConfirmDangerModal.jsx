// apps/web/src/features/admin/components/ConfirmDangerModal.jsx
//
// Reusable two-step confirmation. The user must type `confirmPhrase` (usually
// the target's email or "DELETE") before the confirm button enables. Used for
// destructive ops: delete user, delete account, wipe cache.

import { useState, useEffect } from 'react';
import Portal from '@/shared/components/Portal';

export default function ConfirmDangerModal({
  isOpen,
  title,
  description,
  confirmPhrase = 'DELETE',
  confirmLabel = 'Delete',
  confirmVariant = 'danger', // 'danger' | 'amber'
  onConfirm,
  onCancel,
  busy = false,
}) {
  const [typed, setTyped] = useState('');

  useEffect(() => { if (!isOpen) setTyped(''); }, [isOpen]);

  if (!isOpen) return null;

  const canConfirm = typed.trim() === confirmPhrase && !busy;

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="cdm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy) onCancel?.();
        }}
      >
        <div className={`cdm-modal is-${confirmVariant}`} role="alertdialog" aria-modal="true">
          <div className="cdm-body">
            <h3 className="cdm-title">{title}</h3>
            {description && <p className="cdm-desc">{description}</p>}

            <label className="cdm-label">
              Type <code>{confirmPhrase}</code> to confirm
            </label>
            <input
              className="cdm-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmPhrase}
              autoFocus
              disabled={busy}
            />
          </div>

          <div className="cdm-foot">
            <button
              type="button"
              className="cdm-btn cdm-cancel"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cdm-btn cdm-confirm"
              onClick={onConfirm}
              disabled={!canConfirm}
            >
              {busy ? 'Working…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

const CSS = `
  .cdm-overlay {
    position: fixed; inset: 0;
    background: rgba(4,6,9,.78);
    backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    z-index: 3000; padding: 16px;
    animation: cdmFade .16s ease;
  }
  .cdm-modal {
    width: 100%; max-width: 460px;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 16px;
    color: #E7E9EE;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    overflow: hidden;
    position: relative;
    animation: cdmIn .24s cubic-bezier(.2,.8,.25,1);
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95);
  }
  .cdm-modal::before {
    content: '';
    position: absolute; left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--cdm-accent), var(--cdm-accent-2), var(--cdm-accent), transparent);
    background-size: 200% 100%;
    animation: cdmGrad 4s linear infinite;
  }
  .cdm-modal.is-danger { --cdm-accent: #ef4444; --cdm-accent-2: #fca5a5; }
  .cdm-modal.is-amber  { --cdm-accent: #F59E0B; --cdm-accent-2: #FDE68A; }

  .cdm-body { padding: 24px 24px 12px; }
  .cdm-title {
    margin: 0 0 8px;
    font-size: 17px; font-weight: 700;
    letter-spacing: -.01em; color: #FFFFFF;
  }
  .cdm-desc {
    margin: 0 0 18px;
    font-size: 13px; line-height: 1.6;
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .005em;
  }
  .cdm-label {
    display: block; margin-bottom: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase;
    color: #545E6E;
  }
  .cdm-label code {
    color: var(--cdm-accent);
    padding: 1px 6px; margin-left: 4px;
    background: rgba(255,255,255,.04);
    border-radius: 4px;
    font-size: 10.5px;
    letter-spacing: 0;
    text-transform: none;
  }
  .cdm-input {
    width: 100%; padding: 10px 12px;
    background: rgba(10,13,19,.7);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    transition: all .18s;
  }
  .cdm-input:focus {
    border-color: var(--cdm-accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--cdm-accent) 20%, transparent);
  }
  .cdm-foot {
    display: flex; justify-content: flex-end; gap: 10px;
    padding: 16px 24px;
    border-top: 1px solid rgba(255,255,255,.05);
    background: rgba(0,0,0,.15);
  }
  .cdm-btn {
    padding: 9px 18px;
    border-radius: 10px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 700;
    letter-spacing: .02em;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all .18s;
    white-space: nowrap;
  }
  .cdm-cancel {
    background: rgba(255,255,255,.03);
    border-color: rgba(255,255,255,.1);
    color: #8892A3;
  }
  .cdm-cancel:hover:not(:disabled) {
    color: #E7E9EE;
    background: rgba(255,255,255,.06);
  }
  .cdm-confirm {
    background: linear-gradient(135deg, var(--cdm-accent), var(--cdm-accent-2));
    color: #0D1117;
    box-shadow: 0 10px 30px -8px color-mix(in srgb, var(--cdm-accent) 55%, transparent);
  }
  .cdm-confirm:hover:not(:disabled) { transform: translateY(-1px); }
  .cdm-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }

  @keyframes cdmFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cdmIn {
    from { opacity: 0; transform: translateY(-10px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes cdmGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
`;