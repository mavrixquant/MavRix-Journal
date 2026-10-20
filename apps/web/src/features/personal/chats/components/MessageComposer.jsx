import { useEffect, useRef, useState, useCallback } from 'react';
import {
  SendHorizontal,
  Lock,
  UserRoundPlus,
  Clock,
  Archive,
  ArchiveRestore,
  Loader2,
  StopCircle,
  Sparkles,
} from 'lucide-react';

import { useSettings } from '@/app/layout/Settings/SettingsProvider';

const MAX_LEN = 4000;
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

  isLocked = false,
  peer = null,
  friendRequestPending = false,
  onAddFriend,

  isArchived = false,
  onUnarchive,
  unarchiving = false,

  waitingForAi = false,
  onStopAi,
  stoppingAi = false,
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
    const el = textareaRef.current;
    if (el) el.style.height = 'auto';

    if (!isLocked && !isArchived) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, [conversationId, isLocked, isArchived]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const grow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const borderY = el.offsetHeight - el.clientHeight;
    const next = Math.min(
      Math.ceil(el.scrollHeight + borderY),
      MAX_TEXTAREA_HEIGHT
    );
    el.style.height = next + 'px';
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

  const handleChange = (e) => {
    const next = e.target.value.slice(0, MAX_LEN);
    const wasNonEmpty = text.length > 0;
    setText(next);
    grow();
    if (next.trim().length > 0) signalTyping();
    else if (wasNonEmpty) stopTypingNow();
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
  }, [text, disabled, isLocked, isArchived, isSending, onSend, stopTypingNow]);

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

  if (isArchived) {
    return (
      <div className="composer-locked">
        <div className="composer-banner is-archived">
          <div className="composer-banner-icon" aria-hidden>
            <Archive size={14} />
          </div>
          <div className="composer-banner-body">
            <div className="composer-banner-title">This chat is archived</div>
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

  const canSend = text.trim().length > 0 && !disabled && !isSending;

  // While AI is thinking → Stop button replaces Send.
  return (
    <div className="composer">
      <div className="composer-input-wrap">
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          placeholder={
            waitingForAi
              ? 'Mave AI is thinking — you can draft your next message…'
              : disabled
                ? 'You cannot reply here'
                : 'Type a message…'
          }
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={MIN_ROWS}
          disabled={disabled}
          maxLength={MAX_LEN}
          aria-label="Message input"
        />
      </div>

      {waitingForAi ? (
        <button
          type="button"
          className="composer-stop"
          onClick={onStopAi}
          disabled={stoppingAi || !onStopAi}
          aria-label="Stop AI response"
          title="Stop AI response"
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            border: '1px solid rgba(239,68,68,.42)',
            background: 'rgba(239,68,68,.10)',
            color: '#f87171',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: stoppingAi ? 'not-allowed' : 'pointer',
            opacity: stoppingAi ? 0.6 : 1,
            transition: 'all .18s ease',
            flexShrink: 0,
          }}
        >
          {stoppingAi ? (
            <Loader2 size={16} style={{ animation: 'composerSpin .8s linear infinite' }} />
          ) : (
            <StopCircle size={18} />
          )}
        </button>
      ) : (
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
      )}
    </div>
  );
}