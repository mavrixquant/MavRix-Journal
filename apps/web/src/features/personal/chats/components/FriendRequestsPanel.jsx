// apps/web/src/features/personal/chats/components/FriendRequestsPanel.jsx
//
// Inbox + outbox for friend requests. Rendered as a sub-view of FriendsTab
// (see FriendsTab.jsx), or — until Phase 3 — reachable from the rail's
// legacy Requests tab.
//
// Two sections:
//   Incoming — Accept / Decline actions
//   Outgoing — Cancel action
//
// When rendered as a sub-view, `onBack` is provided and the header shows a
// back arrow. When rendered standalone (legacy rail path), `onBack` is
// undefined and the header only shows the Send-a-request action.
//
// PHASE 5 CHANGE (EmptyState migration)
// -------------------------------------
//   • The "No pending requests" state now uses the shared <EmptyState>
//     component (@/shared/components/EmptyState) with an Add friend CTA
//     when onOpenAddFriend is provided.

import { ArrowLeft, Check, X, UserRoundPlus, Inbox } from 'lucide-react';
import { toast } from 'sonner';

import {
  useFriendRequests,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useCancelFriendRequest,
} from '@/shared/api/friends';
import EmptyState from '@/shared/components/EmptyState';

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
  onBack,
  onOpenAddFriend,
}) {
  const { data, isLoading } = useFriendRequests();
  const acceptMutation = useAcceptFriendRequest();
  const declineMutation = useDeclineFriendRequest();
  const cancelMutation = useCancelFriendRequest();

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
    <div className="side-pane">
      <div className="side-pane-header">
        {onBack && (
          <button
            type="button"
            className="pane-icon-btn"
            onClick={onBack}
            title="Back to friends"
            aria-label="Back to friends"
            style={{ marginRight: 4 }}
          >
            <ArrowLeft size={14} />
          </button>
        )}

        <span className="side-pane-title">Friend Requests</span>
        <span className="side-pane-count">{totalCount}</span>

        <div className="side-pane-actions">
          {onOpenAddFriend && (
            <button
              type="button"
              className="pane-icon-btn is-accent"
              onClick={onOpenAddFriend}
              title="Send a new request"
              aria-label="Send a new request"
            >
              <UserRoundPlus size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="side-pane-body">
        {isLoading && <div className="side-pane-loading">Loading requests…</div>}

        {!isLoading && incoming.length === 0 && outgoing.length === 0 && (
          <div style={{ padding: '24px 12px' }}>
            <EmptyState
              size="md"
              variant="bare"
              icon={Inbox}
              eyebrow="Inbox"
              title="No pending requests"
              description="When someone sends you a request, or you send one, it'll appear here."
              actions={
                onOpenAddFriend
                  ? [
                      {
                        label: 'Send a request',
                        icon: UserRoundPlus,
                        variant: 'primary',
                        onClick: onOpenAddFriend,
                      },
                    ]
                  : []
              }
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
                    {req.fromUser?.email} · {relativeTime(req.createdAt)}
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
    </div>
  );
}