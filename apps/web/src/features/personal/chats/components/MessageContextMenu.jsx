
import { useEffect, useRef } from 'react';
import { CornerUpLeft, Pencil, Trash2, Copy } from 'lucide-react';

import Portal from '@/shared/components/Portal';
import { useFocusTrap } from '../hooks/useFocusTrap';

const MENU_WIDTH = 216;
const MENU_ITEM_H = 38;
const MENU_PAD_V = 12;
const VIEWPORT_PAD = 8;

export default function MessageContextMenu({
  x,
  y,
  canReply = true,
  canCopy = true,
  canEdit,
  canDeleteAll,
  onReply,
  onCopy,
  onEdit,
  onDeleteMe,
  onDeleteAll,
  onClose,
}) {
  const menuRef = useRef(null);
  const trapRef = useFocusTrap({ active: true, onEscape: onClose });

  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const onViewport = () => onClose();

    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onViewport, true);
    window.addEventListener('resize', onViewport);

    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onViewport, true);
      window.removeEventListener('resize', onViewport);
    };
  }, [onClose]);

  const itemCount =
    (canReply ? 1 : 0) +
    (canCopy ? 1 : 0) +
    (canEdit ? 1 : 0) +
    1 +
    (canDeleteAll ? 1 : 0);
  const estimatedH = itemCount * MENU_ITEM_H + MENU_PAD_V;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;

  const left = Math.min(x, vw - MENU_WIDTH - VIEWPORT_PAD);
  const top = Math.min(y, vh - estimatedH - VIEWPORT_PAD);

  return (
    <Portal>
      <div
        ref={menuRef}
        className="chat-ctx-menu"
        style={{ left, top, width: MENU_WIDTH }}
      >
        <div ref={trapRef} role="menu" aria-orientation="vertical">
          {canReply && (
            <button
              type="button"
              role="menuitem"
              className="chat-ctx-item"
              onClick={onReply}
            >
              <CornerUpLeft size={15} />
              <span>Reply</span>
            </button>
          )}

          {canCopy && (
            <button
              type="button"
              role="menuitem"
              className="chat-ctx-item"
              onClick={onCopy}
            >
              <Copy size={15} />
              <span>Copy text</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              role="menuitem"
              className="chat-ctx-item"
              onClick={onEdit}
            >
              <Pencil size={15} />
              <span>Edit</span>
            </button>
          )}

          <div className="chat-ctx-sep" role="separator" />

          <button
            type="button"
            role="menuitem"
            className="chat-ctx-item"
            onClick={onDeleteMe}
          >
            <Trash2 size={15} />
            <span>Delete for me</span>
          </button>

          {canDeleteAll && (
            <button
              type="button"
              role="menuitem"
              className="chat-ctx-item is-danger"
              onClick={onDeleteAll}
            >
              <Trash2 size={15} />
              <span>Delete for everyone</span>
            </button>
          )}
        </div>
      </div>
    </Portal>
  );
}

