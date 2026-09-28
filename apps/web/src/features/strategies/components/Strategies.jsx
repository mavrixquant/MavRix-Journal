// apps/web/src/features/strategies/components/Strategies.jsx
import { FaBrain } from 'react-icons/fa';
import ComingSoon from '@/shared/components/ComingSoon';

export default function Strategies() {
  return (
    <ComingSoon
      eyebrow="Manage"
      title="Strategies"
      description="Define, version, and tag your playbooks. Link trades to a strategy to unlock per-strategy analytics."
      icon={FaBrain}
    />
  );
}