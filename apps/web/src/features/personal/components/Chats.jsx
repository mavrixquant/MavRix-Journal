// apps/web/src/features/personal/components/Chats.jsx
import { FaCommentDots } from 'react-icons/fa';
import ComingSoon from '@/shared/components/ComingSoon';

export default function Chats() {
  return (
    <ComingSoon
      eyebrow="Personal Space"
      title="Chats"
      description="Conversational analysis of your trading — ask questions about your edge, your worst setups, and your timing."
      icon={FaCommentDots}
    />
  );
}