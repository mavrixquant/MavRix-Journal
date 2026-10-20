import { Sparkles } from 'lucide-react';

export default function MaveAiAvatar({ size = 40 }) {
  const s = Math.max(20, Math.round(size));
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: s,
        height: s,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 30%, transparent), color-mix(in srgb, var(--accent) 10%, transparent))',
        border: '1px solid var(--accent-soft2)',
        color: 'var(--accent)',
        boxShadow: '0 0 16px -4px color-mix(in srgb, var(--accent) 50%, transparent)',
        flexShrink: 0,
      }}
    >
      <Sparkles size={Math.round(s * 0.5)} strokeWidth={2.5} />
    </span>
  );
}