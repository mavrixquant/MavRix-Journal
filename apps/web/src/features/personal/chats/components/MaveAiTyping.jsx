import MaveAiAvatar from './MaveAiAvatar';

export default function MaveAiTyping() {
  return (
    <div className="msg-row is-peer is-first is-ai-thinking">
      <MaveAiAvatar size={34} />
      <div className="msg-col">
        <div className="msg-bubble ai-thinking">
          <span className="ai-thinking-label">Mave AI is thinking</span>
          <span className="typing-dots" aria-hidden><span /><span /><span /></span>
        </div>
      </div>
    </div>
  );
}
