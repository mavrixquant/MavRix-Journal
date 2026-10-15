// apps/web/src/features/personal/chats/components/BlockedUsersModal.jsx
//
// List the users I've blocked. Unblock removes the UserBlock row only —
// the friendship does NOT come back automatically.

import { useState } from 'react';
import { X, ShieldOff, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import Portal from '@/shared/components/Portal';
import { useBlocks, useUnblockUser } from '@/shared/api/friends';
import Alert from '@/shared/components/Alert';

function initialsOf(u) {
  if (!u) return '?';
  const a = (u.firstName || '').trim();
  const b = (u.lastName || '').trim();
  if (a && b) return (a[0] + b[0]).toUpperCase();
  if (a) return a.slice(0, 2).toUpperCase();
  if (u.email) return u.email.slice(0, 2).toUpperCase();
  return '?';
}

function displayNameOf(u) {
  if (!u) return 'Unknown';
  const a = (u.firstName || '').trim();
  const b = (u.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return u.email || 'Unknown';
}

function relativeTime(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function BlockedUsersModal({ isOpen, onClose }) {
  const { data: blocks = [], isLoading } = useBlocks();
  const unblockMutation = useUnblockUser();
  const [pendingUnblock, setPendingUnblock] = useState(null);

  if (!isOpen) return null;

  const handleUnblockConfirm = async () => {
    const entry = pendingUnblock;
    if (!entry) return;
    setPendingUnblock(null);
    try {
      await unblockMutation.mutateAsync(entry.user.id);
      toast.success(`Unblocked ${displayNameOf(entry.user)}`);
    } catch (err) {
      toast.error(err?.message || 'Could not unblock user');
    }
  };

  return (
    <>
      <Portal>
        <div
          className="chat-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="bum-modal" role="dialog" aria-modal="true">
            <div className="bum-head">
              <div className="bum-head-icon">
                <ShieldOff size={18} />
              </div>
              <div className="bum-head-meta">
                <h2 className="bum-title">Blocked users</h2>
                <p className="bum-sub">
                  {blocks.length === 0
                    ? 'You have not blocked anyone'
                    : `${blocks.length} user${blocks.length === 1 ? '' : 's'} blocked`}
                </p>
              </div>
              <button
                type="button"
                className="bum-close"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <div className="bum-body">
              {isLoading && (
                <div className="bum-empty">
                  <Loader2
                    size={18}
                    style={{ animation: 'bumSpin .8s linear infinite' }}
                  />
                  <style>{`@keyframes bumSpin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {!isLoading && blocks.length === 0 && (
                <div className="bum-empty">
                  <ShieldCheck size={26} style={{ opacity: .45 }} />
                  <strong>Nobody's blocked</strong>
                  <span>
                    When you block someone, they'll appear here. You can
                    unblock them at any time.
                  </span>
                </div>
              )}

              {!isLoading &&
                blocks.map((b) => (
                  <div key={b.id} className="bum-row">
                    <span className="bum-avatar">
                      {b.user?.photoUrl ? (
                        <img src={b.user.photoUrl} alt="" />
                      ) : (
                        initialsOf(b.user)
                      )}
                    </span>
                    <div className="bum-row-body">
                      <div className="bum-row-name">{displayNameOf(b.user)}</div>
                      <div className="bum-row-sub">
                        {b.user?.email} · blocked {relativeTime(b.createdAt)}
                      </div>
                      {b.reason && (
                        <div className="bum-row-reason">"{b.reason}"</div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="bum-unblock-btn"
                      onClick={() => setPendingUnblock(b)}
                      disabled={unblockMutation.isPending}
                      title="Unblock"
                      aria-label={`Unblock ${displayNameOf(b.user)}`}
                    >
                      Unblock
                    </button>
                  </div>
                ))}
            </div>

            <div className="bum-foot">
              <button
                type="button"
                className="bum-btn"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Portal>

      <Alert
        isOpen={!!pendingUnblock}
        type="confirm"
        title="Unblock this user?"
        message={
          pendingUnblock
            ? `Unblock ${displayNameOf(pendingUnblock.user)}? You will need to send a new friend request to be friends again.`
            : ''
        }
        confirmText="Unblock"
        cancelText="Cancel"
        onConfirm={handleUnblockConfirm}
        onCancel={() => setPendingUnblock(null)}
      />
    </>
  );
}