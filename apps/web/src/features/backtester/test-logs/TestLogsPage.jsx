
import TradeLogsView from '@/shared/trade-logs/TradeLogsView';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { useAppContext } from '@/app/providers/AppProvider';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

const ALLOWED_TYPES = Object.freeze(['Backtest']);

export default function TestLogsPage() {
  const { accountId } = useDashboardAccount();
  const { state } = useAppContext();
  const currentR = state.currentR;

  usePageHeader({
    title: 'Test Logs',
    subtitle: 'Browse, search, and manage every trade in your Backtest accounts',
  });

  return (
    <TradeLogsView
      accountId={accountId}
      currentR={currentR}
      allowedTypes={ALLOWED_TYPES}
      noAccountsTitle="No Backtest accounts"
      noAccountsMessage="Test Logs only track Backtest accounts. Create one in Manage â†’ Accounts to get started."
    />
  );
}