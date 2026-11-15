import { AlertTriangle, Siren, X, Bell } from 'lucide-react';
import './TopStrip.css';

export default function TopStrip({ banner, dismissed, onDismiss }) {
  const level = banner?.level || 'info';
  const IconComponent =
    level === 'critical' ? Siren : level === 'warning' ? AlertTriangle : Bell;

  return (
    <>
      <div className="app-top-strip" aria-hidden />
      {banner && banner.message && !dismissed && (
        <aside
          className={`app-announcement-banner is-${level}`}
          role="alert"
          aria-label="System announcement"
        >
          <div className="aab-inner">
            <span className="aab-icon-wrap" aria-hidden>
              <IconComponent size={14} className="aab-icon" />
            </span>

            <span className="aab-tag">{level.toUpperCase()}</span>

            <span className="aab-message">{banner.message}</span>

            <button
              type="button"
              className="aab-dismiss"
              onClick={onDismiss}
              aria-label="Dismiss announcement"
              title="Dismiss announcement"
            >
              <X size={13} />
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
