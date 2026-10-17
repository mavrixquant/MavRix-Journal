// apps/web/src/features/personal/chats/components/FriendRequestsPanel.jsx
//
// PHASE 6 — presented as a MODAL DIALOG (matching AddFriendModal's visual
// language) instead of the previous inline side-pane. Called from
// FriendsTab via <FriendRequestsPanel isOpen onClose onOpenAddFriend />.
//
// All request-accept / decline / cancel logic is unchanged from the
// previous version. Only the wrapper (Portal + overlay + modal chrome)
// is new.

import { X, Check, UserRoundPlus, Inbox } from 'lucide-react';
import { toast } from 'sonner';

import Portal from '@/shared/components/Portal';
import EmptyState from '@/shared/components/EmptyState';
import {
  useFriendRequests,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useCancelFriendRequest,
} from '@/shared/api/friends';
import { useFocusTrap } from '../hooks/useFocusTrap';

const CSS = `
  .frm2-overlay {
    position: fixed; inset: 0; z-index: 2000;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    animation: frm2Fade .18s ease;
  }
  .frm2-modal {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    width: 100%; max-width: 540px; max-height: 82vh;
    display: flex; flex-direction: column;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95), 0 0 0 1px var(--accent-soft);
    color: var(--ink-1); overflow: hidden; position: relative;
    animation: frm2Pop .28s cubic-bezier(.2,.8,.25,1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .frm2-modal::before {
    content: ''; position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: frm2Grad 4s linear infinite;
    pointer-events: none;
  }
  .frm2-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex; align-items: center; gap: 12px;
    flex-shrink: 0;
  }
  .frm2-head-icon {
    width: 40px; height: 40px; border-radius: 12px;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border: 1px solid var(--accent-soft2);
    color: var(--accent); flex-shrink: 0;
  }
  .frm2-head-meta { flex: 1; min-width: 0; }
  .frm2-title {
    margin: 0; font-size: 15px; font-weight: 700; letter-spacing: -.01em;
  }
  .frm2-sub {
    margin: 3px 0 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: var(--ink-3); letter-spacing: .02em;
  }
  .frm2-head-actions {
    display: inline-flex; gap: 6px; align-items: center; flex-shrink: 0;
  }
  .frm2-close {
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; padding: 0;
    border-radius: 8px; border: none; background: transparent;
    color: var(--ink-2); cursor: pointer;
    transition: all .2s; flex-shrink: 0;
  }
  .frm2-close:hover {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }
  .frm2-body {
    flex: 1 1 auto; min-height: 0;
    overflow-y: auto;
    padding: 8px;
  }
  .frm2-body::-webkit-scrollbar { width: 6px; }
  .frm2-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08); border-radius: 99px;
  }
  .frm2-foot {
    padding: 14px 22px;
    border-top: 1px solid var(--line-soft);
    display: flex; align-items: center; justify-content: space-between;
    gap: 10px;
    background: rgba(0,0,0,.15);
    flex-shrink: 0;
  }
  .frm2-count {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: var(--ink-3); letter-spacing: .02em;
  }
  .frm2-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03); color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer; transition: all .2s;
  }
  .frm2-btn:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  @keyframes frm2Fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes frm2Pop {
    from { opacity: 0; transform: translateY(-10px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes frm2Grad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .frm2-modal, .frm2-modal::before { animation: none !important; }
    .frm2-btn, .frm2-close { transition: none !important; }
  }
`;

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

export default function FriendRequestsPanel({
  isOpen = false,
  onClose,
  onOpenAddFriend,
}) {
  const trapRef = useFocusTrap({ active: isOpen, onEscape: onClose });

  const { data, isLoading } = useFriendRequests();
  const acceptMutation = useAcceptFriendRequest();
  const declineMutation = useDeclineFriendRequest();
  const cancelMutation = useCancelFriendRequest();

  if (!isOpen) return null;

  const incoming = data?.incoming || [];
  const outgoing = data?.outgoing || [];
  const totalCount = incoming.length + outgoing.length;

  const handleAccept = async (req) => {
    try {
      await acceptMutation.mutateAsync(req.id);
      toast.success(`You and ${displayNameOf(req.fromUser)} are now friends`);
    } catch (err) {
      toast.error(err?.message || 'Could not accept request');
    }
  };

  const handleDecline = async (req) => {
    try {
      await declineMutation.mutateAsync(req.id);
      toast.success('Request declined');
    } catch (err) {
      toast.error(err?.message || 'Could not decline request');
    }
  };

  const handleCancel = async (req) => {
    try {
      await cancelMutation.mutateAsync(req.id);
      toast.success('Request cancelled');
    } catch (err) {
      toast.error(err?.message || 'Could not cancel request');
    }
  };

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="frm2-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div
          className="frm2-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Friend requests"
          ref={trapRef}
        >
          {/* ---------- Header ---------- */}
          <div className="frm2-head">
            <div className="frm2-head-icon">
              <Inbox size={18} />
            </div>
            <div className="frm2-head-meta">
              <h2 className="frm2-title">Friend requests</h2>
              <p className="frm2-sub">
                {isLoading
                  ? 'Loading…'
                  : `${totalCount} pending · ${incoming.length} incoming · ${outgoing.length} sent`}
              </p>
            </div>
            <div className="frm2-head-actions">
              <button
                type="button"
                className="frm2-close"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ---------- Body ---------- */}
          <div className="frm2-body">
            {isLoading && (
              <div className="side-pane-loading">Loading requests…</div>
            )}

            {!isLoading && incoming.length === 0 && outgoing.length === 0 && (
              <div style={{ padding: '24px 12px' }}>
                <EmptyState
                  size="md"
                  variant="bare"
                  icon={Inbox}
                  eyebrow="Inbox"
                  title="No pending requests"
                  description="When someone sends you a request, or you send one, it will appear here."
                />
              </div>
            )}

            {incoming.length > 0 && (
              <>
                <div className="pane-section-label">
                  Incoming
                  <span className="pane-section-label-count">{incoming.length}</span>
                </div>
                {incoming.map((req) => (
                  <div key={req.id} className="pane-row">
                    <span className="pane-row-avatar">
                      {req.fromUser?.photoUrl ? (
                        <img src={req.fromUser.photoUrl} alt="" />
                      ) : (
                        initialsOf(req.fromUser)
                      )}
                    </span>
                    <div className="pane-row-body">
                      <div className="pane-row-name">{displayNameOf(req.fromUser)}</div>
                      <div className="pane-row-sub">
                        {req.fromUser?.email} · Sent {relativeTime(req.createdAt)}
                      </div>
                      {req.message && (
                        <div className="pane-row-message">"{req.message}"</div>
                      )}
                    </div>
                    <div className="pane-row-actions">
                      <button
                        type="button"
                        className="pane-icon-btn is-accent"
                        onClick={() => handleAccept(req)}
                        disabled={acceptMutation.isPending}
                        title="Accept"
                        aria-label="Accept"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="pane-icon-btn is-danger"
                        onClick={() => handleDecline(req)}
                        disabled={declineMutation.isPending}
                        title="Decline"
                        aria-label="Decline"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {incoming.length > 0 && outgoing.length > 0 && (
              <div className="pane-section-divider" aria-hidden />
            )}

            {outgoing.length > 0 && (
              <>
                <div className="pane-section-label">
                  Sent
                  <span className="pane-section-label-count">{outgoing.length}</span>
                </div>
                {outgoing.map((req) => (
                  <div key={req.id} className="pane-row">
                    <span className="pane-row-avatar">
                      {req.toUser?.photoUrl ? (
                        <img src={req.toUser.photoUrl} alt="" />
                      ) : (
                        initialsOf(req.toUser)
                      )}
                    </span>
                    <div className="pane-row-body">
                      <div className="pane-row-name">{displayNameOf(req.toUser)}</div>
                      <div className="pane-row-sub">
                        Sent {relativeTime(req.createdAt)} · awaiting response
                      </div>
                    </div>
                    <div className="pane-row-actions">
                      <button
                        type="button"
                        className="pane-icon-btn"
                        onClick={() => handleCancel(req)}
                        disabled={cancelMutation.isPending}
                        title="Cancel request"
                        aria-label="Cancel request"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* ---------- Footer ---------- */}
          <div className="frm2-foot">
            <span className="frm2-count">
              {incoming.length} incoming · {outgoing.length} sent
            </span>
            <button
              type="button"
              className="frm2-btn"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}