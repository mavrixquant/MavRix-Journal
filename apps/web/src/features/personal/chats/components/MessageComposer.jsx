// apps/web/src/features/personal/chats/components/MessageComposer.jsx
//
// Composer footer for the chat thread.
//
// Three state overrides, in priority order:
//   1. isLocked    — non-friend DM reached the 3-message cap.
//   2. isArchived  — conversation is archived. Incoming still arrives.
//   3. normal      — textarea + send button.

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  SendHorizontal,
  Lock,
  UserRoundPlus,
  Clock,
  Archive,
  ArchiveRestore,
} from 'lucide-react';

import { useSettings } from '@/app/layout/Settings/SettingsProvider';

const MAX_LEN = 4000;
const TYPING_THROTTLE_MS = 2000;
const TYPING_IDLE_MS = 3000;

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

  isLocked = false,
  peer = null,
  friendRequestPending = false,
  onAddFriend,

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

  useEffect(() => {
    setText('');
    lastTypingSentRef.current = 0;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, [conversationId, isLocked, isArchived]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [conversationId]);

  const grow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, []);

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

  const handleChange = (e) => {
    const value = e.target.value.slice(0, MAX_LEN);
    setText(value);
    grow();
    if (value.trim().length > 0) signalTyping();
  };

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled || isLocked || isArchived) return;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    lastTypingSentRef.current = 0;
    if (onTyping) onTyping(false);
    onSend(trimmed);
    setText('');
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = 'auto';
        el.focus();
      }
    });
  }, [text, disabled, isLocked, isArchived, onSend, onTyping]);

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    const mod = e.ctrlKey || e.metaKey;
    const shouldSend = enterToSend ? !e.shiftKey : mod;
    if (!shouldSend) return;
    e.preventDefault();
    submit();
  };

  if (isLocked) {
    return (
      <div className="chat-composer is-locked">
        <div className="chat-composer-banner">
          <span className="chat-composer-banner-icon" aria-hidden>
            <Lock size={14} />
          </span>
          <div className="chat-composer-banner-text">
            <div className="chat-composer-banner-title">
              You've reached your 3 free messages
            </div>
            <div className="chat-composer-banner-sub">
              Add {displayNameOf(peer)} as a friend to keep chatting.
            </div>
          </div>
          {friendRequestPending ? (
            <span className="chat-composer-banner-pending">
              <Clock size={11} /> Request sent
            </span>
          ) : (
            <button
              type="button"
              className="chat-composer-banner-cta"
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

  if (isArchived) {
    return (
      <div className="chat-composer is-archived">
        <div className="chat-composer-banner is-archived">
          <span className="chat-composer-banner-icon" aria-hidden>
            <Archive size={14} />
          </span>
          <div className="chat-composer-banner-text">
            <div className="chat-composer-banner-title">
              This chat is archived
            </div>
            <div className="chat-composer-banner-sub">
              Unarchive to send new messages. You'll still receive theirs.
            </div>
          </div>
          <button
            type="button"
            className="chat-composer-banner-cta"
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

  const canSend = text.trim().length > 0 && !disabled && !isSending;
  const nearLimit = text.length > MAX_LEN - 200;

  const sendHint = enterToSend
    ? 'Enter to send · Shift+Enter for a new line'
    : 'Ctrl+Enter to send · Enter for a new line';

  return (
    <div className="chat-composer">
      <div className="chat-composer-input-wrap">
        <textarea
          ref={textareaRef}
          className="chat-composer-input"
          placeholder="Type a message…"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
          maxLength={MAX_LEN}
          aria-label="Message input"
        />

        <div className="chat-composer-hint">
          <span>{sendHint}</span>
          {nearLimit && (
            <span className={text.length >= MAX_LEN ? 'is-warn' : ''}>
              {text.length} / {MAX_LEN}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        className="chat-composer-send"
        onClick={submit}
        disabled={!canSend}
        aria-label="Send message"
        title={enterToSend ? 'Send (Enter)' : 'Send (Ctrl+Enter)'}
      >
        <SendHorizontal size={16} />
      </button>
    </div>
  );
}