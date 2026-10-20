
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