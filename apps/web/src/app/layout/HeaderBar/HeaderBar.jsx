// apps/web/src/app/layout/HeaderBar/HeaderBar.jsx
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
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
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
  const { dispatch } = useAppContext();
  const { user } = useAuth();
  const { data: accountsData } = useAccounts();

  // Stable reference even when accountsData is undefined — silences
  // the pre-existing react-hooks/exhaustive-deps warning here.
  const accounts = useMemo(() => accountsData ?? [], [accountsData]);

  // Route-aware account selection.
  //   dashboardType     — 'journal' | 'backtester' | 'other'
  //   allowedTypes      — ['Live','Demo'] | ['Backtest'] | null
  //   showAccountSelect — false on /manage/*, /personal/*
  //   accountId         — currently selected account for this dashboard
  //   setAccountId      — dispatches to the correct per-dashboard slot
  const {
    allowedTypes,
    showAccountSelect,
    accountId,
    setAccountId,
  } = useDashboardAccount();

  /* ---- Bridge accounts into AppProvider ---- */
  useEffect(() => {
    if (accountsData) {
      dispatch({ type: 'SET_ACCOUNTS', payload: accountsData });
    }
  }, [accountsData, dispatch]);

  /* ---- Accounts filtered by dashboard type ---- */
  const filteredAccounts = useMemo(() => {
    if (!allowedTypes) return accounts;
    return accounts.filter((a) => allowedTypes.includes(a.type || 'Backtest'));
  }, [accounts, allowedTypes]);

  /* ---- Auto-select first valid account; clear the slot if none ---- */
  useEffect(() => {
    if (!showAccountSelect) return;

    // No accounts of the required type → clear the mirror so the
    // dashboard renders its empty state instead of leaking a
    // wrong-type account into useStats / useFilters.
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
    setAccountId(id);
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

      {/* Account selector — only rendered on /journal/* and /backtester/* */}
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