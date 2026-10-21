
import { useState } from 'react';
import {
  Mail,
  MessageCircle,
  UserRoundPlus,
  UserMinus,
  ShieldOff,
  Check,
  X,
  Crown,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';
import {
  useFriendStatus,
  useSendFriendRequest,
  useRemoveFriend,
} from '@/shared/api/friends';
import { useCreateConversation } from '@/shared/api/chat';
import Alert from '@/shared/components/Alert';
import BlockConfirmModal from './BlockConfirmModal';

const ROLE_LABELS = {
  owner: { label: 'Owner', icon: Crown },
  moderator: { label: 'Moderator', icon: ShieldCheck },
  member: null,
};

function initialsOf(u) {
  if (!u) return '?';
  const a = (u.firstName || '').trim();
  const b = (u.lastName || '').trim();
  if (a && b) return (a[0] + b[0]).toUpperCase();
  if (a) return a.slice(0, 2).toUpperCase();
  if (u.username) return u.username.slice(0, 2).toUpperCase();
  if (u.email) return u.email.slice(0, 2).toUpperCase();
  return '?';
}

function displayNameOf(u) {
  if (!u) return 'Unknown';
  const a = (u.firstName || '').trim();
  const b = (u.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return u.username || 'Unknown';
}

export default function MemberProfilePopover({
  member,
  currentUserId,
  onOpenThread,
  children,
}) {
  const [open, setOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(false);
  const [pendingBlock, setPendingBlock] = useState(false);

  const peer = member?.user;
  const peerId = peer?.id;
  const isSelf = peerId === currentUserId;

  const { data: status, isLoading: statusLoading } = useFriendStatus(peerId, {
    enabled: open && !!peerId && !isSelf,
  });

  const sendRequest = useSendFriendRequest();
  const removeFriend = useRemoveFriend();
  const createConversation = useCreateConversation();

  const isFriend    = !!status?.isFriend;
  const hasOutgoing = !!status?.hasOutgoingRequest;
  const hasIncoming = !!status?.hasIncomingRequest;

  const busy =
    sendRequest.isPending ||
    removeFriend.isPending ||
    createConversation.isPending;

  const handleMessage = async () => {
    if (!peerId) return;
    try {
      const conv = await createConversation.mutateAsync(peerId);
      setOpen(false);
      if (onOpenThread) onOpenThread(conv.id);
    } catch (err) {
      toast.error(err?.message || 'Could not open conversation');
    }
  };

  const handleAddFriend = async () => {
    try {
      await sendRequest.mutateAsync({ toUserId: peerId });
      toast.success(`Friend request sent to ${displayNameOf(peer)}`);
    } catch (err) {
      toast.error(err?.message || 'Could not send request');
    }
  };

  const handleRemoveConfirm = async () => {
    setPendingRemove(false);
    try {
      await removeFriend.mutateAsync(peerId);
      toast.success(`Removed ${displayNameOf(peer)} from friends`);
    } catch (err) {
      toast.error(err?.message || 'Could not remove friend');
    }
  };

  const handleBlockClick = () => {
    setOpen(false);
    setPendingBlock(true);
  };

  if (!member || !peer) return null;

  const roleMeta = ROLE_LABELS[member.role] || null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="mpp-content"
          onClick={(e) => e.stopPropagation()}
        >
          {}
          <div className="mpp-head">
            <span className="mpp-avatar">
              {peer.photoUrl ? (
                <img src={peer.photoUrl} alt="" />
              ) : (
                initialsOf(peer)
              )}
            </span>
            <div className="mpp-headtext">
              <div className="mpp-name">{displayNameOf(peer)}</div>
              <div className="mpp-email">
                <Mail size={10} />
                <span>{peer.username ? '@' + peer.username : 'â€”'}</span>
              </div>
            </div>
            {roleMeta && (
              <span className={`mpp-role mpp-role-${member.role}`}>
                <roleMeta.icon size={9} />
                {roleMeta.label}
              </span>
            )}
          </div>

          {}
          {!isSelf && (
            <div className="mpp-status">
              {statusLoading && (
                <span className="mpp-badge">Checking…</span>
              )}
              {!statusLoading && isFriend && (
                <span className="mpp-badge is-friend">
                  <Check size={10} /> Friends
                </span>
              )}
              {!statusLoading && !isFriend && hasOutgoing && (
                <span className="mpp-badge">Request sent</span>
              )}
              {!statusLoading && !isFriend && hasIncoming && (
                <span className="mpp-badge is-incoming">
                  Wants to be friends
                </span>
              )}
              {!statusLoading && !isFriend && !hasOutgoing && !hasIncoming && (
                <span className="mpp-badge is-none">Not friends</span>
              )}
            </div>
          )}

          {isSelf && (
            <div className="mpp-status">
              <span className="mpp-badge is-self">This is you</span>
            </div>
          )}

          {}
          {!isSelf && (
            <div className="mpp-actions">
              <button
                type="button"
                className="mpp-action is-accent"
                onClick={handleMessage}
                disabled={busy}
              >
                <MessageCircle size={13} />
                <span>Message</span>
              </button>

              {isFriend && (
                <button
                  type="button"
                  className="mpp-action"
                  onClick={() => { setOpen(false); setPendingRemove(true); }}
                  disabled={busy}
                >
                  <UserMinus size={13} />
                  <span>Remove friend</span>
                </button>
              )}

              {!isFriend && !hasOutgoing && !hasIncoming && (
                <button
                  type="button"
                  className="mpp-action"
                  onClick={handleAddFriend}
                  disabled={busy}
                >
                  <UserRoundPlus size={13} />
                  <span>Add friend</span>
                </button>
              )}

              {!isFriend && hasOutgoing && (
                <button
                  type="button"
                  className="mpp-action"
                  onClick={() => toast.info('Cancel from the Requests tab.')}
                  disabled={busy}
                >
                  <X size={13} />
                  <span>Request pending</span>
                </button>
              )}

              {!isFriend && hasIncoming && (
                <button
                  type="button"
                  className="mpp-action is-accent"
                  onClick={() => toast.info('Open the Requests tab to accept.')}
                  disabled={busy}
                >
                  <Check size={13} />
                  <span>Accept in Requests</span>
                </button>
              )}

              <button
                type="button"
                className="mpp-action is-danger"
                onClick={handleBlockClick}
                disabled={busy}
              >
                <ShieldOff size={13} />
                <span>Block user</span>
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Alert
        isOpen={pendingRemove}
        type="confirm"
        title="Remove friend?"
        message={
          peer
            ? `Remove ${displayNameOf(peer)} from your friends? You can always send a new request later.`
            : ''
        }
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleRemoveConfirm}
        onCancel={() => setPendingRemove(false)}
      />

      <BlockConfirmModal
        isOpen={pendingBlock}
        user={peer}
        onClose={() => setPendingBlock(false)}
      />
    </>
  );
}