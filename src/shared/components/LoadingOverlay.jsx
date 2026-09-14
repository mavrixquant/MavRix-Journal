// src/components/common/LoadingOverlay.jsx
import Portal from './Portal';

export default function LoadingOverlay({ message = 'Uploading trades...' }) {
  return (
    <Portal>
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
        <p className="loading-message">{message}</p>
      </div>
    </Portal>
  );
}