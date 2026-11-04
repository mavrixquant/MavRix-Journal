import DashboardView from '@/features/dashboard/components/DashboardView';
import BacktesterDashboardHeader from '@/features/backtester/dashboard/BacktesterDashboardHeader';

export default function BacktesterDashboardPage() {
  return <DashboardView kind="backtest" header={<BacktesterDashboardHeader />} />;
}
