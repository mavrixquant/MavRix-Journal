// apps/web/src/features/personal/chats/components/ScrollToBottom.jsx
import { ArrowDown } from 'lucide-react';

export default function ScrollToBottom({ visible, unread = 0, onClick }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      className="scroll-to-bottom"
      onClick={onClick}
      aria-label="Scroll to latest messages"
    >
      <ArrowDown size={14} />
      {unread > 0 && (
        <span className="scroll-to-bottom-count">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}