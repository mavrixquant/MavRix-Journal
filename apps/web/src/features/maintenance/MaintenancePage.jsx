// ============================================================================
// Full-page maintenance screen.
//
// FIXED 2026-11-15 (round 2):
//   • Logo is no longer a link. During maintenance "/" is blocked, so a
//     <Link to="/"> would bounce the user right back to /maintenance — the
//     worst kind of infinite loop for a page called "maintenance".
//   • "Back to landing page" replaced with "Admin login". The only way a
//     logged-out superadmin can reach the login form now that "/" is
//     blocked. Regular users can click it too; they will just log in and
//     land back on /maintenance because they are not superadmin.
// ============================================================================

import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, RefreshCw, LogIn } from 'lucide-react';

import navLogo from '@/assets/navLOGO.png';
import { useSystemStatus } from '@/shared/api/systemStatus';

import './MaintenancePage.css';

export default function MaintenancePage() {
  const { data, refetch, isFetching } = useSystemStatus();
  const [now, setNow] = useState(() => Date.now());

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

  return (
    <div className="mx-root" role="status" aria-live="polite">
      <span className="mx-orb a" aria-hidden />
      <span className="mx-orb b" aria-hidden />

      <div className="mx-card">
        {/* No Link — landing is blocked during maintenance. */}
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
                ? lastChecked < 2
                  ? 'just now'
                  : `${lastChecked}s ago`
                : 'polling…'}
            </b>
          </div>
          <div className="mx-cell">
            <span>Support</span>
            <b><a href="mailto:support@mavrix.trade">support@mavrix.trade</a></b>
          </div>
        </div>

        <div className="mx-actions">
          <button
            type="button"
            className="mx-btn is-primary"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={13} className={isFetching ? 'mx-spin' : ''} />
            {isFetching ? 'Checking…' : 'Check again'}
          </button>
          <Link to="/login" className="mx-btn">
            <LogIn size={13} />
            Admin login
          </Link>
        </div>

        <div className="mx-foot">
          The application automatically recovers when the maintenance window ends.
          You don&apos;t need to refresh this page.
        </div>
      </div>
    </div>
  );
}