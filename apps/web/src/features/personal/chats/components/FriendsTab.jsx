// apps/web/src/features/personal/chats/components/FriendsTab.jsx
//
// The "Friends" tab of the chat shell. Hosts two sub-views:
//
//   view === 'list'      → the friends list (default)
//   view === 'requests'  → incoming + outgoing friend requests, rendered
//                          by <FriendRequestsPanel onBack={...} />
//
// The header shows:
//   • title + friend count
//   • a Requests button (with a badge when there are pending incoming)
//   • an Add Friend button
//
// Per-row actions unchanged: Message, Remove friend, Block user.

import { useMemo, useState } from 'react';
import {
  UserRoundPlus,
  MessageCircle,
  MoreHorizontal,
  UserMinus,
  ShieldOff,
  Inbox,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useFriends,
  useFriendRequests,
  useRemoveFriend,
} from '@/shared/api/friends';
import { useCreateConversation, useUpdateConversation } from '@/shared/api/chat';
import Alert from '@/shared/components/Alert';
import BlockConfirmModal from './BlockConfirmModal';
import FriendRequestsPanel from './FriendRequestsPanel';

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

/** Inline badge used on the Requests button. */
function CountBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 16,
        height: 16,
        padding: '0 4px',
        borderRadius: 8,
        background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
        color: '#0D1117',
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
        fontSize: 9.5,
        fontWeight: 700,
        lineHeight: '16px',
        textAlign: 'center',
        boxShadow: '0 0 0 2px #0F121A',
        pointerEvents: 'none',
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function FriendsTab({
  onOpenAddFriend,
  onOpenThread,
}) {
  const [view, setView] = useState('list'); // 'list' | 'requests'

  const { data: friends = [], isLoading } = useFriends();
  const { data: requests } = useFriendRequests();
  const removeFriendMutation = useRemoveFriend();
  const createConversation = useCreateConversation();
  const updateConversation = useUpdateConversation();

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

  const handleArchiveToggle = (friend) => {
    if (!friend.conversationId) {
      toast.error('Start a conversation first');
      return;
    }
    setMenuOpenId(null);
    const willArchive = !friend.isArchived;
    updateConversation.mutate(
      {
        conversationId: friend.conversationId,
        patch: { isArchived: willArchive },
      },
      {
        onSuccess: () => {
          toast.success(
            willArchive
              ? `Archived chat with ${displayNameOf(friend)}`
              : `Unarchived chat with ${displayNameOf(friend)}`
          );
        },
        onError: (err) => {
          toast.error(err?.message || 'Could not update archive state');
        },
      }
    );
  };
  /* ------------------------------------------------------------------ */
  /*  Requests sub-view                                                 */
  /* ------------------------------------------------------------------ */
  if (view === 'requests') {
    return (
      <FriendRequestsPanel
        onBack={() => setView('list')}
        onOpenAddFriend={onOpenAddFriend}
      />
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Friends list view                                                 */
  /* ------------------------------------------------------------------ */
  return (
    <>
      <div className="side-pane">
        <div className="side-pane-header">
          <span className="side-pane-title">Friends</span>
          <span className="side-pane-count">{friends.length}</span>

          <div className="side-pane-actions">
            <button
              type="button"
              className="pane-icon-btn"
              onClick={() => setView('requests')}
              title={
                pendingIncoming > 0
                  ? `${pendingIncoming} pending friend request${pendingIncoming === 1 ? '' : 's'}`
                  : 'Friend requests'
              }
              aria-label="Friend requests"
              style={{ position: 'relative' }}
            >
              <Inbox size={14} />
              <CountBadge count={pendingIncoming} />
            </button>

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
              <div
                key={friend.id}
                className="pane-row"
                style={{ position: 'relative' }}
              >
                <span className="pane-row-avatar">
                  {friend.photoUrl ? (
                    <img src={friend.photoUrl} alt="" />
                  ) : (
                    initialsOf(friend)
                  )}
                </span>

                <div className="pane-row-body">
                  <div className="pane-row-name">
                    {displayNameOf(friend)}
                    {friend.isArchived && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          marginLeft: 8,
                          padding: '2px 8px',
                          borderRadius: 99,
                          background: 'rgba(255,255,255,.04)',
                          border: '1px solid rgba(255,255,255,.1)',
                          color: '#8892A3',
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 9.5,
                          fontWeight: 700,
                          letterSpacing: '.06em',
                          textTransform: 'uppercase',
                          verticalAlign: 'middle',
                        }}
                      >
                        <Archive size={9} />
                        Archived
                      </span>
                    )}
                  </div>
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
                          onClick={() => handleArchiveToggle(friend)}
                          disabled={updateConversation.isPending}
                          title={
                            friend.conversationId
                              ? undefined
                              : 'Start a conversation first'
                          }
                        >
                          {friend.isArchived ? (
                            <ArchiveRestore size={13} />
                          ) : (
                            <Archive size={13} />
                          )}
                          <span>
                            {friend.isArchived ? 'Unarchive chat' : 'Archive chat'}
                          </span>
                        </button>

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