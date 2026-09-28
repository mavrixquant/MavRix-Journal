// apps/web/src/features/journal/components/EconomicCalendar.jsx
import { FaCalendarAlt } from 'react-icons/fa';
import ComingSoon from '@/shared/components/ComingSoon';

export default function EconomicCalendar() {
  return (
    <ComingSoon
      eyebrow="Journal"
      title="Economic Calendar"
      description="Track market-moving events — FOMC, CPI, NFP — and see how your performance shifts around them."
      icon={FaCalendarAlt}
    />
  );
}