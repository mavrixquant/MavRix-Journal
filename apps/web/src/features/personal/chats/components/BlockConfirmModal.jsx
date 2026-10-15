// apps/web/src/features/personal/chats/components/BlockConfirmModal.jsx
//
// Confirm blocking a user. Blocking tears down:
//   • the friendship (if any)
//   • any pending friend request in either direction
//   • visibility of DMs, group member rows, search results
//
// Unblock does NOT restore the friendship — the pair must re-request.

import { useEffect, useState } from 'react';
import { X, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

import Portal from '@/shared/components/Portal';
import { useBlockUser } from '@/shared/api/friends';

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
      <div
        className="chat-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) onClose();
        }}
      >
        <div className="bcm-modal" role="alertdialog" aria-modal="true">
          <div className="bcm-head">
            <div className="bcm-head-icon">
              <ShieldOff size={18} />
            </div>
            <div className="bcm-head-meta">
              <h2 className="bcm-title">Block {displayNameOf(user)}?</h2>
              <p className="bcm-sub">
                They won't be able to message you, send friend requests, or
                appear in your search.
              </p>
            </div>
            <button
              type="button"
              className="bcm-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="bcm-body">
            {error && <div className="bcm-error">{error}</div>}

            <div className="bcm-field">
              <label className="bcm-label" htmlFor="bcm-reason">
                <span>Reason</span>
                <span className="bcm-label-hint">optional · private</span>
              </label>
              <textarea
                id="bcm-reason"
                className="bcm-textarea"
                value={reason}
                maxLength={500}
                placeholder="Only you will see this — the other user is never told why."
                disabled={saving}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="bcm-warn">
              This also removes your friendship and cancels any pending
              requests. Unblocking later does not restore them — you'll need
              to re-send a friend request.
            </div>
          </div>

          <div className="bcm-foot">
            <button
              type="button"
              className="bcm-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bcm-btn bcm-btn-danger"
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