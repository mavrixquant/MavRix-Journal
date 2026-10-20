
import TradeLogsView from '@/shared/trade-logs/TradeLogsView';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

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