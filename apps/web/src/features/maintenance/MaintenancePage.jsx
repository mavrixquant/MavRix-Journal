import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wrench, ArrowLeft, LogOut } from 'lucide-react';

import navLogo from '@/assets/navLOGO.png';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSystemStatus } from '@/shared/api/systemStatus';

import './MaintenancePage.css';

export default function MaintenancePage() {
  const { data } = useSystemStatus();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const message = useMemo(
    () =>
      (data?.maintenanceMessage && String(data.maintenanceMessage).trim()) ||
      'We are performing scheduled maintenance. Everything will be back shortly.',
    [data?.maintenanceMessage]
  );

  const lastChecked = data?.ts
    ? Math.max(0, Math.floor((now - data.ts) / 1000))
    : null;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      /* ignore, we still leave the page */
    } finally {
      navigate('/', { replace: true });
    }
  }

  return (
    <div className="mx-root" role="status" aria-live="polite">
      <span className="mx-orb a" aria-hidden />
      <span className="mx-orb b" aria-hidden />

      <div className="mx-card">
        <div className="mx-logo">
          <img src={navLogo} alt="MavRix Journal" />
        </div>

        <div className="mx-icon" aria-hidden>
          <Wrench size={32} strokeWidth={1.8} />
        </div>

        <div className="mx-badge">
          <span className="mx-pulse" />
          Maintenance in progress
        </div>

        <h1 className="mx-title">
          We&apos;ll be <span>right back</span>.
        </h1>

        <p className="mx-message">{message}</p>

        <div className="mx-grid">
          <div className="mx-cell">
            <span>Status</span>
            <b className="is-live">Live</b>
          </div>
          <div className="mx-cell">
            <span>Auto-check</span>
            <b>
              {lastChecked != null
                ? lastChecked < 2 ? 'just now' : `${lastChecked}s ago`
                : 'polling…'}
            </b>
          </div>
          <div className="mx-cell">
            <span>Support</span>
            <b><a href="mailto:support@mavrix.trade">support@mavrix.trade</a></b>
          </div>
        </div>

        <div className="mx-actions">
          <Link to="/" className="mx-btn is-primary">
            <ArrowLeft size={13} />
            Back to landing page
          </Link>
          {user && (
            <button
              type="button"
              className="mx-btn"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut size={13} />
              {loggingOut ? 'Logging out…' : 'Logout'}
            </button>
          )}
        </div>

        <div className="mx-foot">
          The application automatically recovers when the maintenance window ends.
          You don&apos;t need to refresh this page.
        </div>
      </div>
    </div>
  );
}