// apps/web/src/features/personal/chats/components/ThreadSkeleton.jsx
//
// Shimmering placeholder bubbles shown while a thread is loading.
// Class names are `.thread-skel-*` (declared in ChatsShell.css).
//
// Phase 6 polish: alternating own/peer alignment is preserved, but bubble
// widths alternate slightly so the shape feels like a real conversation.

const OWN_WIDTHS    = ['40%', '52%', '36%', '58%'];
const PEER_WIDTHS   = ['55%', '42%', '60%', '48%'];

export default function ThreadSkeleton({ rows = 7 }) {
  return (
    <div
      className="thread-skeleton"
      role="status"
      aria-live="polite"
      aria-label="Loading messages"
    >
      {Array.from({ length: rows }).map((_, i) => {
        const isOwn = i % 3 === 1;
        const width = isOwn
          ? OWN_WIDTHS[i % OWN_WIDTHS.length]
          : PEER_WIDTHS[i % PEER_WIDTHS.length];

        return (
          <div key={i} className={`thread-skel-row${isOwn ? ' is-own' : ''}`}>
            {!isOwn && <div className="thread-skel-avatar" aria-hidden />}
            <div
              className="thread-skel-bubble"
              style={{ width }}
              aria-hidden
            />
          </div>
        );
      })}
    </div>
  );
}