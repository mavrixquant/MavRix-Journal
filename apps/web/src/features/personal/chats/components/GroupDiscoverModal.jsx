// apps/web/src/features/personal/chats/components/GroupDiscoverModal.jsx
//
// Browse + join public groups. Opened from the ChatsPage "Discover" button.
//
// Data:
//   useDiscoverableGroups({ q }) — public groups the caller is NOT in
//   useJoinGroup()               — self-join a public group
//
// Search is debounced 300ms. Groups show GroupAvatar + name + description +
// member count. Joining calls onJoined(group.id) so the caller can select
// the newly-joined conversation.

import { useEffect, useState, useCallback } from 'react';
import { X, Loader2, Users, Lock } from 'lucide-react';
import Portal from '@/shared/components/Portal';
import {
  useDiscoverableGroups,
  useJoinGroup,
} from '@/shared/api/chat';
import GroupAvatar from './GroupAvatar';

/* ------------------------------------------------------------------ */
/*  Scoped styles                                                      */
/* ------------------------------------------------------------------ */

const CSS = `
  .gdm-modal {
    
    
    
    
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;

    width: 100%;
    max-width: 560px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow:
      0 40px 100px -30px rgba(0,0,0,.95),
      0 0 0 1px var(--accent-soft);
    color: var(--ink-1);
    overflow: hidden;
    position: relative;
    animation: gdmPop .28s cubic-bezier(.2,.8,.25,1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .gdm-modal::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: gdmGrad 4s linear infinite;
    pointer-events: none;
    z-index: 1;
  }

  .gdm-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .gdm-title {
    font-size: 15px;
    font-weight: 700;
    margin: 0;
    letter-spacing: -.01em;
  }
  .gdm-sub {
    margin: 3px 0 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    letter-spacing: .02em;
  }
  .gdm-close {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
    transition: all .2s;
  }
  .gdm-close:hover {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .gdm-search {
    padding: 14px 22px;
    border-bottom: 1px solid var(--line-soft);
    flex-shrink: 0;
  }
  .gdm-search input {
    width: 100%;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(10,13,19,.7);
    color: var(--ink-1);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    transition: border-color .2s, box-shadow .2s;
  }
  .gdm-search input::placeholder { color: var(--ink-3); }
  .gdm-search input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }

  .gdm-list {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 8px;
  }
  .gdm-list::-webkit-scrollbar { width: 6px; }
  .gdm-list::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  .gdm-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 11px 12px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    cursor: default;
    transition: background-color .15s, border-color .15s;
    text-align: left;
  }
  .gdm-row:hover {
    background: rgba(255,255,255,.03);
    border-color: rgba(255,255,255,.06);
  }
  .gdm-row-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .gdm-row-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .gdm-row-desc {
    font-size: 11.5px;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.5;
  }
  .gdm-row-meta {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    letter-spacing: .02em;
  }

  .gdm-join {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 7px 14px;
    border-radius: 9px;
    border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .02em;
    cursor: pointer;
    box-shadow: 0 6px 16px -8px color-mix(in srgb, var(--accent) 60%, transparent);
    transition: transform .18s, box-shadow .22s;
  }
  .gdm-join:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px -10px color-mix(in srgb, var(--accent) 75%, transparent);
  }
  .gdm-join:disabled {
    opacity: .55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .gdm-empty {
    padding: 40px 20px;
    text-align: center;
    color: var(--ink-3);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.7;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .gdm-empty strong { color: var(--ink-2); font-weight: 600; }

  @keyframes gdmPop {
    from { opacity: 0; transform: translateY(-10px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes gdmGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .gdm-modal, .gdm-modal::before { animation: none !important; }
    .gdm-row, .gdm-join, .gdm-close { transition: none !important; }
  }
`;

/* ------------------------------------------------------------------ */

export default function GroupDiscoverModal({ isOpen, onClose, onJoined }) {
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

  const { data: groups = [], isFetching } = useDiscoverableGroups({
    q: debounced,
    enabled: isOpen,
  });

  const joinMutation = useJoinGroup();

  const handleJoin = useCallback(
    async (groupId) => {
      try {
        const conv = await joinMutation.mutateAsync(groupId);
        onClose();
        if (onJoined) onJoined(conv.id);
      } catch (err) {
        console.error('[group-discover] join failed:', err);
      }
    },
    [joinMutation, onClose, onJoined]
  );

  if (!isOpen) return null;

  const showEmpty = !isFetching && groups.length === 0;

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="chat-modal-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="gdm-modal" role="dialog" aria-modal="true">
          <div className="gdm-head">
            <div style={{ minWidth: 0 }}>
              <h2 className="gdm-title">Discover public groups</h2>
              <p className="gdm-sub">
                {isFetching
                  ? 'Searching…'
                  : `${groups.length} ${groups.length === 1 ? 'group' : 'groups'} available`}
              </p>
            </div>
            <button
              type="button"
              className="gdm-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="gdm-search">
            <input
              type="text"
              placeholder="Search by name…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              autoFocus
              spellCheck={false}
            />
          </div>

          <div className="gdm-list">
            {isFetching && groups.length === 0 && (
              <div className="gdm-empty">
                <Loader2 size={18} style={{ animation: 'gdmSpin .8s linear infinite' }} />
                <span>Loading groups…</span>
                <style>{`@keyframes gdmSpin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {showEmpty && (
              <div className="gdm-empty">
                <Lock size={20} style={{ opacity: .5 }} />
                <strong>No public groups to join</strong>
                <span>
                  {debounced
                    ? `Nothing matches “${debounced}”.`
                    : 'You are already a member of every public group.'}
                </span>
              </div>
            )}

            {groups.map((g) => {
              const joining = joinMutation.isPending && joinMutation.variables === g.id;
              return (
                <div key={g.id} className="gdm-row">
                  <GroupAvatar group={g} size={40} badge />
                  <div className="gdm-row-body">
                    <div className="gdm-row-name">{g.name}</div>
                    {g.description && (
                      <div className="gdm-row-desc">{g.description}</div>
                    )}
                    <div className="gdm-row-meta">
                      <Users size={11} />
                      {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="gdm-join"
                    onClick={() => handleJoin(g.id)}
                    disabled={joining}
                  >
                    {joining ? 'Joining…' : 'Join'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Portal>
  );
}