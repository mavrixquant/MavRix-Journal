import { useState } from 'react';
import {
  X, Mail, UserRoundPlus, UserMinus, ShieldOff, Bell, BellOff, Pin, PinOff,
  Archive, ArchiveRestore, Check, Loader2, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useFriendStatus, useSendFriendRequest, useRemoveFriend } from '@/shared/api/friends';
import { useUpdateConversation } from '@/shared/api/chat';
import Alert from '@/shared/components/Alert';
import BlockConfirmModal from './BlockConfirmModal';
import MaveAiAvatar from './MaveAiAvatar';

function initialsOf(u) {
  if (!u) return '?';
  const a = (u.firstName || '').trim(); const b = (u.lastName || '').trim();
  if (a && b) return (a[0] + b[0]).toUpperCase();
  if (a) return a.slice(0, 2).toUpperCase();
  if (u.email) return u.email.slice(0, 2).toUpperCase();
  return '?';
}

function displayNameOf(u) {
  if (!u) return 'Unknown';
  const a = (u.firstName || '').trim(); const b = (u.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return u.email || 'Unknown';
}

export default function DmProfilePanel({ peer, conversation, onClose }) {
  const peerId = peer?.id;
  const isAi = !!conversation?.isAi;

  const { data: status, isLoading: statusLoading } = useFriendStatus(peerId, { enabled: !isAi && !!peerId });
  const sendRequest = useSendFriendRequest();
  const removeFriend = useRemoveFriend();
  const updateConvo = useUpdateConversation();

  const [pendingRemoveFriend, setPendingRemoveFriend] = useState(false);
  const [pendingBlock, setPendingBlock] = useState(false);

  const isFriend = isAi ? true : !!status?.isFriend;
  const hasOutgoing = !!status?.hasOutgoingRequest;
  const hasIncoming = !!status?.hasIncomingRequest;

  const busy = statusLoading || sendRequest.isPending || removeFriend.isPending || updateConvo.isPending;

  const handleAddFriend = async () => {
    try { await sendRequest.mutateAsync({ toUserId: peerId }); toast.success(`Friend request sent to ${displayNameOf(peer)}`); }
    catch (err) { toast.error(err?.message || 'Could not send friend request'); }
  };

  const handleRemoveFriend = async () => {
    setPendingRemoveFriend(false);
    try { await removeFriend.mutateAsync(peerId); toast.success(`Removed ${displayNameOf(peer)} from friends`); }
    catch (err) { toast.error(err?.message || 'Could not remove friend'); }
  };

  const toggleFlag = (key) => {
    updateConvo.mutate({ conversationId: conversation.id, patch: { [key]: !conversation[key] } });
  };

  if (!peer) return null;

  return (
    <>
      <div className="chat-panel-inner">
        <div className="chat-panel-head">
          <span className="chat-panel-title">Profile</span>
          <button type="button" className="chat-panel-close" onClick={onClose} aria-label="Close panel"><X size={14} /></button>
        </div>

        <div className="chat-panel-body">
          <div className="panel-profile">
            <div className="panel-avatar">
              {isAi ? <MaveAiAvatar size={72} /> : (peer.photoUrl ? <img src={peer.photoUrl} alt="" /> : initialsOf(peer))}
            </div>
            <div className="panel-name">{displayNameOf(peer)}</div>
            <div className="panel-email">
              <Mail size={11} /> <span>{peer.email}</span>
            </div>

            <div className={`panel-status${isFriend ? ' is-friend' : ''}`}>
              {statusLoading && <Loader2 size={10} className="panel-spinner" />}
              {!statusLoading && isFriend && <><Check size={10} /> Friends</>}
              {!statusLoading && !isFriend && hasOutgoing && 'Request sent'}
              {!statusLoading && !isFriend && hasIncoming && 'Wants to be friends'}
              {!statusLoading && !isFriend && !hasOutgoing && !hasIncoming && 'Not friends'}
            </div>
          </div>

          {!isAi && (
            <div className="panel-section">
              <div className="panel-section-label">Friendship</div>
              <div className="panel-actions">
                {isFriend && (
                  <button type="button" className="panel-action is-danger" onClick={() => setPendingRemoveFriend(true)} disabled={busy}>
                    <UserMinus size={14} /><span>Remove friend</span>
                  </button>
                )}
                {!isFriend && !hasOutgoing && !hasIncoming && (
                  <button type="button" className="panel-action is-accent" onClick={handleAddFriend} disabled={busy}>
                    <UserRoundPlus size={14} /><span>Add friend</span>
                  </button>
                )}
                {!isFriend && hasOutgoing && (
                  <div className="panel-action is-pending"><Loader2 size={14} className="panel-spinner" /><span>Request pending</span></div>
                )}
                {!isFriend && hasIncoming && (
                  <div className="panel-action is-pending"><Check size={14} /><span>Accept in Requests</span></div>
                )}
              </div>
            </div>
          )}

          <div className="panel-section">
            <div className="panel-section-label">Conversation</div>
            <div className="panel-actions">
              <button type="button" className="panel-action" onClick={() => toggleFlag('isMuted')} disabled={busy}>
                {conversation.isMuted ? <Bell size={14} /> : <BellOff size={14} />}
                <span>{conversation.isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
              <button type="button" className="panel-action" onClick={() => toggleFlag('isPinned')} disabled={busy}>
                {conversation.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                <span>{conversation.isPinned ? 'Unpin' : 'Pin'}</span>
              </button>
              
              {!isAi && (
                <button type="button" className="panel-action" onClick={() => toggleFlag('isArchived')} disabled={busy}>
                  {conversation.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  <span>{conversation.isArchived ? 'Unarchive' : 'Archive'}</span>
                </button>
              )}
            </div>
          </div>

          {!isAi && (
            <div className="panel-section panel-danger">
              <div className="panel-section-label">Danger</div>
              <div className="panel-actions">
                <button type="button" className="panel-action is-danger" onClick={() => setPendingBlock(true)} disabled={busy}>
                  <ShieldOff size={14} /><span>Block user</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Alert isOpen={pendingRemoveFriend} type="confirm" title="Remove friend?"
        message={`Remove ${displayNameOf(peer)} from your friends? You can always send a new request later.`}
        confirmText="Remove" cancelText="Cancel" onConfirm={handleRemoveFriend} onCancel={() => setPendingRemoveFriend(false)} />

      <BlockConfirmModal isOpen={pendingBlock} user={peer} onClose={() => setPendingBlock(false)} />
    </>
  );
}