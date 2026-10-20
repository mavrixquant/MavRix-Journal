
export default function SidebarSkeleton({ rows = 6 }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading conversations">
      {Array.from({ length: rows }).map((_, i) => {
        const wide = i % 2 === 0 ? '70%' : '55%';
        const narrow = i % 2 === 0 ? '38%' : '48%';
        return (
          <div key={i} className="chat-skel-row">
            <div className="chat-skel-avatar" aria-hidden />
            <div className="chat-skel-body">
              <div className="chat-skel-line" style={{ width: wide }} aria-hidden />
              <div className="chat-skel-line short" style={{ width: narrow }} aria-hidden />
            </div>
          </div>
        );
      })}
    </div>
  );
}