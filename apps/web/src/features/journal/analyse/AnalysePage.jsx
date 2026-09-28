// apps/web/src/features/journal/components/Analyse.jsx
import { FaChartPie } from 'react-icons/fa';
import ComingSoon from '@/shared/components/ComingSoon';

export default function Analyse() {
  return (
    <ComingSoon
      eyebrow="Journal"
      title="Analyse"
      description="Deep-dive analytics across your journal — cohort breakdowns, R-distribution curves, edge decay over time, and per-setup performance."
      icon={FaChartPie}
    />
  );
}