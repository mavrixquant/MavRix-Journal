// apps/web/src/app/shell/HeaderBar.jsx
import { useEffect, useMemo } from 'react';
import {
  Menu as MenuIcon,
  Wallet,
  LogOut,
  Palette,
  Settings,
  FileText,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Tooltip as TooltipPrimitive, Select as SelectPrimitive } from 'radix-ui';

import { useAuth } from '@/app/providers/AuthProvider';
import { useAppContext } from '@/app/providers/AppProvider';
import { useAccounts } from '@/services/accounts.service';

export const HEADER_HEIGHT = 64;

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                         */
/* ------------------------------------------------------------------ */
const HB_CSS = `
  .hb-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --danger: #ef4444;
    --danger-2: #f87171;

    position: sticky;
    top: 0;
    z-index: 30;
    height: ${HEADER_HEIGHT}px;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 20px;

    background: linear-gradient(180deg, #0F121A 0%, #0C0F15 100%);
    border-bottom: 1px solid var(--line);

    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    color: var(--ink-1);
    -webkit-font-smoothing: antialiased;
  }

  /* ---------- Mobile hamburger ---------- */
  .hb-mobile-menu {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
    outline: none;
    transition: color .16s ease, background-color .16s ease;
  }
  .hb-mobile-menu:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
  }
  .hb-mobile-menu:active { background: rgba(255,255,255,.10); }
  @media (min-width: 1024px) {
    .hb-mobile-menu { display: none; }
  }

  /* ---------- Brand title ---------- */
  .hb-title {
    margin: 0;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -.03em;
    color: #F5F6F8;
    line-height: 1;
    white-space: nowrap;
    flex-shrink: 0;
    position: relative;
    padding-right: 18px;
    opacity: 1;
    transition: opacity .22s ease;
  }
  .hb-title::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 1px;
    height: 22px;
    background: linear-gradient(180deg, transparent, rgba(255,255,255,.14), transparent);
  }
  .hb-title.is-hidden { display: none; }
  @media (max-width: 1023px) {
    .hb-title.is-hidden { display: block; }
  }

  /* ---------- Account selector (Radix Select) ---------- */
  .hb-account-root {
    position: relative;
    min-width: 240px;
    max-width: 340px;
    flex-shrink: 1;
  }

  .hb-account-trigger {
    position: relative;
    width: 100%;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 6px 32px 6px 13px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,.06);
    background: linear-gradient(180deg, rgba(20,25,35,.6), rgba(12,16,23,.6));
    color: var(--ink-1);
    cursor: pointer;
    outline: none;
    text-align: left;
    font: inherit;
    transition:
      border-color .16s ease,
      background-color .16s ease,
      box-shadow .16s ease;
    overflow: hidden;
  }
  .hb-account-trigger:hover {
    border-color: rgba(255,255,255,.14);
    background-color: rgba(20,25,35,.9);
  }
  .hb-account-trigger[data-state="open"] {
    border-color: rgba(245,158,11,.45);
    background-color: rgba(20,25,35,.95);
    box-shadow: 0 0 0 3px rgba(245,158,11,.12);
  }
  .hb-account-trigger:focus-visible {
    border-color: rgba(245,158,11,.45);
    box-shadow: 0 0 0 3px rgba(245,158,11,.14);
  }
  .hb-account-trigger[data-disabled] {
    opacity: .5;
    cursor: not-allowed;
  }

  .hb-account-icon {
    color: var(--accent);
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .hb-account-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
    overflow: hidden;
  }
  .hb-account-eyebrow {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: .16em;
    text-transform: uppercase;
    color: var(--ink-3);
    line-height: 1;
  }
  .hb-account-name {
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.01em;
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .hb-account-chevron {
    position: absolute;
    right: 11px;
    top: 50%;
    color: var(--ink-3);
    pointer-events: none;
    transform: translateY(-50%);
    transition: transform .18s ease, color .16s ease;
  }
  .hb-account-trigger:hover .hb-account-chevron {
    color: var(--ink-2);
  }
  .hb-account-trigger[data-state="open"] .hb-account-chevron {
    color: var(--accent);
    transform: translateY(-50%) rotate(180deg);
  }

  /* ---------- Spacer ---------- */
  .hb-spacer { flex: 1; min-width: 8px; }

  /* ---------- Right cluster ---------- */
  .hb-right {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  /* ---------- Modern icon button ---------- */
  .hb-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
    outline: none;
    flex-shrink: 0;
    transition: color .16s ease, background-color .16s ease;
  }
  .hb-icon-btn:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
  }
  .hb-icon-btn:active {
    background: rgba(255,255,255,.10);
  }
  .hb-icon-btn:focus-visible {
    border-color: rgba(245,158,11,.5);
    box-shadow: 0 0 0 3px rgba(245,158,11,.14);
  }
  .hb-icon-btn svg {
    flex-shrink: 0;
    transition: transform .16s ease, color .16s ease;
  }
  .hb-icon-btn:hover svg {
    transform: scale(1.04);
  }

  .hb-icon-btn.is-accent:hover {
    color: var(--accent);
    background: rgba(245,158,11,.08);
  }
  .hb-icon-btn.is-accent:active {
    background: rgba(245,158,11,.14);
  }
  .hb-icon-btn.is-accent:focus-visible {
    border-color: rgba(245,158,11,.55);
    box-shadow: 0 0 0 3px rgba(245,158,11,.16);
  }

  .hb-icon-btn.is-danger {
    color: var(--ink-2);
  }
  .hb-icon-btn.is-danger:hover {
    color: var(--danger-2);
    background: rgba(239,68,68,.08);
  }
  .hb-icon-btn.is-danger:active {
    background: rgba(239,68,68,.14);
  }
  .hb-icon-btn.is-danger:focus-visible {
    border-color: rgba(239,68,68,.55);
    box-shadow: 0 0 0 3px rgba(239,68,68,.18);
  }

  /* ---------- Separator ---------- */
  .hb-divider {
    display: inline-block;
    width: 1px;
    height: 20px;
    margin: 0 6px;
    background: linear-gradient(180deg, transparent, rgba(255,255,255,.12), transparent);
    flex-shrink: 0;
  }

  /* ---------- User pill ---------- */
  .hb-user-pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    height: 40px;
    padding: 0 14px 0 4px;
    border-radius: 999px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink-1);
    cursor: pointer;
    outline: none;
    max-width: 220px;
    transition: background-color .16s ease;
  }
  .hb-user-pill:hover {
    background: rgba(255,255,255,.06);
  }
  .hb-user-pill:active {
    background: rgba(255,255,255,.10);
  }
  .hb-user-pill:focus-visible {
    border-color: rgba(245,158,11,.5);
    box-shadow: 0 0 0 3px rgba(245,158,11,.14);
  }

  .hb-user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(245,158,11,.22), rgba(245,158,11,.06));
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: .02em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .hb-user-name {
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink-1);
    letter-spacing: -.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 140px;
  }

  /* ---------- Custom tooltip ---------- */
  .hb-tip {
    z-index: 9999;
    padding: 6px 10px;
    border-radius: 7px;
    background: #0C0F15;
    border: 1px solid rgba(255,255,255,.10);
    color: var(--ink-1);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .06em;
    text-transform: uppercase;
    white-space: nowrap;
    box-shadow:
      0 10px 26px -10px rgba(0,0,0,.85),
      0 0 0 1px rgba(0,0,0,.5);
    animation: hbTipIn .14s cubic-bezier(.2,.8,.25,1);
    user-select: none;
  }
  @keyframes hbTipIn {
    from { opacity: 0; transform: translateY(-2px) scale(.98); }
    to   { opacity: 1; transform: translateY(0)   scale(1); }
  }

  /* ---------- Custom Select dropdown panel ---------- */
  .hb-select-content {
    z-index: 9999;
    min-width: var(--radix-select-trigger-width);
    max-width: 420px;
    max-height: min(420px, var(--radix-select-content-available-height));
    overflow: hidden;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,.08);
    background: linear-gradient(180deg, #12161F 0%, #0C1017 100%);
    box-shadow:
      0 24px 60px -20px rgba(0,0,0,.95),
      0 0 0 1px rgba(245,158,11,.06),
      inset 0 1px 0 rgba(255,255,255,.03);
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    animation: hbSelectIn .16s cubic-bezier(.2,.8,.25,1);
    transform-origin: var(--radix-select-content-transform-origin);
  }
  @keyframes hbSelectIn {
    from { opacity: 0; transform: translateY(-4px) scale(.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }

  /* Small header inside the panel */
  .hb-select-header {
    padding: 10px 14px 8px;
    border-bottom: 1px solid rgba(255,255,255,.05);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .hb-select-header-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .16em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .hb-select-header-count {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 600;
    color: var(--ink-3);
    letter-spacing: .04em;
  }

  .hb-select-viewport {
    padding: 6px;
    overflow-y: auto;
    max-height: 340px;
  }
  .hb-select-viewport::-webkit-scrollbar { width: 6px; }
  .hb-select-viewport::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  .hb-select-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 12px 9px 10px;
    border-radius: 10px;
    border: 1px solid transparent;
    cursor: pointer;
    outline: none;
    user-select: none;
    transition:
      background-color .12s ease,
      border-color .12s ease;
  }
  .hb-select-item[data-highlighted] {
    background: rgba(255,255,255,.05);
  }
  .hb-select-item[data-state="checked"] {
    background: rgba(245,158,11,.06);
    border-color: rgba(245,158,11,.20);
  }
  .hb-select-item[data-state="checked"][data-highlighted] {
    background: rgba(245,158,11,.10);
    border-color: rgba(245,158,11,.32);
  }

  .hb-select-item-icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.06);
    color: var(--ink-2);
    flex-shrink: 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .02em;
    transition: all .12s ease;
  }
  .hb-select-item[data-state="checked"] .hb-select-item-icon {
    background: rgba(245,158,11,.12);
    border-color: rgba(245,158,11,.32);
    color: var(--accent);
  }

  .hb-select-item-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    flex: 1;
    overflow: hidden;
  }
  .hb-select-item-name {
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-1);
    letter-spacing: -.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }
  .hb-select-item[data-state="checked"] .hb-select-item-name {
    color: #FFFFFF;
    font-weight: 700;
  }

  .hb-select-item-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    color: var(--ink-3);
    letter-spacing: .02em;
  }
  .hb-select-item-type {
    display: inline-flex;
    align-items: center;
    padding: 1px 7px;
    border-radius: 99px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    font-size: 9px;
    border: 1px solid;
  }
  .hb-select-item-type.is-live {
    color: #4ade80;
    background: rgba(74,222,128,.08);
    border-color: rgba(74,222,128,.28);
  }
  .hb-select-item-type.is-demo {
    color: var(--accent);
    background: rgba(245,158,11,.08);
    border-color: rgba(245,158,11,.28);
  }
  .hb-select-item-type.is-backtest {
    color: #60a5fa;
    background: rgba(96,165,250,.08);
    border-color: rgba(96,165,250,.28);
  }

  .hb-select-item-check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: var(--accent);
    opacity: 0;
    transition: opacity .14s ease;
  }
  .hb-select-item[data-state="checked"] .hb-select-item-check {
    opacity: 1;
  }

  /* Empty state */
  .hb-select-empty {
    padding: 24px 16px;
    text-align: center;
    color: var(--ink-3);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    letter-spacing: .02em;
  }

  /* ---------- Animations / reduced motion ---------- */
  @media (prefers-reduced-motion: reduce) {
    .hb-mobile-menu, .hb-account-trigger, .hb-account-chevron,
    .hb-icon-btn, .hb-icon-btn svg,
    .hb-user-pill, .hb-title { transition: none !important; }
    .hb-tip, .hb-select-content { animation: none !important; }
  }

  /* ---------- Mobile ---------- */
  @media (max-width: 640px) {
    .hb-root { padding: 0 12px; gap: 10px; }
    .hb-title { font-size: 16px; padding-right: 12px; }
    .hb-account-root { min-width: 0; flex: 1; max-width: none; }
    .hb-divider { margin: 0 3px; }
    .hb-icon-btn { width: 34px; height: 34px; }
    .hb-user-name { display: none; }
    .hb-user-pill { padding: 0 6px 0 4px; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function accountTypeClass(type) {
  if (type === 'Live') return 'is-live';
  if (type === 'Demo') return 'is-demo';
  return 'is-backtest';
}

function accountInitials(name) {
  if (!name) return 'AC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ------------------------------------------------------------------ */
/*  HBTooltip                                                          */
/* ------------------------------------------------------------------ */
function HBTooltip({ label, children }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="bottom"
          align="center"
          sideOffset={8}
          className="hb-tip"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  IconButton                                                         */
/* ------------------------------------------------------------------ */
function IconButton({ icon, label, onClick, variant }) {
  const variantClass =
    variant === 'danger' ? ' is-danger'
    : variant === 'accent' ? ' is-accent'
    : '';

  return (
    <HBTooltip label={label}>
      <button
        type="button"
        className={`hb-icon-btn${variantClass}`}
        onClick={onClick}
        aria-label={label}
      >
        {icon}
      </button>
    </HBTooltip>
  );
}

/* ------------------------------------------------------------------ */
/*  AccountSelect — custom Radix Select                                */
/* ------------------------------------------------------------------ */
function AccountSelect({ accounts, value, onChange }) {
  const selected = accounts.find((a) => a.id === value) || null;

  return (
    <SelectPrimitive.Root
      value={value || undefined}
      onValueChange={onChange}
      disabled={accounts.length === 0}
    >
      <SelectPrimitive.Trigger
        className="hb-account-trigger"
        aria-label="Select trading account"
      >
        <span className="hb-account-icon" aria-hidden>
          <Wallet size={15} />
        </span>

        <span className="hb-account-text">
          <span className="hb-account-eyebrow">Active Account</span>
          <SelectPrimitive.Value placeholder="No accounts">
            <span className="hb-account-name">
              {selected ? selected.name : 'No accounts'}
            </span>
          </SelectPrimitive.Value>
        </span>

        <SelectPrimitive.Icon asChild>
          <ChevronDown className="hb-account-chevron" size={14} aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="hb-select-content"
          position="popper"
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
        >
          {/* Small header with count */}
          <div className="hb-select-header">
            <span className="hb-select-header-label">Switch Account</span>
            <span className="hb-select-header-count">
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
            </span>
          </div>

          <SelectPrimitive.Viewport className="hb-select-viewport">
            {accounts.length === 0 ? (
              <div className="hb-select-empty">No accounts yet</div>
            ) : (
              accounts.map((acc) => (
                <SelectPrimitive.Item
                  key={acc.id}
                  value={acc.id}
                  className="hb-select-item"
                >
                  <span className="hb-select-item-icon" aria-hidden>
                    {accountInitials(acc.name)}
                  </span>

                  <span className="hb-select-item-body">
                    <SelectPrimitive.ItemText>
                      <span className="hb-select-item-name">{acc.name}</span>
                    </SelectPrimitive.ItemText>
                    <span className="hb-select-item-meta">
                      <span
                        className={`hb-select-item-type ${accountTypeClass(acc.type)}`}
                      >
                        {acc.type || 'Backtest'}
                      </span>
                      <span>{acc.currency || 'USD'}</span>
                    </span>
                  </span>

                  <span className="hb-select-item-check" aria-hidden>
                    <Check size={14} strokeWidth={3} />
                  </span>
                </SelectPrimitive.Item>
              ))
            )}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  HeaderBar                                                          */
/* ------------------------------------------------------------------ */
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
    <>
      <style>{HB_CSS}</style>
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
    </>
  );
}