
// apps/web/src/features/backtester/test-logs/TestLogsPage.jsx
//
// Backtester Test Logs — Backtest accounts only.
//
// The account selector lives in the HeaderBar. We read the currently-
// selected account for THIS dashboard (the /backtester slot) via
// useDashboardAccount() and pass it down to the shared view.

import TradeLogsView from '@/shared/trade-logs/TradeLogsView';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';

// Informational — used for the empty-state message only. Actual
// type-based gating is performed by the HeaderBar.
const ALLOWED_TYPES = Object.freeze(['Backtest']);

export default function TestLogsPage() {
  const { accountId } = useDashboardAccount();

  return (
    <TradeLogsView
      accountId={accountId}
      allowedTypes={ALLOWED_TYPES}
      eyebrow="Backtester"
      title="Test Logs"
      subtitle="Browse, search, and manage every trade in your Backtest accounts"
      noAccountsTitle="No Backtest accounts"
      noAccountsMessage="Test Logs only track Backtest accounts. Create one in Manage → Accounts to get started."
    />
  );
}