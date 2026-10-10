// apps/web/src/app/layout/HeaderBar/HeaderBar.jsx
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu as MenuIcon,
  LogOut,
  Palette,
  Settings,
  FileText,
  Shield,
} from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { useAppContext } from '@/app/providers/AppProvider';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { useAccounts } from '@/shared/api/accounts';
import { AccountSelect } from './AccountSelect';
import { IconButton, HBTooltip } from './IconButton';
import { usePageHeaderContext } from '../PageHeaderProvider';

import './HeaderBar.css';

export const HEADER_HEIGHT = 68;

/* ------------------------------------------------------------------ */
/*  Page title block — driven by PageHeaderContext                     */
/*                                                                    */
/*  Renders the current route's title (published via usePageHeader),   */
/*  with an optional status badge and an optional subtitle line.       */
/*  Falls back to "MavRix Journal" when no page has published one.     */
/* ------------------------------------------------------------------ */
function PageTitleBlock() {
  const { config } = usePageHeaderContext();

  const title = config?.title || 'MavRix Journal';
  const badge = config?.badge;
  const badgeVariant = config?.badgeVariant || 'is-default';
  const subtitle = config?.subtitle;

  return (
    <div className="hb-page-title-block">
      <div className="hb-page-title-row">
        <h1 className="hb-page-title" title={title}>
          {title}
        </h1>
        {badge && (
          <span className={`hb-page-badge ${badgeVariant}`}>
            {badge}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="hb-page-sub" title={subtitle}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function HeaderBar({
  onMobileMenuClick,
  onAccountClick,
  onLogout,
}) {
  const { dispatch } = useAppContext();
  const { user } = useAuth();
  const { data: accountsData } = useAccounts();

  const accounts = useMemo(() => accountsData ?? [], [accountsData]);

  const {
    allowedTypes,
    showAccountSelect,
    accountId,
    setAccountId,
  } = useDashboardAccount();

  useEffect(() => {
    if (accountsData) {
      dispatch({ type: 'SET_ACCOUNTS', payload: accountsData });
    }
  }, [accountsData, dispatch]);

  const filteredAccounts = useMemo(() => {
    if (!allowedTypes) return accounts;
    return accounts.filter((a) => allowedTypes.includes(a.type || 'Backtest'));
  }, [accounts, allowedTypes]);

  useEffect(() => {
    if (!showAccountSelect) return;

    if (filteredAccounts.length === 0) {
      if (accountId !== null) {
        setAccountId(null);
      }
      return;
    }

    const currentValid = filteredAccounts.some((a) => a.id === accountId);
    if (!currentValid) {
      setAccountId(filteredAccounts[0].id);
    }
  }, [filteredAccounts, accountId, showAccountSelect, setAccountId]);

  const displayName = useMemo(() => {
    if (!user) return 'User';
    const fromParts = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return (
      (typeof user.displayName === 'string' && user.displayName.trim()) ||
      fromParts ||
      user.email ||
      'User'
    );
  }, [user]);

  const initials = useMemo(() => {
    const m = displayName.match(/\b[A-Za-z]/g) || [];
    return m.slice(0, 2).join('').toUpperCase() || 'U';
  }, [displayName]);

  const handleAccountChange = (id) => {
    setAccountId(id);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <header className="hb-root">
      <button
        type="button"
        className="hb-mobile-menu"
        onClick={onMobileMenuClick}
        aria-label="Open navigation"
      >
        <MenuIcon size={16} />
      </button>

      <PageTitleBlock />

      {showAccountSelect && (
        <div className="hb-account-root">
          <AccountSelect
            accounts={filteredAccounts}
            value={accountId}
            onChange={handleAccountChange}
          />
        </div>
      )}

      <div className="hb-spacer" />

      <div className="hb-right">
        {isAdmin && (
          <HBTooltip label="Admin panel">
            <Link
              to="/admin"
              className="hb-icon-btn is-accent"
              aria-label="Admin panel"
            >
              <Shield size={16} />
            </Link>
          </HBTooltip>
        )}

        <IconButton
          icon={<Palette size={16} />}
          label="Theme"
          variant="accent"
        />
        <IconButton
          icon={<Settings size={16} />}
          label="Settings"
        />
        <IconButton
          icon={<FileText size={16} />}
          label="Report"
        />

        <span className="hb-divider" aria-hidden />

        <HBTooltip label={displayName}>
          <button
            type="button"
            className="hb-user-pill"
            onClick={onAccountClick}
            aria-label="Account settings"
          >
            <span className="hb-user-avatar">{initials}</span>
            <span className="hb-user-name">{displayName}</span>
          </button>
        </HBTooltip>

        <IconButton
          icon={<LogOut size={16} />}
          label="Logout"
          onClick={onLogout}
          variant="danger"
        />
      </div>
    </header>
  );
}