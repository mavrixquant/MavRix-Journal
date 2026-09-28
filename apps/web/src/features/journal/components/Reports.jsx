// apps/web/src/features/journal/components/Reports.jsx
import { FaFileAlt } from 'react-icons/fa';
import ComingSoon from '@/shared/components/ComingSoon';

export default function Reports() {
  return (
    <ComingSoon
      eyebrow="Journal"
      title="Reports"
      description="Generate deep-dive performance reports you can export as PDF or CSV — per account, per period, per strategy."
      icon={FaFileAlt}
    />
  );
}