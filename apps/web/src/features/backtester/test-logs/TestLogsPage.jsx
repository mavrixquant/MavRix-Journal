
// apps/web/src/features/backtester/test-logs/TestLogsPage.jsx
//
// Backtester Test Logs — Backtest accounts only.
// Shares the entire trade-logs UI with Journal Trade Logs via
// @/shared/trade-logs/TradeLogsView.

import TradeLogsView from '@/shared/trade-logs/TradeLogsView';

// Module-level constant — stable reference across renders.
const ALLOWED_TYPES = Object.freeze(['Backtest']);

export default function TestLogsPage() {
  return (
    <TradeLogsView
      allowedTypes={ALLOWED_TYPES}
      eyebrow="Backtester"
      title="Test Logs"
      subtitle="Browse, search, and manage every trade in your Backtest accounts"
      noAccountsTitle="No Backtest accounts"
      noAccountsMessage="Test Logs only track Backtest accounts. Create one in Manage → Accounts to get started."
    />
  );
}