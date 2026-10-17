// apps/web/src/features/personal/chats/components/BlockConfirmModal.jsx
//
// PHASE 5 — self-contained scoped CSS. Same behaviour as before:
// destructive confirmation for blocking a user, with an optional private
// reason and a red warning banner. Refresh of dependencies happens via
// the useBlockUser mutation in shared/api/friends.js.

import { useEffect, useState } from 'react';
import { X, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

import Portal from '@/shared/components/Portal';
import { useBlockUser } from '@/shared/api/friends';

const CSS = `
  .bcm2-overlay {
    position: fixed; inset: 0; z-index: 2000;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    animation: bcm2Fade .18s ease;
  }
  .bcm2-modal {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    width: 100%; max-width: 480px; max-height: 88vh;
    display: flex; flex-direction: column;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid rgba(239,68,68,.28);
    border-radius: 16px;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95), 0 0 0 1px rgba(239,68,68,.1);
    color: var(--ink-1);
    overflow: hidden; position: relative;
    animation: bcm2Pop .28s cubic-bezier(.2,.8,.25,1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .bcm2-modal::before {
    content: ''; position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, #ef4444, #fca5a5, #ef4444, transparent);
    background-size: 200% 100%;
    animation: bcm2Grad 4s linear infinite;
    pointer-events: none;
  }
  .bcm2-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex; align-items: center; gap: 12px;
    flex-shrink: 0;
  }
  .bcm2-head-icon {
    width: 40px; height: 40px; border-radius: 12px;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(239,68,68,.1);
    border: 1px solid rgba(239,68,68,.32);
    color: #f87171; flex-shrink: 0;
  }
  .bcm2-head-meta { flex: 1; min-width: 0; }
  .bcm2-title { margin: 0; font-size: 15px; font-weight: 700; letter-spacing: -.01em; color: #FFFFFF; }
  .bcm2-sub {
    margin: 3px 0 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: var(--ink-2);
    letter-spacing: .02em; line-height: 1.5;
  }
  .bcm2-close {
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; padding: 0;
    border-radius: 8px; border: none; background: transparent;
    color: var(--ink-2); cursor: pointer;
    transition: all .2s; flex-shrink: 0;
  }
  .bcm2-close:hover:not(:disabled) { color: #f87171; background: rgba(239,68,68,.08); }
  .bcm2-close:disabled { opacity: .35; cursor: not-allowed; }

  .bcm2-body {
    padding: 20px 22px;
    display: flex; flex-direction: column; gap: 14px;
    overflow-y: auto; flex: 1 1 auto; min-height: 0;
  }
  .bcm2-field { display: flex; flex-direction: column; gap: 6px; }
  .bcm2-label {
    display: flex; align-items: center; justify-content: space-between;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--ink-3);
  }
  .bcm2-label-hint {
    font-weight: 500; letter-spacing: .02em; text-transform: none;
    color: var(--ink-3); opacity: .75;
  }
  .bcm2-textarea {
    width: 100%; padding: 10px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: var(--ink-1);
    font-size: 13px;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    line-height: 1.55; min-height: 68px; resize: vertical;
    outline: none; box-sizing: border-box;
    transition: border-color .18s, box-shadow .2s;
  }
  .bcm2-textarea::placeholder { color: var(--ink-3); }
  .bcm2-textarea:focus { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,.15); }
  .bcm2-textarea:disabled { opacity: .55; cursor: not-allowed; }

  .bcm2-warn {
    padding: 12px 14px; border-radius: 10px;
    background: rgba(239,68,68,.06);
    border: 1px solid rgba(239,68,68,.22);
    color: #fca5a5;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; line-height: 1.6;
  }
  .bcm2-error {
    padding: 10px 12px; border-radius: 10px;
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.28);
    color: #fca5a5;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; line-height: 1.55;
  }
  .bcm2-foot {
    padding: 14px 22px;
    border-top: 1px solid var(--line-soft);
    display: flex; justify-content: flex-end; gap: 10px;
    background: rgba(0,0,0,.15); flex-shrink: 0;
  }
  .bcm2-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer; transition: all .2s; white-space: nowrap;
  }
  .bcm2-btn:hover:not(:disabled) {
    color: var(--ink-1); background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .bcm2-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
  .bcm2-btn-danger {
    background: linear-gradient(135deg, #ef4444, #fca5a5);
    color: #1A0606; border: none; font-weight: 700;
    box-shadow: 0 10px 30px -8px rgba(239,68,68,.55), inset 0 1px 0 rgba(255,255,255,.3);
  }
  .bcm2-btn-danger:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px rgba(239,68,68,.7), inset 0 1px 0 rgba(255,255,255,.4);
  }
  .bcm2-btn-danger:disabled {
    background: rgba(239,68,68,.28);
    color: rgba(26,6,6,.6); box-shadow: none;
  }

  @keyframes bcm2Fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes bcm2Pop {
    from { opacity: 0; transform: translateY(-10px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes bcm2Grad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .bcm2-modal, .bcm2-modal::before { animation: none !important; }
    .bcm2-btn, .bcm2-btn-danger, .bcm2-close { transition: none !important; }
  }
`;

function displayNameOf(u) {
  if (!u) return 'this user';
  const a = (u.firstName || '').trim();
  const b = (u.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return u.email || 'this user';
}

export default function BlockConfirmModal({ isOpen, user, onClose, onBlocked }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const blockMutation = useBlockUser();
  const saving = blockMutation.isPending;

  useEffect(() => {
    if (!isOpen) return;
    setReason('');
    setError('');
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  const handleConfirm = async () => {
    setError('');
    try {
      await blockMutation.mutateAsync({
        userId: user.id,
        reason: reason.trim() || undefined,
      });
      toast.success(`Blocked ${displayNameOf(user)}`);
      onClose?.();
      if (onBlocked) onBlocked(user);
    } catch (err) {
      setError(err?.message || 'Could not block user');
    }
  };

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="bcm2-overlay"
        onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
      >
        <div className="bcm2-modal" role="alertdialog" aria-modal="true">
          <div className="bcm2-head">
            <div className="bcm2-head-icon">
              <ShieldOff size={18} />
            </div>
            <div className="bcm2-head-meta">
              <h2 className="bcm2-title">Block {displayNameOf(user)}?</h2>
              <p className="bcm2-sub">
                They won't be able to message you, send friend requests, or
                appear in your search.
              </p>
            </div>
            <button
              type="button"
              className="bcm2-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="bcm2-body">
            {error && <div className="bcm2-error">{error}</div>}

            <div className="bcm2-field">
              <label className="bcm2-label" htmlFor="bcm2-reason">
                <span>Reason</span>
                <span className="bcm2-label-hint">optional · private</span>
              </label>
              <textarea
                id="bcm2-reason"
                className="bcm2-textarea"
                value={reason}
                maxLength={500}
                placeholder="Only you will see this — the other user is never told why."
                disabled={saving}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="bcm2-warn">
              This also removes your friendship and cancels any pending
              requests. Unblocking later does not restore them — you'll need
              to re-send a friend request.
            </div>
          </div>

          <div className="bcm2-foot">
            <button
              type="button"
              className="bcm2-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bcm2-btn bcm2-btn-danger"
              onClick={handleConfirm}
              disabled={saving}
            >
              <ShieldOff size={12} />
              {saving ? 'Blocking…' : 'Block user'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}