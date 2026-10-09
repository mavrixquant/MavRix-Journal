// apps/web/src/features/personal/chats/components/NewChatModal.jsx
//
// Search users and start (or resume) a DM. Debounces the search term at
// 300ms and calls useChatUserSearch(q) — which itself requires 2+ chars.
//
// Selecting a user calls POST /api/chat/conversations, which is
// get-or-create: if a DM already exists with this user, the existing
// conversation is returned instead of creating a duplicate.

import { useEffect, useState, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import Portal from '@/shared/components/Portal';
import { useChatUserSearch, useCreateConversation } from '@/shared/api/chat';

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

export default function NewChatModal({ isOpen, onClose, onCreated }) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');

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

  const showEmpty =
    debounced.length >= 2 && !isFetching && isFetched && users.length === 0;
  const showHint = debounced.length < 2;

  return (
    <Portal>
      <div
        className="chat-modal-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="chat-newchat-modal" role="dialog" aria-modal="true">
          <div className="chat-newchat-head">
            <h2 className="chat-newchat-title">New chat</h2>
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
            <input
              type="text"
              placeholder="Search by name or email…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              autoFocus
              spellCheck={false}
            />
          </div>

          <div className="chat-newchat-list">
            {showHint && (
              <div className="chat-newchat-empty">
                Type at least 2 characters to search.
              </div>
            )}

            {!showHint && isFetching && users.length === 0 && (
              <div className="chat-newchat-empty">
                <Loader2 size={18} style={{ animation: 'chatSpin .8s linear infinite' }} />
                <div style={{ marginTop: 8 }}>Searching…</div>
              </div>
            )}

            {showEmpty && (
              <div className="chat-newchat-empty">
                No users match “{debounced}”.
              </div>
            )}

            {users.map((u) => (
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

      {/* Local keyframe for the spinner — deduped by id */}
      <style>{`
        @keyframes chatSpin { to { transform: rotate(360deg); } }
      `}</style>
    </Portal>
  );
}