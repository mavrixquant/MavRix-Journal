
import { useEffect, useState, useCallback } from 'react';
import { X, Loader2, Search, UserRoundPlus } from 'lucide-react';

import Portal from '@/shared/components/Portal';
import EmptyState from '@/shared/components/EmptyState';
import { useChatUserSearch, useCreateConversation } from '@/shared/api/chat';
import { useFriends } from '@/shared/api/friends';
import { useFocusTrap } from '../hooks/useFocusTrap';

const CSS = `
  .ncm-overlay {
    position: fixed; inset: 0; z-index: 2000;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    animation: ncmFade .18s ease;
  }
  .ncm-modal {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    width: 100%; max-width: 520px; max-height: 80vh;
    display: flex; flex-direction: column;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95), 0 0 0 1px var(--accent-soft);
    color: var(--ink-1);
    overflow: hidden; position: relative;
    animation: ncmPop .28s cubic-bezier(.2,.8,.25,1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .ncm-modal::before {
    content: ''; position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: ncmGrad 4s linear infinite;
    pointer-events: none;
  }
  .ncm-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex; align-items: center; gap: 10px;
    flex-shrink: 0;
  }
  .ncm-title { margin: 0; font-size: 15px; font-weight: 700; letter-spacing: -.01em; }
  .ncm-sub {
    margin: 3px 0 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: var(--ink-3); letter-spacing: .02em;
  }
  .ncm-close {
    margin-left: auto;
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; padding: 0;
    border-radius: 8px; border: none; background: transparent;
    color: var(--ink-2); cursor: pointer;
    transition: all .2s; flex-shrink: 0;
  }
  .ncm-close:hover { color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }

  .ncm-search {
    position: relative;
    padding: 14px 22px;
    border-bottom: 1px solid var(--line-soft);
    flex-shrink: 0;
  }
  .ncm-search-icon {
    position: absolute; left: 34px; top: 50%;
    transform: translateY(-50%); color: var(--ink-3);
    pointer-events: none;
  }
  .ncm-search input {
    width: 100%; padding: 10px 14px 10px 32px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(10,13,19,.7);
    color: var(--ink-1);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px; outline: none; box-sizing: border-box;
    transition: border-color .2s, box-shadow .2s;
  }
  .ncm-search input::placeholder { color: var(--ink-3); }
  .ncm-search input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }

  .ncm-list {
    flex: 1 1 auto; min-height: 0; overflow-y: auto;
    padding: 8px;
  }
  .ncm-list::-webkit-scrollbar { width: 6px; }
  .ncm-list::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08); border-radius: 99px;
  }

  .ncm-user {
    display: flex; align-items: center; gap: 12px;
    width: 100%; padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer; text-align: left;
    transition: background-color .15s, border-color .15s;
    font-family: inherit; color: inherit;
  }
  .ncm-user:hover:not(:disabled) {
    background: rgba(255,255,255,.03);
    border-color: rgba(255,255,255,.06);
  }
  .ncm-user:disabled { opacity: .55; cursor: not-allowed; }
  .ncm-user-avatar {
    flex-shrink: 0; width: 40px; height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, transparent), color-mix(in srgb, var(--accent) 5%, transparent));
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px; font-weight: 700;
    display: inline-flex; align-items: center; justify-content: center;
    overflow: hidden; letter-spacing: .02em;
  }
  .ncm-user-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .ncm-user-body { flex: 1; min-width: 0; }
  .ncm-user-name {
    font-size: 13px; font-weight: 600; color: var(--ink-1);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ncm-user-email {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; color: var(--ink-3);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    margin-top: 2px;
  }

  .ncm-empty-wrap { padding: 20px 12px; }
  .ncm-hint {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 8px;
    padding: 48px 20px; text-align: center;
    color: var(--ink-3);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px; line-height: 1.7;
  }
  .ncm-hint strong { color: var(--ink-2); font-weight: 600; font-size: 13px; }
  .ncm-hint p { margin: 0; max-width: 260px; }

  @keyframes ncmFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ncmPop {
    from { opacity: 0; transform: translateY(-10px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes ncmGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes ncmSpin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .ncm-modal, .ncm-modal::before { animation: none !important; }
    .ncm-user, .ncm-close { transition: none !important; }
  }
`;

function initialsOf(user) {
  if (!user) return '?';
  const a = (user.firstName || '').trim();
  const b = (user.lastName || '').trim();
  if (a && b) return (a[0] + b[0]).toUpperCase();
  if (a) return a.slice(0, 2).toUpperCase();
  if (user.username) return user.username.slice(0, 2).toUpperCase();
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  return '?';
}

function displayNameOf(user) {
  if (!user) return 'Unknown';
  const a = (user.firstName || '').trim();
  const b = (user.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return user.username || 'Unknown';
}

export default function NewChatModal({ isOpen, onClose, onCreated, onOpenAddFriend }) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');

  const trapRef = useFocusTrap({ active: isOpen, onEscape: onClose });

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
      <style>{CSS}</style>
      <div
        className="ncm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="ncm-modal" role="dialog" aria-modal="true" ref={trapRef}>
          <div className="ncm-head">
            <div style={{ minWidth: 0 }}>
              <h2 className="ncm-title">New chat</h2>
              <p className="ncm-sub">Search your friends</p>
            </div>
            <button
              type="button"
              className="ncm-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="ncm-search">
            <Search size={13} className="ncm-search-icon" />
            <input
              type="text"
              placeholder="Search friends by username…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              autoFocus
              spellCheck={false}
            />
          </div>

          <div className="ncm-list">
            {noFriends && (
              <div className="ncm-empty-wrap">
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
              <div className="ncm-hint">
                <Search size={22} style={{ opacity: .5 }} />
                <strong>Search your friends</strong>
                <p>Type at least 2 characters to find someone.</p>
              </div>
            )}

            {!noFriends && !showHint && isFetching && users.length === 0 && (
              <div className="ncm-hint">
                <Loader2 size={18} style={{ animation: 'ncmSpin .8s linear infinite' }} />
                <div style={{ marginTop: 8 }}>Searching…</div>
              </div>
            )}

            {!noFriends && showEmpty && (
              <div className="ncm-empty-wrap">
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
                className="ncm-user"
                onClick={() => handlePick(u.id)}
                disabled={createMutation.isPending}
              >
                <span className="ncm-user-avatar">
                  {u.photoUrl ? <img src={u.photoUrl} alt="" /> : initialsOf(u)}
                </span>
                <span className="ncm-user-body">
                  <span className="ncm-user-name">{displayNameOf(u)}</span>
                  <span className="ncm-user-email">{u.username ? '@' + u.username : ''}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Portal>
  );
}