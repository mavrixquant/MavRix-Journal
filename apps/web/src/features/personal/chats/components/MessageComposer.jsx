// apps/web/src/features/personal/chats/components/MessageComposer.jsx
//
// Composer footer for the chat thread. Handles:
//   - auto-growing textarea
//   - Enter to send (or Ctrl/Cmd+Enter, per user preference)
//   - throttled typing signal (1 event per 2s while typing)
//   - 4000 char cap (hard max enforced on the textarea)
//   - disabled while an optimistic send is in flight
//
// The send-combo hint under the textarea reflects the user's
// chats.enterToSend preference so the interaction is discoverable.

import { useEffect, useRef, useState, useCallback } from 'react';
import { SendHorizontal } from 'lucide-react';

import { useSettings } from '@/app/layout/Settings/SettingsProvider';

const MAX_LEN = 4000;
const TYPING_THROTTLE_MS = 2000;
const TYPING_IDLE_MS = 3000;

export default function MessageComposer({
  conversationId,
  onSend,
  onTyping,
  disabled = false,
  isSending = false,
}) {
  const { settings } = useSettings();
  const enterToSend = settings.chats.enterToSend;

  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const idleTimerRef = useRef(null);

  // Clear the textarea when the composer switches to a different conversation.
  useEffect(() => {
    setText('');
    lastTypingSentRef.current = 0;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, [conversationId]);

  // Clean up on unmount (or conversation change).
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
    if (!trimmed || disabled) return;
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
  }, [text, disabled, onSend, onTyping]);

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;

    const mod = e.ctrlKey || e.metaKey;
    // enterToSend ON  → Enter (with or without mod) sends, Shift+Enter newline
    // enterToSend OFF → Ctrl/Cmd+Enter sends, plain Enter newline
    const shouldSend = enterToSend ? !e.shiftKey : mod;

    if (!shouldSend) return;
    e.preventDefault();
    submit();
  };

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