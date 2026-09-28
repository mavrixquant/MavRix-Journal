// apps/web/src/features/backtester/components/Chart.jsx
import { FaChartBar } from 'react-icons/fa';
import ComingSoon from '@/shared/components/ComingSoon';

export default function BacktesterChart() {
  return (
    <ComingSoon
      eyebrow="Backtester"
      title="Chart"
      description="Interactive charting with strategy overlays — visualize entries, exits, and R-multiple targets on the price action."
      icon={FaChartBar}
    />
  );
}