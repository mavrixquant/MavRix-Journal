
// apps/web/src/features/journal/trade-logs/TradeLogsPage.jsx
//
// Journal Trade Logs — Live & Demo accounts only.
//
// The account selector lives in the HeaderBar. We read the currently-
// selected account for THIS dashboard (the /journal slot) via
// useDashboardAccount() and pass it down to the shared view.

import TradeLogsView from '@/shared/trade-logs/TradeLogsView';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';

// Informational — used for the empty-state message only. Actual
// type-based gating is performed by the HeaderBar.
const ALLOWED_TYPES = Object.freeze(['Live', 'Demo']);

export default function TradeLogsPage() {
  const { accountId } = useDashboardAccount();

  return (
    <TradeLogsView
      accountId={accountId}
      allowedTypes={ALLOWED_TYPES}
      eyebrow="Journal"
      title="Trade Logs"
      subtitle="Browse, search, and manage every trade in your Live and Demo accounts"
      noAccountsTitle="No Live or Demo accounts"
      noAccountsMessage="Trade Logs only track Live and Demo accounts. Create one in Manage → Accounts to get started."
    />
  );
}