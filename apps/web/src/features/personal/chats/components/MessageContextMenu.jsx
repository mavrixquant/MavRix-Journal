// apps/web/src/features/personal/chats/components/MessageContextMenu.jsx
//
// Floating action menu triggered by right-click (desktop) or long-press
// (mobile) on a chat message. Rendered via Portal, positioned at the
// cursor, viewport-corrected so it never clips off-screen.
//
// This is a PURE presentational component — it does NOT decide whether
// Edit or Delete-for-everyone are visible. The parent (MessageThread)
// computes `canEdit` and `canDeleteAll` and passes them in.
//
// Auto-closes on: outside mousedown, Escape, scroll (capture phase),
// window resize, or any menu item being clicked.

import { useEffect, useRef } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import Portal from '@/shared/components/Portal';

const MENU_WIDTH = 200;
const MENU_ITEM_H = 34;
const MENU_PAD_V = 8;
const VIEWPORT_PAD = 8;

export default function MessageContextMenu({
  x,
  y,
  canEdit,
  canDeleteAll,
  onEdit,
  onDeleteMe,
  onDeleteAll,
  onClose,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const onViewportChange = () => onClose();

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);

    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [onClose]);

  // ---- Viewport correction ----
  // Count how many items will render so we can estimate menu height.
  const itemCount = (canEdit ? 1 : 0) + 2 + (canDeleteAll ? 1 : 0);
  const estimatedH = itemCount * MENU_ITEM_H + MENU_PAD_V;

  const vw = typeof window !== 'undefined' ? window.innerWidth  : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;

  const left = Math.min(x, vw - MENU_WIDTH - VIEWPORT_PAD);
  const top  = Math.min(y, vh - estimatedH - VIEWPORT_PAD);

  return (
    <Portal>
      <div
        ref={menuRef}
        className="chat-ctx-menu"
        style={{ left, top, width: MENU_WIDTH }}
        role="menu"
        aria-orientation="vertical"
      >
        {canEdit && (
          <button
            type="button"
            role="menuitem"
            className="chat-ctx-item"
            onClick={onEdit}
          >
            <Pencil size={13} />
            <span>Edit</span>
          </button>
        )}

        <button
          type="button"
          role="menuitem"
          className="chat-ctx-item"
          onClick={onDeleteMe}
        >
          <Trash2 size={13} />
          <span>Delete for me</span>
        </button>

        {canDeleteAll && (
          <button
            type="button"
            role="menuitem"
            className="chat-ctx-item is-danger"
            onClick={onDeleteAll}
          >
            <Trash2 size={13} />
            <span>Delete for everyone</span>
          </button>
        )}
      </div>
    </Portal>
  );
}