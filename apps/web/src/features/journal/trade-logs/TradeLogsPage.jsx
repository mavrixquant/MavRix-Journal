
// apps/web/src/features/journal/trade-logs/TradeLogsPage.jsx
//
// Journal Trade Logs — Live & Demo accounts only.
// All rendering logic lives in the shared TradeLogsView.

import TradeLogsView from '@/shared/trade-logs/TradeLogsView';

// Module-level constant — stable reference across renders.
const ALLOWED_TYPES = Object.freeze(['Live', 'Demo']);

export default function TradeLogsPage() {
  return (
    <TradeLogsView
      allowedTypes={ALLOWED_TYPES}
      eyebrow="Journal"
      title="Trade Logs"
      subtitle="Browse, search, and manage every trade in your Live and Demo accounts"
      noAccountsTitle="No Live or Demo accounts"
      noAccountsMessage="Trade Logs only track Live and Demo accounts. Create one in Manage → Accounts to get started."
    />
  );
}