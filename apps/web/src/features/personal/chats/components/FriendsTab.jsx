// apps/web/src/features/personal/chats/components/FriendsTab.jsx
//
// The "Friends" tab of the chat shell. Lists accepted friends with per-row
// actions (Message, Remove friend, Block). Pending-request summary at the
// top jumps to the Requests tab.

import { useMemo, useState } from 'react';
import {
  UserRoundPlus,
  MessageCircle,
  MoreHorizontal,
  UserMinus,
  ShieldOff,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useFriends,
  useFriendRequests,
  useRemoveFriend,
} from '@/shared/api/friends';
import { useCreateConversation } from '@/shared/api/chat';
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

export default function FriendsTab({ onOpenAddFriend, onOpenRequests, onOpenThread }) {
  const { data: friends = [], isLoading } = useFriends();
  const { data: requests } = useFriendRequests();
  const removeFriendMutation = useRemoveFriend();
  const createConversation = useCreateConversation();

  const [pendingRemove, setPendingRemove] = useState(null);
  const [pendingBlock, setPendingBlock] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const pendingIncoming = (requests?.incoming || []).length;

  const sortedFriends = useMemo(
    () => [...friends].sort((a, b) => displayNameOf(a).localeCompare(displayNameOf(b))),
    [friends]
  );

  const handleMessage = async (friend) => {
    try {
      const conv = await createConversation.mutateAsync(friend.id);
      if (onOpenThread) onOpenThread(conv.id);
    } catch (err) {
      toast.error(err?.message || 'Could not open conversation');
    }
  };

  const handleRemoveConfirm = async () => {
    const friend = pendingRemove;
    if (!friend) return;
    setPendingRemove(null);
    try {
      await removeFriendMutation.mutateAsync(friend.id);
      toast.success(`Removed ${displayNameOf(friend)} from friends`);
    } catch (err) {
      toast.error(err?.message || 'Could not remove friend');
    }
  };

  const handleBlockClick = (friend) => {
    setMenuOpenId(null);
    setPendingBlock(friend);
  };

  return (
    <>
      <div className="side-pane">
        <div className="side-pane-header">
          <span className="side-pane-title">Friends</span>
          <span className="side-pane-count">{friends.length}</span>
          <div className="side-pane-actions">
            <button
              type="button"
              className="pane-icon-btn is-accent"
              onClick={onOpenAddFriend}
              title="Add friend"
              aria-label="Add friend"
            >
              <UserRoundPlus size={14} />
            </button>
          </div>
        </div>

        <div className="side-pane-body" onClick={() => setMenuOpenId(null)}>
          {pendingIncoming > 0 && (
            <button
              type="button"
              className="pane-row"
              style={{ width: '100%', textAlign: 'left' }}
              onClick={onOpenRequests}
            >
              <span className="pane-row-avatar">
                <Inbox size={16} />
              </span>
              <div className="pane-row-body">
                <div className="pane-row-name">
                  {pendingIncoming} pending friend request
                  {pendingIncoming === 1 ? '' : 's'}
                </div>
                <div className="pane-row-sub">Tap to review</div>
              </div>
            </button>
          )}

          {isLoading && <div className="side-pane-loading">Loading friends…</div>}

          {!isLoading && sortedFriends.length === 0 && (
            <div className="side-pane-empty">
              <strong>No friends yet</strong>
              Add a friend by email to start direct messaging.
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="pane-icon-btn is-accent"
                  style={{ width: 'auto', padding: '0 14px', gap: 8, height: 36 }}
                  onClick={onOpenAddFriend}
                >
                  <UserRoundPlus size={13} />
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11.5,
                      fontWeight: 600,
                      letterSpacing: '.02em',
                    }}
                  >
                    Add friend
                  </span>
                </button>
              </div>
            </div>
          )}

          {sortedFriends.map((friend) => {
            const menuOpen = menuOpenId === friend.id;
            return (
              <div key={friend.id} className="pane-row" style={{ position: 'relative' }}>
                <span className="pane-row-avatar">
                  {friend.photoUrl ? (
                    <img src={friend.photoUrl} alt="" />
                  ) : (
                    initialsOf(friend)
                  )}
                </span>

                <div className="pane-row-body">
                  <div className="pane-row-name">{displayNameOf(friend)}</div>
                  <div className="pane-row-sub">{friend.email}</div>
                </div>

                <div className="pane-row-actions">
                  <button
                    type="button"
                    className="pane-icon-btn is-accent"
                    onClick={() => handleMessage(friend)}
                    title="Message"
                    aria-label={`Message ${displayNameOf(friend)}`}
                    disabled={createConversation.isPending}
                  >
                    <MessageCircle size={14} />
                  </button>
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="pane-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpen ? null : friend.id);
                      }}
                      title="More"
                      aria-label="More actions"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                    >
                      <MoreHorizontal size={14} />
                    </button>

                    {menuOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 'calc(100% + 6px)',
                          zIndex: 30,
                          minWidth: 200,
                          padding: 4,
                          borderRadius: 10,
                          background: '#11151F',
                          border: '1px solid #212836',
                          boxShadow: '0 16px 40px -12px rgba(0,0,0,.7)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="chat-ctx-item"
                          onClick={() => {
                            setMenuOpenId(null);
                            setPendingRemove(friend);
                          }}
                        >
                          <UserMinus size={13} />
                          <span>Remove friend</span>
                        </button>
                        <button
                          type="button"
                          className="chat-ctx-item is-danger"
                          onClick={() => handleBlockClick(friend)}
                        >
                          <ShieldOff size={13} />
                          <span>Block user</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Alert
        isOpen={!!pendingRemove}
        type="confirm"
        title="Remove friend?"
        message={
          pendingRemove
            ? `Remove ${displayNameOf(pendingRemove)} from your friends? You can always send them a new request later.`
            : ''
        }
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleRemoveConfirm}
        onCancel={() => setPendingRemove(null)}
      />

      <BlockConfirmModal
        isOpen={!!pendingBlock}
        user={pendingBlock}
        onClose={() => setPendingBlock(null)}
      />
    </>
  );
}