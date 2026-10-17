// apps/web/src/features/personal/chats/components/NewChatModal.jsx
//
// Search your FRIENDS and start (or resume) a DM. The server restricts
// the search endpoint to friends only — non-friends won't appear.
//
// Debounced 300ms. The API requires 2+ chars.
//
// If the caller has no friends yet, the empty state nudges them to the
// Add Friend modal instead of leaving them staring at "no results".
//
// PHASE 5 CHANGE (EmptyState migration)
// -------------------------------------
//   • "No friends yet" and "No friends match" states now use the shared
//     <EmptyState> component. The "Search your friends" hint and the
//     "Searching…" loader stay as bespoke blocks (they're not empty
//     states — they're in-progress prompts).

import { useEffect, useState, useCallback } from 'react';
import { X, Loader2, Search, UserRoundPlus } from 'lucide-react';

import Portal from '@/shared/components/Portal';
import EmptyState from '@/shared/components/EmptyState';
import { useChatUserSearch, useCreateConversation } from '@/shared/api/chat';
import { useFriends } from '@/shared/api/friends';

function initialsOf(user) {
  if (!user) return '?';
  const a = (user.firstName || '').trim();
  const b = (user.lastName || '').trim();
  if (a && b) return (a[0] + b[0]).toUpperCase();
  if (a) return a.slice(0, 2).toUpperCase();
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  return '?';
}

function displayNameOf(user) {
  if (!user) return 'Unknown';
  const a = (user.firstName || '').trim();
  const b = (user.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return user.email || 'Unknown';
}

export default function NewChatModal({ isOpen, onClose, onCreated, onOpenAddFriend }) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');

  const { data: friends = [] } = useFriends({ enabled: isOpen });

  useEffect(() => {
    if (!isOpen) {
      setTerm('');
      setDebounced('');
      return undefined;
    }
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term, isOpen]);

  const { data: users = [], isFetching, isFetched } = useChatUserSearch(debounced);
  const createMutation = useCreateConversation();

  const handlePick = useCallback(
    async (userId) => {
      try {
        const conv = await createMutation.mutateAsync(userId);
        onClose();
        if (onCreated) onCreated(conv.id);
      } catch (err) {
        console.error('[new-chat] failed:', err);
      }
    },
    [createMutation, onClose, onCreated]
  );

  if (!isOpen) return null;

  const noFriends = friends.length === 0;
  const showHint = debounced.length < 2;
  const showEmpty =
    debounced.length >= 2 && !isFetching && isFetched && users.length === 0;

  return (
    <Portal>
      <div
        className="chat-modal-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="chat-newchat-modal" role="dialog" aria-modal="true">
          <div className="chat-newchat-head">
            <div style={{ minWidth: 0 }}>
              <h2 className="chat-newchat-title">New chat</h2>
              <p className="chat-newchat-sub">Search your friends</p>
            </div>
            <button
              type="button"
              className="chat-newchat-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="chat-newchat-search">
            <Search size={13} className="chat-newchat-search-icon" />
            <input
              type="text"
              placeholder="Search friends by name or email…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              autoFocus
              spellCheck={false}
            />
          </div>

          <div className="chat-newchat-list">
            {noFriends && (
              <div style={{ padding: '20px 12px' }}>
                <EmptyState
                  size="md"
                  variant="bare"
                  icon={UserRoundPlus}
                  eyebrow="No friends"
                  title="No friends yet"
                  description="Add a friend by email to start chatting. Non-friends are hidden from search."
                  actions={
                    onOpenAddFriend
                      ? [
                          {
                            label: 'Add friend',
                            icon: UserRoundPlus,
                            variant: 'primary',
                            onClick: () => { onClose(); onOpenAddFriend(); },
                          },
                        ]
                      : []
                  }
                />
              </div>
            )}

            {!noFriends && showHint && (
              <div className="chat-newchat-empty">
                <Search size={22} style={{ opacity: .5 }} />
                <strong>Search your friends</strong>
                <p>Type at least 2 characters to find someone.</p>
              </div>
            )}

            {!noFriends && !showHint && isFetching && users.length === 0 && (
              <div className="chat-newchat-empty">
                <Loader2 size={18} style={{ animation: 'chatSpin .8s linear infinite' }} />
                <div style={{ marginTop: 8 }}>Searching…</div>
              </div>
            )}

            {!noFriends && showEmpty && (
              <div style={{ padding: '20px 12px' }}>
                <EmptyState
                  size="md"
                  variant="bare"
                  icon={Search}
                  eyebrow="No matches"
                  title="No friends match"
                  description={`"${debounced}" didn't match any of your friends.`}
                />
              </div>
            )}

            {!noFriends && users.map((u) => (
              <button
                key={u.id}
                type="button"
                className="chat-newchat-user"
                onClick={() => handlePick(u.id)}
                disabled={createMutation.isPending}
              >
                <div className="chat-avatar">
                  {u.photoUrl ? <img src={u.photoUrl} alt="" /> : initialsOf(u)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="chat-newchat-user-name">{displayNameOf(u)}</div>
                  <div className="chat-newchat-user-email">{u.email}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes chatSpin { to { transform: rotate(360deg); } }
      `}</style>
    </Portal>
  );
}