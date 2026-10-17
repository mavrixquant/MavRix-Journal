// apps/web/src/features/personal/chats/components/SidebarSkeleton.jsx
//
// Shimmering placeholder rows shown while the conversation list is loading.
// Styles live in ChatsShell.css (.chat-skel-*).

export default function SidebarSkeleton({ rows = 6 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="chat-skel-row">
          <div className="chat-skel-avatar" />
          <div className="chat-skel-body">
            <div className="chat-skel-line" style={{ width: '60%' }} />
            <div className="chat-skel-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}