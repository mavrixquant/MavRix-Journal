// apps/web/src/app/shell/HeaderBar.jsx
import { useEffect, useMemo } from 'react';
import {
  Menu as MenuIcon,
  LogOut,
  Palette,
  Settings,
  FileText,
} from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { useAppContext } from '@/app/providers/AppProvider';
import { useAccounts } from '@/shared/api/accounts';
import { AccountSelect } from './AccountSelect';
import { IconButton, HBTooltip } from './IconButton';

import './HeaderBar.css';

export const HEADER_HEIGHT = 64;

export default function HeaderBar({
  collapsed,
  onMobileMenuClick,
  onAccountClick,
  onLogout,
}) {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const { data: accountsData } = useAccounts();
  const accounts = accountsData ?? [];

  /* ---- Bridge accounts into AppProvider ---- */
  useEffect(() => {
    if (accountsData) {
      dispatch({ type: 'SET_ACCOUNTS', payload: accountsData });
    }
  }, [accountsData, dispatch]);

  /* ---- Auto-select first account if none selected ---- */
  useEffect(() => {
    if (accounts.length > 0 && !state.selectedAccountId) {
      dispatch({ type: 'SET_SELECTED_ACCOUNT_ID', payload: accounts[0].id });
    }
  }, [accounts, state.selectedAccountId, dispatch]);

  /* ---- Derived display name + initials ---- */
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

  /* Title hidden when the desktop sidebar is expanded */
  const titleHidden = collapsed === false;

  const handleAccountChange = (id) => {
    dispatch({ type: 'SET_SELECTED_ACCOUNT_ID', payload: id });
  };

  return (
    <header className="hb-root">
      {/* Mobile-only hamburger */}
      <button
        type="button"
        className="hb-mobile-menu"
        onClick={onMobileMenuClick}
        aria-label="Open navigation"
      >
        <MenuIcon size={16} />
      </button>

      {/* Brand title */}
      <h1 className={`hb-title${titleHidden ? ' is-hidden' : ''}`}>
        MavRix Journal
      </h1>

      {/* Account selector */}
      <div className="hb-account-root">
        <AccountSelect
          accounts={accounts}
          value={state.selectedAccountId}
          onChange={handleAccountChange}
        />
      </div>

      <div className="hb-spacer" />

      {/* Right cluster */}
      <div className="hb-right">
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