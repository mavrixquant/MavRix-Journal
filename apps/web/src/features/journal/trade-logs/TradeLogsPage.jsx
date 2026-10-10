// apps/web/src/features/journal/trade-logs/TradeLogsPage.jsx
//
// Journal Trade Logs — Live & Demo accounts only.
//
// This page:
//   - reads the current Journal-side account from the header slot
//   - publishes the page title + subtitle to the GLOBAL header bar
//   - mounts the shared <TradeLogsView /> with the props it needs
//
// Note: TradeLogsView lives under shared/ and cannot import
// PageHeaderProvider (boundary rule). Title publishing therefore lives
// here in the feature page.

import TradeLogsView from '@/shared/trade-logs/TradeLogsView';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

// Informational — used for the empty-state message only. Actual
// type-based gating is performed by the HeaderBar.
const ALLOWED_TYPES = Object.freeze(['Live', 'Demo']);

export default function TradeLogsPage() {
  const { accountId } = useDashboardAccount();

  usePageHeader({
    title: 'Trade Logs',
    subtitle: 'Browse, search, and manage every trade in your Live and Demo accounts',
  });

  return (
    <TradeLogsView
      accountId={accountId}
      allowedTypes={ALLOWED_TYPES}
      noAccountsTitle="No Live or Demo accounts"
      noAccountsMessage="Trade Logs only track Live and Demo accounts. Create one in Manage → Accounts to get started."
    />
  );
}