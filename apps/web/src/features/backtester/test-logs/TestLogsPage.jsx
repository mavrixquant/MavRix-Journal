// apps/web/src/features/backtester/test-logs/TestLogsPage.jsx
//
// Backtester Test Logs — Backtest accounts only.
//
// Publishes the page title + subtitle to the GLOBAL header bar; the
// shared TradeLogsView is agnostic to title rendering.

import TradeLogsView from '@/shared/trade-logs/TradeLogsView';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

// Informational — used for the empty-state message only. Actual
// type-based gating is performed by the HeaderBar.
const ALLOWED_TYPES = Object.freeze(['Backtest']);

export default function TestLogsPage() {
  const { accountId } = useDashboardAccount();

  usePageHeader({
    title: 'Test Logs',
    subtitle: 'Browse, search, and manage every trade in your Backtest accounts',
  });

  return (
    <TradeLogsView
      accountId={accountId}
      allowedTypes={ALLOWED_TYPES}
      noAccountsTitle="No Backtest accounts"
      noAccountsMessage="Test Logs only track Backtest accounts. Create one in Manage → Accounts to get started."
    />
  );
}