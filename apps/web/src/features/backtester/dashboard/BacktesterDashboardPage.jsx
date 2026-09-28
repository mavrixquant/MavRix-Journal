// apps/web/src/features/backtester/components/BacktesterDashboard.jsx
import { FaChartLine } from 'react-icons/fa';
import ComingSoon from '@/shared/components/ComingSoon';

export default function BacktesterDashboard() {
  return (
    <ComingSoon
      eyebrow="Backtester"
      title="Backtester Dashboard"
      description="A dedicated workspace for running and comparing backtests across multiple strategies and date ranges."
      icon={FaChartLine}
    />
  );
}