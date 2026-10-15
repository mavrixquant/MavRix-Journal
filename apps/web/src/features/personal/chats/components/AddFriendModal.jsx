// apps/web/src/features/personal/chats/components/AddFriendModal.jsx
//
// Send a friend request by email. The API accepts either a userId or an
// email; email is what we expose in the UI (Discord-style).
//
// On success, shows an inline green confirmation for 1.5s then closes.
// On error (already friends / already pending / blocked / no such user),
// shows the server's error message inline.

import { useEffect, useState } from 'react';
import { X, UserRoundPlus, Mail } from 'lucide-react';
import { toast } from 'sonner';

import Portal from '@/shared/components/Portal';
import { useSendFriendRequest } from '@/shared/api/friends';

export default function AddFriendModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

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
      <div
        className="chat-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) onClose();
        }}
      >
        <form className="afm-modal" onSubmit={handleSubmit} role="dialog" aria-modal="true">
          <div className="afm-head">
            <div className="afm-head-icon">
              <UserRoundPlus size={18} />
            </div>
            <div className="afm-head-meta">
              <h2 className="afm-title">Add a friend</h2>
              <p className="afm-sub">Send a request by email address</p>
            </div>
            <button
              type="button"
              className="afm-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="afm-body">
            {error && <div className="afm-error">{error}</div>}
            {sent && (
              <div className="afm-success">
                Request sent. They'll get a notification to accept or decline.
              </div>
            )}

            <div className="afm-field">
              <label className="afm-label" htmlFor="afm-email">
                <span>Email address</span>
              </label>
              <input
                id="afm-email"
                className="afm-input"
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

            <div className="afm-field">
              <label className="afm-label" htmlFor="afm-message">
                <span>Note</span>
                <span className="afm-label-hint">optional · max 500</span>
              </label>
              <textarea
                id="afm-message"
                className="afm-textarea"
                value={message}
                maxLength={500}
                placeholder="Say who you are, or why you're reaching out…"
                disabled={saving || sent}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>

          <div className="afm-foot">
            <button
              type="button"
              className="afm-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="afm-btn afm-btn-primary"
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