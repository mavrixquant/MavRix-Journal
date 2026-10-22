
import TradeLogsView from '@/shared/trade-logs/TradeLogsView';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { useAppContext } from '@/app/providers/AppProvider';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

const ALLOWED_TYPES = Object.freeze(['Live', 'Demo']);

export default function TradeLogsPage() {
  const { accountId } = useDashboardAccount();
  const { state } = useAppContext();
  const currentR = state.currentR;

  usePageHeader({
    title: 'Trade Logs',
    subtitle: 'Browse, search, and manage every trade in your Live and Demo accounts',
  });

  return (
    <TradeLogsView
      accountId={accountId}
      currentR={currentR}
      allowedTypes={ALLOWED_TYPES}
      noAccountsTitle="No Live or Demo accounts"
      noAccountsMessage="Trade Logs only track Live and Demo accounts. Create one in Manage → Accounts to get started."
    />
  );
}