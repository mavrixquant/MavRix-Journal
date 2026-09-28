// apps/web/src/features/backtester/components/TestLogs.jsx
import { FaClipboardList } from 'react-icons/fa';
import ComingSoon from '@/shared/components/ComingSoon';

export default function TestLogs() {
  return (
    <ComingSoon
      eyebrow="Backtester"
      title="Test Logs"
      description="Every backtest you've run, with parameters, results, and the ability to diff two runs side by side."
      icon={FaClipboardList}
    />
  );
}