// apps/web/src/features/personal/chats/components/MessageComposer.jsx
//
// PHASE 3 — professional chat composer.
//
// Responsibilities:
//   • Auto-grow textarea (1 → 8 rows, capped at 160px, then internal scroll)
//   • Char countdown only shown near the limit (>= NEAR_LIMIT chars)
//   • Send button: enabled state, spinner while isSending, proper focus ring
//   • Enter / Shift+Enter / Ctrl+Enter handling per settings.chats.enterToSend
//   • Typing signal: throttled start, 3s idle stop, and IMMEDIATE stop when
//     the textarea is cleared back to empty
//   • Locked state (non-friend 3-message cap) — polished banner
//   • Archived state — polished banner with Unarchive CTA
//   • Auto-focus on conversation change (only in normal mode)

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  SendHorizontal,
  Lock,
  UserRoundPlus,
  Clock,
  Archive,
  ArchiveRestore,
  Loader2,
} from 'lucide-react';

import { useSettings } from '@/app/layout/Settings/SettingsProvider';

const MAX_LEN = 4000;
const NEAR_LIMIT = 3500;
const MAX_TEXTAREA_HEIGHT = 160;
const TYPING_THROTTLE_MS = 2000;
const TYPING_IDLE_MS = 3000;
const MIN_ROWS = 1;

function displayNameOf(u) {
  if (!u) return 'this user';
  const a = (u.firstName || '').trim();
  const b = (u.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return u.email || 'this user';
}

export default function MessageComposer({
  conversationId,
  onSend,
  onTyping,
  disabled = false,
  isSending = false,

  // Locked (non-friend 3-message cap)
  isLocked = false,
  peer = null,
  friendRequestPending = false,
  onAddFriend,

  // Archived
  isArchived = false,
  onUnarchive,
  unarchiving = false,
}) {
  const { settings } = useSettings();
  const enterToSend = settings.chats.enterToSend;

  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const idleTimerRef = useRef(null);

  /* ---------------- Reset on conversation / mode change ---------------- */

  useEffect(() => {
    setText('');
    lastTypingSentRef.current = 0;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    // Focus the input when entering a normal thread
    if (!isLocked && !isArchived) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, [conversationId, isLocked, isArchived]);

  /* ---------------- Cleanup on unmount ---------------- */

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  /* ---------------- Auto-grow ---------------- */

  const grow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT) + 'px';
  }, []);

  /* ---------------- Typing signal ---------------- */

  const signalTyping = useCallback(() => {
    if (!onTyping) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > TYPING_THROTTLE_MS) {
      lastTypingSentRef.current = now;
      onTyping(true);
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      lastTypingSentRef.current = 0;
      onTyping(false);
      idleTimerRef.current = null;
    }, TYPING_IDLE_MS);
  }, [onTyping]);

  const stopTypingNow = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (lastTypingSentRef.current !== 0 && onTyping) {
      lastTypingSentRef.current = 0;
      onTyping(false);
    }
  }, [onTyping]);

  /* ---------------- Input handling ---------------- */

  const handleChange = (e) => {
    const next = e.target.value.slice(0, MAX_LEN);
    const wasNonEmpty = text.length > 0;

    setText(next);
    grow();

    if (next.trim().length > 0) {
      signalTyping();
    } else if (wasNonEmpty) {
      // User cleared the field → stop typing immediately
      stopTypingNow();
    }
  };

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled || isLocked || isArchived || isSending) return;

    stopTypingNow();

    onSend(trimmed);
    setText('');

    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = 'auto';
        el.focus();
      }
    });
  }, [
    text,
    disabled,
    isLocked,
    isArchived,
    isSending,
    onSend,
    stopTypingNow,
  ]);

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    const mod = e.ctrlKey || e.metaKey;
    const shouldSend = enterToSend ? !e.shiftKey : mod;
    if (!shouldSend) return;
    e.preventDefault();
    submit();
  };

  /* ---------------- Locked banner ---------------- */

  if (isLocked) {
    return (
      <div className="composer-locked">
        <div className="composer-banner">
          <div className="composer-banner-icon" aria-hidden>
            <Lock size={14} />
          </div>
          <div className="composer-banner-body">
            <div className="composer-banner-title">
              You&apos;ve reached your 3 free messages
            </div>
            <div className="composer-banner-sub">
              Add {displayNameOf(peer)} as a friend to keep chatting.
            </div>
          </div>
          {friendRequestPending ? (
            <span className="composer-banner-pending">
              <Clock size={11} /> Request sent
            </span>
          ) : (
            <button
              type="button"
              className="composer-banner-cta"
              onClick={onAddFriend}
              disabled={!onAddFriend}
            >
              <UserRoundPlus size={12} />
              <span>Add friend</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---------------- Archived banner ---------------- */

  if (isArchived) {
    return (
      <div className="composer-locked">
        <div className="composer-banner is-archived">
          <div className="composer-banner-icon" aria-hidden>
            <Archive size={14} />
          </div>
          <div className="composer-banner-body">
            <div className="composer-banner-title">
              This chat is archived
            </div>
            <div className="composer-banner-sub">
              Unarchive to send new messages. You&apos;ll still receive theirs.
            </div>
          </div>
          <button
            type="button"
            className="composer-banner-cta"
            onClick={onUnarchive}
            disabled={!onUnarchive || unarchiving}
          >
            <ArchiveRestore size={12} />
            <span>{unarchiving ? 'Unarchiving…' : 'Unarchive'}</span>
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- Normal composer ---------------- */

  const canSend = text.trim().length > 0 && !disabled && !isSending;
  const nearLimit = text.length > NEAR_LIMIT;
  const atLimit = text.length >= MAX_LEN;

  const sendHint = enterToSend
    ? 'Enter to send · Shift+Enter for a new line'
    : 'Ctrl+Enter to send · Enter for a new line';

  return (
    <div className="composer">
      <div className="composer-input-wrap">
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          placeholder={disabled ? 'You cannot reply here' : 'Type a message…'}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={MIN_ROWS}
          disabled={disabled}
          maxLength={MAX_LEN}
          aria-label="Message input"
        />

        <div className="composer-hint">
          <span className="composer-hint-text">{sendHint}</span>
          {(nearLimit || atLimit) && (
            <span className={`composer-count${atLimit ? ' is-warn' : ''}`}>
              {text.length.toLocaleString()} / {MAX_LEN.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        className="composer-send"
        onClick={submit}
        disabled={!canSend}
        aria-label="Send message"
        title={enterToSend ? 'Send (Enter)' : 'Send (Ctrl+Enter)'}
      >
        {isSending ? (
          <Loader2 size={16} className="composer-spinner" />
        ) : (
          <SendHorizontal size={16} />
        )}
      </button>
    </div>
  );
}