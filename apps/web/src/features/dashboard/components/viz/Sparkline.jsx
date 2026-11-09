import { useId } from 'react';

/** Tiny stretchy line+area. `tone` is a CSS color. */
export default function Sparkline({ values, tone = 'var(--accent)' }) {
  const uid = useId().replace(/:/g, '');
  if (!values || values.length < 2) return <div className="rb-spark-empty" />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 30 - ((v - lo) / span) * 26]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('');
  return (
    <svg className="rb-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`sp${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tone} stopOpacity=".32" />
          <stop offset="1" stopColor={tone} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L100,32L0,32Z`} fill={`url(#sp${uid})`} />
      <path d={line} fill="none" stroke={tone} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
