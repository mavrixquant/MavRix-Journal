// apps/web/src/features/personal/chats/components/UserProfileSidebar.jsx
//
// Right-hand rail inside a DM thread. Shows the peer's profile plus
// friendship state and quick actions.
//
// Data:
//   peer           — from the conversation payload (id/email/name/photo)
//   useFriendStatus(peer.id)  — live friendship state (fresh, not from
//                               the possibly-stale conversation payload)
//   conversation   — for mute / pin / archive flags
//
// Actions:
//   Message         — already in the thread; no-op (badge only)
//   Add friend      — when not friends and no pending request
//   Cancel request  — when we have an outbound pending request
//   Accept request  — when they have an inbound pending request to us
//   Remove friend   — when friends
//   Mute            — toggles ConversationParticipant.isMuted
//   Pin             — toggles ConversationParticipant.isPinned
//   Archive         — toggles ConversationParticipant.isArchived
//   Block           — opens BlockConfirmModal

import { useState } from 'react';
import {
  Mail,
  UserRoundPlus,
  UserMinus,
  ShieldOff,
  BellOff,
  Bell,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useFriendStatus,
  useSendFriendRequest,
  useRemoveFriend,
  useAcceptFriendRequest,
  useCancelFriendRequest,
} from '@/shared/api/friends';
import { useUpdateConversation } from '@/shared/api/chat';
import Alert from '@/shared/components/Alert';
import BlockConfirmModal from './BlockConfirmModal';

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

function ActionRow({ icon: Icon, label, onClick, disabled, variant }) {
  const cls = [
    'user-profile-action',
    variant === 'danger' ? 'is-danger' : '',
    variant === 'accent' ? 'is-accent' : '',
  ].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

export default function UserProfileSidebar({
  peer,
  conversation,
  onClose,
}) {
  const peerId = peer?.id;
  const { data: status, isLoading: statusLoading } = useFriendStatus(peerId);

  const sendRequest   = useSendFriendRequest();
  const removeFriend  = useRemoveFriend();
  const acceptRequest = useAcceptFriendRequest();
  const cancelRequest = useCancelFriendRequest();
  const updateConvo   = useUpdateConversation();

  const [pendingRemoveFriend, setPendingRemoveFriend] = useState(false);
  const [pendingBlock, setPendingBlock] = useState(false);

  const isFriend         = !!status?.isFriend;
  const hasOutgoing      = !!status?.hasOutgoingRequest;
  const hasIncoming      = !!status?.hasIncomingRequest;

  const busy =
    statusLoading ||
    sendRequest.isPending ||
    removeFriend.isPending ||
    acceptRequest.isPending ||
    cancelRequest.isPending ||
    updateConvo.isPending;

  const handleAddFriend = async () => {
    try {
      await sendRequest.mutateAsync({ toUserId: peerId });
      toast.success(`Friend request sent to ${displayNameOf(peer)}`);
    } catch (err) {
      toast.error(err?.message || 'Could not send request');
    }
  };

  const handleRemoveFriendConfirm = async () => {
    setPendingRemoveFriend(false);
    try {
      await removeFriend.mutateAsync(peerId);
      toast.success(`Removed ${displayNameOf(peer)} from friends`);
    } catch (err) {
      toast.error(err?.message || 'Could not remove friend');
    }
  };

  const handleToggleMute = () => {
    updateConvo.mutate({
      conversationId: conversation.id,
      patch: { isMuted: !conversation.isMuted },
    });
  };

  const handleTogglePin = () => {
    updateConvo.mutate({
      conversationId: conversation.id,
      patch: { isPinned: !conversation.isPinned },
    });
  };

  const handleToggleArchive = () => {
    updateConvo.mutate({
      conversationId: conversation.id,
      patch: { isArchived: !conversation.isArchived },
    });
  };

  /* Reconstruct the incoming-request id from the status snapshot? No —
     status doesn't carry the request id. Accept is therefore done via the
     Requests tab; we just deep-link there. */

  if (!peer) return null;

  return (
    <aside className="user-profile" aria-label="User profile">
      <button
        type="button"
        className="user-profile-close"
        onClick={onClose}
        aria-label="Close profile"
      >
        <X size={14} />
      </button>

      <div className="user-profile-head">
        <span className="user-profile-avatar">
          {peer.photoUrl ? (
            <img src={peer.photoUrl} alt="" />
          ) : (
            initialsOf(peer)
          )}
        </span>
        <div className="user-profile-name">{displayNameOf(peer)}</div>
        <div className="user-profile-email">
          <Mail size={11} />
          <span>{peer.email}</span>
        </div>

        <div className={`user-profile-badge ${isFriend ? 'is-friend' : ''}`}>
          {statusLoading && <Loader2 size={10} style={{ animation: 'upsSpin .8s linear infinite' }} />}
          {!statusLoading && isFriend && <><Check size={10} /> Friends</>}
          {!statusLoading && !isFriend && hasOutgoing && 'Request sent'}
          {!statusLoading && !isFriend && hasIncoming && 'Wants to be friends'}
          {!statusLoading && !isFriend && !hasOutgoing && !hasIncoming && 'Not friends'}
        </div>
      </div>

      <div className="user-profile-section">
        <span className="user-profile-section-label">Friendship</span>
        <div className="user-profile-actions">
          {isFriend && (
            <ActionRow
              icon={UserMinus}
              label="Remove friend"
              variant="danger"
              disabled={busy}
              onClick={() => setPendingRemoveFriend(true)}
            />
          )}
          {!isFriend && !hasOutgoing && !hasIncoming && (
            <ActionRow
              icon={UserRoundPlus}
              label="Add friend"
              variant="accent"
              disabled={busy}
              onClick={handleAddFriend}
            />
          )}
          {!isFriend && hasOutgoing && (
            <ActionRow
              icon={X}
              label="Cancel request"
              disabled={busy}
              onClick={() => {
                // We don't have the request id here — cancel via the
                // Requests tab. Show a helpful toast instead.
                toast.info('Cancel from the Requests tab.');
              }}
            />
          )}
          {!isFriend && hasIncoming && (
            <ActionRow
              icon={Check}
              label="See their request"
              variant="accent"
              disabled={busy}
              onClick={() => toast.info('Open the Requests tab to accept.')}
            />
          )}
        </div>
      </div>

      <div className="user-profile-section">
        <span className="user-profile-section-label">Conversation</span>
        <div className="user-profile-actions">
          <ActionRow
            icon={conversation.isMuted ? Bell : BellOff}
            label={conversation.isMuted ? 'Unmute' : 'Mute'}
            disabled={busy}
            onClick={handleToggleMute}
          />
          <ActionRow
            icon={conversation.isPinned ? PinOff : Pin}
            label={conversation.isPinned ? 'Unpin' : 'Pin'}
            disabled={busy}
            onClick={handleTogglePin}
          />
          <ActionRow
            icon={conversation.isArchived ? ArchiveRestore : Archive}
            label={conversation.isArchived ? 'Unarchive' : 'Archive'}
            disabled={busy}
            onClick={handleToggleArchive}
          />
        </div>
      </div>

      <div className="user-profile-section user-profile-danger">
        <span className="user-profile-section-label">Danger</span>
        <div className="user-profile-actions">
          <ActionRow
            icon={ShieldOff}
            label="Block user"
            variant="danger"
            disabled={busy}
            onClick={() => setPendingBlock(true)}
          />
        </div>
      </div>

      <Alert
        isOpen={pendingRemoveFriend}
        type="confirm"
        title="Remove friend?"
        message={
          peer
            ? `Remove ${displayNameOf(peer)} from your friends? You can always send a new request later.`
            : ''
        }
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleRemoveFriendConfirm}
        onCancel={() => setPendingRemoveFriend(false)}
      />

      <BlockConfirmModal
        isOpen={pendingBlock}
        user={peer}
        onClose={() => setPendingBlock(false)}
      />

      <style>{`@keyframes upsSpin { to { transform: rotate(360deg); } }`}</style>
    </aside>
  );
}