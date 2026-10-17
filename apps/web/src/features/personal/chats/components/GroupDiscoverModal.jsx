// apps/web/src/features/personal/chats/components/GroupDiscoverModal.jsx
//
// PHASE 5 — polish only. Grouped under an eyebrow-style head, joined rows
// get a proper icon, and the empty state uses the shared <EmptyState />
// component. Functionality is unchanged from Phase 1.

import { useEffect, useState, useCallback } from 'react';
import { X, Loader2, Users, Lock } from 'lucide-react';
import Portal from '@/shared/components/Portal';
import EmptyState from '@/shared/components/EmptyState';
import {
  useDiscoverableGroups,
  useJoinGroup,
} from '@/shared/api/chat';
import GroupAvatar from './GroupAvatar';
import { useFocusTrap } from '../hooks/useFocusTrap';

const CSS = `
  .gdm2-overlay {
    position: fixed; inset: 0; z-index: 2000;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    animation: gdm2Fade .18s ease;
  }
  .gdm2-modal {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    width: 100%; max-width: 560px; max-height: 80vh;
    display: flex; flex-direction: column;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95), 0 0 0 1px var(--accent-soft);
    color: var(--ink-1); overflow: hidden; position: relative;
    animation: gdm2Pop .28s cubic-bezier(.2,.8,.25,1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .gdm2-modal::before {
    content: ''; position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: gdm2Grad 4s linear infinite;
    pointer-events: none;
  }
  .gdm2-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  }
  .gdm2-title { margin: 0; font-size: 15px; font-weight: 700; letter-spacing: -.01em; }
  .gdm2-sub {
    margin: 3px 0 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: var(--ink-3); letter-spacing: .02em;
  }
  .gdm2-close {
    margin-left: auto;
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; padding: 0;
    border-radius: 8px; border: none; background: transparent;
    color: var(--ink-2); cursor: pointer; transition: all .2s;
  }
  .gdm2-close:hover { color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .gdm2-search {
    padding: 14px 22px;
    border-bottom: 1px solid var(--line-soft);
    flex-shrink: 0;
  }
  .gdm2-search input {
    width: 100%; padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(10,13,19,.7);
    color: var(--ink-1);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px; outline: none; box-sizing: border-box;
    transition: border-color .2s, box-shadow .2s;
  }
  .gdm2-search input::placeholder { color: var(--ink-3); }
  .gdm2-search input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }
  .gdm2-list {
    flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 8px;
  }
  .gdm2-list::-webkit-scrollbar { width: 6px; }
  .gdm2-list::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08); border-radius: 99px;
  }
  .gdm2-row {
    display: flex; align-items: center; gap: 12px;
    width: 100%; padding: 11px 12px;
    border-radius: 10px; border: 1px solid transparent;
    background: transparent; cursor: default;
    transition: background-color .15s, border-color .15s;
    text-align: left;
  }
  .gdm2-row:hover {
    background: rgba(255,255,255,.03);
    border-color: rgba(255,255,255,.06);
  }
  .gdm2-row-body {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 3px;
  }
  .gdm2-row-name {
    font-size: 13px; font-weight: 600; color: var(--ink-1);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .gdm2-row-desc {
    font-size: 11.5px; color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    line-height: 1.5;
  }
  .gdm2-row-meta {
    display: inline-flex; align-items: center; gap: 5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: var(--ink-3); letter-spacing: .02em;
  }
  .gdm2-join {
    flex-shrink: 0;
    display: inline-flex; align-items: center; gap: 5px;
    padding: 7px 14px; border-radius: 9px; border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 700; letter-spacing: .02em;
    cursor: pointer;
    box-shadow: 0 6px 16px -8px color-mix(in srgb, var(--accent) 60%, transparent);
    transition: transform .18s, box-shadow .22s;
  }
  .gdm2-join:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px -10px color-mix(in srgb, var(--accent) 75%, transparent);
  }
  .gdm2-join:disabled {
    opacity: .55; cursor: not-allowed; transform: none; box-shadow: none;
  }
  .gdm2-empty-wrap { padding: 12px 8px; }
  .gdm2-spin { animation: gdm2Spin .8s linear infinite; }

  @keyframes gdm2Fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes gdm2Pop {
    from { opacity: 0; transform: translateY(-10px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes gdm2Grad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes gdm2Spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .gdm2-modal, .gdm2-modal::before { animation: none !important; }
    .gdm2-row, .gdm2-join, .gdm2-close { transition: none !important; }
  }
`;

export default function GroupDiscoverModal({ isOpen, onClose, onJoined }) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');

  const trapRef = useFocusTrap({ active: isOpen, onEscape: onClose });
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
        className="gdm2-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="gdm2-modal" role="dialog" aria-modal="true" ref={trapRef}>
          <div className="gdm2-head">
            <div style={{ minWidth: 0 }}>
              <h2 className="gdm2-title">Discover public groups</h2>
              <p className="gdm2-sub">
                {isFetching
                  ? 'Searching…'
                  : `${groups.length} ${groups.length === 1 ? 'group' : 'groups'} available`}
              </p>
            </div>
            <button
              type="button"
              className="gdm2-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="gdm2-search">
            <input
              type="text"
              placeholder="Search by name…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              autoFocus
              spellCheck={false}
            />
          </div>

          <div className="gdm2-list">
            {isFetching && groups.length === 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '40px 20px',
                  color: 'var(--ink-3)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                }}
              >
                <Loader2 size={18} className="gdm2-spin" />
                <span>Loading groups…</span>
              </div>
            )}

            {showEmpty && (
              <div className="gdm2-empty-wrap">
                <EmptyState
                  size="md"
                  variant="bare"
                  icon={Lock}
                  eyebrow={debounced ? 'No matches' : 'No groups'}
                  title="No public groups to join"
                  description={
                    debounced
                      ? `Nothing matches "${debounced}".`
                      : 'You are already a member of every public group.'
                  }
                />
              </div>
            )}

            {groups.map((g) => {
              const joining = joinMutation.isPending && joinMutation.variables === g.id;
              return (
                <div key={g.id} className="gdm2-row">
                  <GroupAvatar group={g} size={40} badge />
                  <div className="gdm2-row-body">
                    <div className="gdm2-row-name">{g.name}</div>
                    {g.description && (
                      <div className="gdm2-row-desc">{g.description}</div>
                    )}
                    <div className="gdm2-row-meta">
                      <Users size={11} />
                      {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="gdm2-join"
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