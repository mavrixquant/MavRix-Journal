// src/components/dashboard/BreakdownBars.jsx
import { useMemo } from 'react';

const formatR = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + 'R';
const formatPct = (v) => v.toFixed(1) + '%';

export default function BreakdownBars({ data, maxAbs = null }) {
  // data: array of { label, totalR, n, winRate }
  if (!data || data.length === 0) {
    return (
      <div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '20px' }}>
        No data available
      </div>
    );
  }

  // Sort by totalR descending (best performers first)
  const sortedData = [...data].sort((a, b) => b.totalR - a.totalR);

  // Calculate max absolute value for scaling
  const maxValue = maxAbs !== null ? maxAbs : Math.max(1, ...sortedData.map(d => Math.abs(d.totalR)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {sortedData.map((item, idx) => {
        const pct = Math.min(100, Math.abs(item.totalR) / maxValue * 100);
        const isPositive = item.totalR >= 0;
        const barClass = isPositive ? 'win' : 'loss';

        return (
          <div key={idx} className="bd-row">
            <div className="bd-top">
              <span className="bd-name">{item.label}</span>
              <span className="bd-meta">
                {formatR(item.totalR)} · {formatPct(item.winRate)} win · {item.n} trades
              </span>
            </div>
            <div className="bd-track">
              <div className={`bd-fill ${barClass}`} style={{ width: `${pct}%` }}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}