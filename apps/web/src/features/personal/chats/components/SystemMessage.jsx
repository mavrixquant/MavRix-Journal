import { AlertCircle, ArrowRightLeft } from 'lucide-react';

export default function SystemMessage({ body, kind }) {
  const isSwitch = kind === 'ai_switch';
  const Icon = isSwitch ? ArrowRightLeft : AlertCircle;

  return (
    <div className="chat-system-msg-wrap">
      <div className={`chat-system-msg ${isSwitch ? 'is-switch' : ''}`}>
        <Icon size={12} />
        <span>{body}</span>
      </div>
    </div>
  );
}