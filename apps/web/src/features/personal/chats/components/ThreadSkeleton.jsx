// apps/web/src/features/personal/chats/components/ThreadSkeleton.jsx
export default function ThreadSkeleton({ rows = 6 }) {
  return (
    <div className="thread-skeleton">
      {Array.from({ length: rows }).map((_, i) => {
        const isOwn = i % 3 === 1;
        return (
          <div key={i} className={`thread-skel-row${isOwn ? ' is-own' : ''}`}>
            {!isOwn && <div className="thread-skel-avatar" />}
            <div className="thread-skel-bubble" />
          </div>
        );
      })}
    </div>
  );
}