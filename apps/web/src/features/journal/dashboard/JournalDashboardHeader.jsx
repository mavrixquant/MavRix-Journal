// apps/web/src/features/journal/dashboard/JournalDashboardHeader.jsx
//
// Journal-dashboard header.
//
// Title + account badge are published to the GLOBAL header bar via
// usePageHeader() so they render next to the account selector.
//
// The only on-page element left is a right-aligned "Customize" button that
// enters dashboard edit mode. It's disabled when the current account has no
// trades (nothing to lay out yet).
//
// Trade enrichment still happens HERE via useEnrichedTrades so the dashboard
// panels have data on first paint. The Analyse page uses the same hook, so
// both routes share one source of truth.

import { FaSlidersH } from 'react-icons/fa';

import { useAppContext } from '@/app/providers/AppProvider';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { useEnrichedTrades } from '@/features/dashboard/hooks/useEnrichedTrades';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

/* ------------------------------------------------------------------ */
/*  Header-local CSS.                                                  */
/* ------------------------------------------------------------------ */
const HDR_CSS = `
  .hdr-actions-row {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft2: rgba(245,158,11,.28);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --line-soft: rgba(255,255,255,.05);

    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 2px 0 16px;
    border-bottom: 1px solid var(--line-soft);
    margin-bottom: 20px;
  }

  /* ---------- Customize button ---------- */
  .hdr-customize {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.035);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .hdr-customize:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.06);
    box-shadow: 0 0 20px -6px rgba(245,158,11,.4);
    transform: translateY(-1px);
  }
  .hdr-customize:disabled {
    opacity: .4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  .hdr-customize:focus-visible {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.18);
  }

  @media (prefers-reduced-motion: reduce) {
    .hdr-customize { transition: none !important; }
  }
`;

export default function JournalDashboardHeader({ onCustomize }) {
  const { state } = useAppContext();
  const { accountId } = useDashboardAccount();

  // Enrich + dispatch on mount / account change. Returns the enriched payload
  // so we can gate the Customize button on "does this account have any trades".
  const enriched = useEnrichedTrades(accountId);

  const selectedAccount =
    state.accounts.find((acc) => acc.id === accountId) || null;

  const badgeVariant =
    selectedAccount?.type === 'Demo' ? 'is-demo' : 'is-live';

  const hasData = enriched.enrichedTrades.length > 0;

  // Publish title + badge to the global header bar. Values are primitives,
  // so the effect inside usePageHeader re-runs only when they change.
  usePageHeader({
    title: 'Dashboard',
    badge: selectedAccount?.type,
    badgeVariant,
  });

  return (
    <>
      <style>{HDR_CSS}</style>
      <div className="hdr-actions-row">
        <button
          type="button"
          className="hdr-customize"
          onClick={onCustomize}
          disabled={!hasData}
          title={
            hasData
              ? 'Customize dashboard'
              : 'Add trades to this account first to customize the layout'
          }
        >
          <FaSlidersH size={12} />
          Customize
        </button>
      </div>
    </>
  );
}