import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowUp,
  Lock,
  UserRoundPlus,
  Clock,
  Archive,
  ArchiveRestore,
  Loader2,
  Square,
  Smile,
  CornerUpLeft,
  X,
} from 'lucide-react';

import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import EmojiPicker from './EmojiPicker';
import { displayNameOf } from './Avatar';

const MAX_LEN = 4000;
const COUNTER_AT = 3000;
const MAX_TEXTAREA_HEIGHT = 168;
const TYPING_THROTTLE_MS = 2000;
const TYPING_IDLE_MS = 3000;

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

  replyTo = null,
  onCancelReply,
}) {
  const { settings } = useSettings();
  const enterToSend = settings.chats.enterToSend;

  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const idleTimerRef = useRef(null);

  useEffect(() => {
    setText('');
    setEmojiOpen(false);
    lastTypingSentRef.current = 0;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    const el = textareaRef.current;
    if (el) el.style.height = 'auto';

    if (!isLocked && !isArchived) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [conversationId, isLocked, isArchived]);

  // Focus the box when the user starts a reply.
  useEffect(() => {
    if (replyTo) requestAnimationFrame(() => textareaRef.current?.focus());
  }, [replyTo]);

  useEffect(() => () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, []);

  const grow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const borderY = el.offsetHeight - el.clientHeight;
    el.style.height = Math.min(Math.ceil(el.scrollHeight + borderY), MAX_TEXTAREA_HEIGHT) + 'px';
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
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = 'auto';
        el.focus();
      }
    });
  }, [text, disabled, isLocked, isArchived, isSending, onSend, stopTypingNow]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && replyTo) {
      e.preventDefault();
      onCancelReply?.();
      return;
    }
    if (e.key !== 'Enter' || e.nativeEvent?.isComposing) return;
    const mod = e.ctrlKey || e.metaKey;
    const shouldSend = enterToSend ? !e.shiftKey : mod;
    if (!shouldSend) return;
    e.preventDefault();
    submit();
  };

  const insertEmoji = (emoji) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = (text.slice(0, start) + emoji + text.slice(end)).slice(0, MAX_LEN);
    setText(next);
    requestAnimationFrame(() => {
      const t = textareaRef.current;
      if (!t) return;
      t.focus();
      const pos = Math.min(start + emoji.length, next.length);
      t.setSelectionRange(pos, pos);
      grow();
    });
    if (next.trim()) signalTyping();
  };

  if (isLocked) {
    return (
      <div className="composer-dock">
        <div className="composer-banner">
          <div className="composer-banner-icon" aria-hidden><Lock size={16} /></div>
          <div className="composer-banner-body">
            <div className="composer-banner-title">You’ve used your 3 free messages</div>
            <div className="composer-banner-sub">Add {displayNameOf(peer)} as a friend to keep chatting.</div>
          </div>
          {friendRequestPending ? (
            <span className="composer-banner-pending"><Clock size={12} /> Request sent</span>
          ) : (
            <button type="button" className="composer-banner-cta" onClick={onAddFriend} disabled={!onAddFriend}>
              <UserRoundPlus size={14} />
              <span>Add friend</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isArchived) {
    return (
      <div className="composer-dock">
        <div className="composer-banner is-archived">
          <div className="composer-banner-icon" aria-hidden><Archive size={16} /></div>
          <div className="composer-banner-body">
            <div className="composer-banner-title">This chat is archived</div>
            <div className="composer-banner-sub">Unarchive to send new messages. You’ll still receive theirs.</div>
          </div>
          <button type="button" className="composer-banner-cta" onClick={onUnarchive} disabled={!onUnarchive || unarchiving}>
            <ArchiveRestore size={14} />
            <span>{unarchiving ? 'Unarchiving…' : 'Unarchive'}</span>
          </button>
        </div>
      </div>
    );
  }

  const canSend = text.trim().length > 0 && !disabled && !isSending;
  const showCounter = text.length >= COUNTER_AT;

  return (
    <div className="composer-dock">
      {replyTo && (
        <div className="chat-reply-banner">
          <CornerUpLeft size={15} className="chat-reply-banner-icon" aria-hidden />
          <div className="chat-reply-banner-body">
            <div className="chat-reply-banner-label">
              Replying to {displayNameOf(replyTo.sender)}
            </div>
            <div className="chat-reply-banner-text">{(replyTo.body || '').slice(0, 120)}</div>
          </div>
          <button type="button" className="chat-reply-banner-cancel" onClick={onCancelReply} aria-label="Cancel reply">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="composer">
        <div className="composer-emoji-anchor">
          <button
            type="button"
            className={`composer-icon-btn${emojiOpen ? ' is-active' : ''}`}
            onClick={() => setEmojiOpen((v) => !v)}
            aria-label="Insert emoji"
            aria-expanded={emojiOpen}
            title="Emoji"
            disabled={disabled}
          >
            <Smile size={21} />
          </button>
          {emojiOpen && <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />}
        </div>

        <textarea
          ref={textareaRef}
          className="composer-textarea"
          placeholder={
            waitingForAi
              ? 'Mave AI is thinking — you can draft your next message…'
              : disabled
                ? 'You cannot reply here'
                : 'Write a message…'
          }
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
          maxLength={MAX_LEN}
          aria-label="Message input"
        />

        {waitingForAi ? (
          <button
            type="button"
            className="composer-stop"
            onClick={onStopAi}
            disabled={stoppingAi || !onStopAi}
            aria-label="Stop AI response"
            title="Stop AI response"
          >
            {stoppingAi ? <Loader2 size={17} className="composer-spinner" /> : <Square size={14} fill="currentColor" />}
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
            {isSending ? <Loader2 size={17} className="composer-spinner" /> : <ArrowUp size={19} strokeWidth={2.6} />}
          </button>
        )}
      </div>

      <div className="composer-foot">
        <span className="composer-hint">
          {enterToSend ? 'Enter to send · Shift+Enter for new line' : 'Ctrl+Enter to send · Enter for new line'}
        </span>
        {showCounter && (
          <span className={`composer-count${text.length >= MAX_LEN - 100 ? ' is-near' : ''}`}>
            {text.length}/{MAX_LEN}
          </span>
        )}
      </div>
    </div>
  );
}
