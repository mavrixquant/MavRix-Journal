// apps/web/src/features/personal/components/Discussion.jsx
import { FaComments } from 'react-icons/fa';
import ComingSoon from '@/shared/components/ComingSoon';

export default function Discussion() {
  return (
    <ComingSoon
      eyebrow="Personal Space"
      title="Discussion"
      description="A private space for trade reviews, journaling prompts, and threaded notes to yourself."
      icon={FaComments}
    />
  );
}