// src/components/common/Alert.jsx
import Portal from './Portal';
import { useEffect, useRef } from 'react';

export default function Alert({
  isOpen,
  title,
  message,
  type = 'confirm', // 'confirm', 'success', 'error'
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  showCancel = true,
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  // Determine button colors
  const confirmColor = type === 'error' ? 'var(--loss)' : type === 'success' ? 'var(--win)' : 'var(--amber)';

  return (
    <Portal>
      <div className="alert-overlay" onClick={(e) => {
        // Only close if clicking outside the alert content and type is not 'confirm'?
        // For confirm we require explicit click.
        if (e.target === e.currentTarget && type !== 'confirm') {
          if (onCancel) onCancel();
        }
      }}>
        <div className="alert-box">
          {title && <h3 className="alert-title">{title}</h3>}
          <p className="alert-message">{message}</p>
          <div className="alert-actions">
            {showCancel && (
              <button className="alert-btn alert-btn-cancel" onClick={handleCancel}>
                {cancelText}
              </button>
            )}
            <button
              className="alert-btn alert-btn-confirm"
              style={{ backgroundColor: confirmColor }}
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}