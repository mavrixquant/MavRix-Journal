import MaveAiAvatar from './MaveAiAvatar';

export default function MaveAiTyping() {
  return (
    <div className="msg-row is-peer is-first" style={{ opacity: 0.8 }}>
      <MaveAiAvatar size={32} />
      <div className="msg-col">
        <div className="msg-bubble" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--ink-2)' }}>
            Mave AI is thinking
          </span>
          <span className="typing-dots">
            <span /><span /><span />
          </span>
        </div>
      </div>
    </div>
  );
}