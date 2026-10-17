// apps/web/src/features/personal/chats/components/AddFriendModal.jsx
//
// PHASE 5 — self-contained scoped CSS. Same functionality as before:
// send a friend request by email, show success or error inline, close on
// success. Visual polish: consistent eyebrow/label typography, tighter
// field spacing, entrance animation on the modal.

import { useEffect, useState } from 'react';
import { X, UserRoundPlus, Mail } from 'lucide-react';
import { toast } from 'sonner';

import Portal from '@/shared/components/Portal';
import { useSendFriendRequest } from '@/shared/api/friends';
import { useFocusTrap } from '../hooks/useFocusTrap';

const CSS = `
  .afm2-overlay {
    position: fixed; inset: 0; z-index: 2000;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    animation: afm2Fade .18s ease;
  }
  .afm2-modal {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    width: 100%; max-width: 480px; max-height: 88vh;
    display: flex; flex-direction: column;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95), 0 0 0 1px var(--accent-soft);
    color: var(--ink-1);
    overflow: hidden; position: relative;
    animation: afm2Pop .28s cubic-bezier(.2,.8,.25,1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .afm2-modal::before {
    content: ''; position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: afm2Grad 4s linear infinite;
    pointer-events: none;
  }
  .afm2-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex; align-items: center; gap: 12px;
    flex-shrink: 0;
  }
  .afm2-head-icon {
    width: 40px; height: 40px; border-radius: 12px;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border: 1px solid var(--accent-soft2);
    color: var(--accent); flex-shrink: 0;
  }
  .afm2-head-meta { flex: 1; min-width: 0; }
  .afm2-title { margin: 0; font-size: 15px; font-weight: 700; letter-spacing: -.01em; }
  .afm2-sub {
    margin: 3px 0 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: var(--ink-3); letter-spacing: .02em;
  }
  .afm2-close {
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; padding: 0;
    border-radius: 8px; border: none; background: transparent;
    color: var(--ink-2); cursor: pointer;
    transition: all .2s; flex-shrink: 0;
  }
  .afm2-close:hover:not(:disabled) {
    color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent);
  }
  .afm2-close:disabled { opacity: .35; cursor: not-allowed; }

  .afm2-body {
    padding: 20px 22px;
    display: flex; flex-direction: column; gap: 14px;
    overflow-y: auto; flex: 1 1 auto; min-height: 0;
  }
  .afm2-field { display: flex; flex-direction: column; gap: 6px; }
  .afm2-label {
    display: flex; align-items: center; justify-content: space-between;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--ink-3);
  }
  .afm2-label-hint {
    font-weight: 500; letter-spacing: .02em; text-transform: none;
    color: var(--ink-3); opacity: .75;
  }
  .afm2-input, .afm2-textarea {
    width: 100%; padding: 10px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: var(--ink-1);
    font-size: 13px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    outline: none; box-sizing: border-box;
    transition: border-color .18s, box-shadow .2s;
  }
  .afm2-textarea {
    min-height: 68px; resize: vertical;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    line-height: 1.55;
  }
  .afm2-input::placeholder,
  .afm2-textarea::placeholder { color: var(--ink-3); }
  .afm2-input:focus,
  .afm2-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }
  .afm2-input:disabled,
  .afm2-textarea:disabled { opacity: .55; cursor: not-allowed; }

  .afm2-error {
    padding: 10px 12px; border-radius: 10px;
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.28);
    color: #fca5a5;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; line-height: 1.55;
  }
  .afm2-success {
    padding: 10px 12px; border-radius: 10px;
    background: rgba(34,197,94,.08);
    border: 1px solid rgba(34,197,94,.28);
    color: #86efac;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; line-height: 1.55;
  }

  .afm2-foot {
    padding: 14px 22px;
    border-top: 1px solid var(--line-soft);
    display: flex; justify-content: flex-end; gap: 10px;
    background: rgba(0,0,0,.15); flex-shrink: 0;
  }
  .afm2-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer; transition: all .2s; white-space: nowrap;
  }
  .afm2-btn:hover:not(:disabled) {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .afm2-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
  .afm2-btn-primary {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117; border: none; font-weight: 700;
    box-shadow: 0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent), inset 0 1px 0 rgba(255,255,255,.4);
  }
  .afm2-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px color-mix(in srgb, var(--accent) 70%, transparent), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .afm2-btn-primary:disabled {
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 32%, transparent), color-mix(in srgb, var(--accent-2) 28%, transparent));
    color: rgba(13,17,23,.55); box-shadow: none;
  }

  @keyframes afm2Fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes afm2Pop {
    from { opacity: 0; transform: translateY(-10px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes afm2Grad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .afm2-modal, .afm2-modal::before { animation: none !important; }
    .afm2-btn, .afm2-btn-primary, .afm2-close { transition: none !important; }
  }
`;

export default function AddFriendModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const trapRef = useFocusTrap({ active: isOpen, onEscape: onClose });
  const sendMutation = useSendFriendRequest();
  const saving = sendMutation.isPending;

  useEffect(() => {
    if (!isOpen) return;
    setEmail('');
    setMessage('');
    setError('');
    setSent(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmedEmail = email.trim().toLowerCase();
  const canSubmit = trimmedEmail.length > 3 && !saving && !sent;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;
    setError('');

    try {
      await sendMutation.mutateAsync({
        email: trimmedEmail,
        message: message.trim() || undefined,
      });
      setSent(true);
      toast.success(`Friend request sent to ${trimmedEmail}`);
      setTimeout(() => {
        onClose?.();
      }, 1400);
    } catch (err) {
      setError(err?.message || 'Could not send friend request');
    }
  };

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="afm2-overlay"
        onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
      >
        <form className="afm2-modal" onSubmit={handleSubmit} role="dialog" aria-modal="true" ref={trapRef}>
          <div className="afm2-head">
            <div className="afm2-head-icon">
              <UserRoundPlus size={18} />
            </div>
            <div className="afm2-head-meta">
              <h2 className="afm2-title">Add a friend</h2>
              <p className="afm2-sub">Send a request by email address</p>
            </div>
            <button
              type="button"
              className="afm2-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="afm2-body">
            {error && <div className="afm2-error">{error}</div>}
            {sent && (
              <div className="afm2-success">
                Request sent. They'll get a notification to accept or decline.
              </div>
            )}

            <div className="afm2-field">
              <label className="afm2-label" htmlFor="afm2-email">
                <span>Email address</span>
              </label>
              <input
                id="afm2-email"
                className="afm2-input"
                type="email"
                value={email}
                maxLength={320}
                placeholder="name@example.com"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                disabled={saving || sent}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
              />
            </div>

            <div className="afm2-field">
              <label className="afm2-label" htmlFor="afm2-message">
                <span>Note</span>
                <span className="afm2-label-hint">optional · max 500</span>
              </label>
              <textarea
                id="afm2-message"
                className="afm2-textarea"
                value={message}
                maxLength={500}
                placeholder="Say who you are, or why you're reaching out…"
                disabled={saving || sent}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>

          <div className="afm2-foot">
            <button
              type="button"
              className="afm2-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="afm2-btn afm2-btn-primary"
              disabled={!canSubmit}
            >
              <Mail size={12} />
              {saving ? 'Sending…' : sent ? 'Sent' : 'Send request'}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}