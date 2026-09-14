// src/components/dashboard/sections/WeeklyCards.jsx
import { useMemo } from 'react';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { getWeekStart } from '@/shared/utils/timeHelpers';

const COLORS = { win: '#35C4A1', loss: '#FF5C5C', text: '#8892A3', grid: '#1A2029' };

const formatR = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + 'R';
const formatMoney = (v) => {
  const sign = v >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(v).toFixed(2)}`;
};

export default function WeeklyChart() {
  const { stats, metric } = useStats();
  const isMoney = metric === '$';
  const fmt = isMoney ? formatMoney : formatR;

  const weeklyData = useMemo(() => {
    if (!stats || stats.outcomes.length === 0) return null;
    const map = new Map();
    stats.outcomes.forEach(o => {
      const wk = getWeekStart(o.date);
      if (!map.has(wk)) map.set(wk, { v: 0, n: 0, wins: 0 });
      const entry = map.get(wk);
      entry.v += (o.score ?? 0);
      entry.n += 1;
      if (o.result === 'win') entry.wins++;
    });
    const weeks = [...map.keys()].sort();
    const data = weeks.map(w => +map.get(w).v.toFixed(2));
    const labels = weeks.map(w => 'Wk of ' + w.slice(5));
    return { weeks, data, labels, map };
  }, [stats]);

  if (!weeklyData || weeklyData.weeks.length === 0) {
    return <div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '20px' }}></div>;
  }

  const { weeks, map } = weeklyData;
  const totalWeeks = weeks.length;
  const posWeeks = weeks.filter(w => map.get(w).v > 0).length;
  let bestWeek = null, worstWeek = null;
  weeks.forEach(w => {
    const v = map.get(w).v;
    if (!bestWeek || v > map.get(bestWeek).v) bestWeek = w;
    if (!worstWeek || v < map.get(worstWeek).v) worstWeek = w;
  });

  const totalValue = isMoney ? stats.total : stats.totalR;

  return (
    <div>
      <div className="week-summary">
        <div className="week-chip">
          <div className="wk-label">Best Week</div>
          <div className="wk-val" style={{ color: COLORS.win }}>{bestWeek ? fmt(map.get(bestWeek).v) : '—'}</div>
        </div>
        <div className="week-chip">
          <div className="wk-label">Worst Week</div>
          <div className="wk-val" style={{ color: COLORS.loss }}>{worstWeek ? fmt(map.get(worstWeek).v) : '—'}</div>
        </div>
        <div className="week-chip">
          <div className="wk-label">Green Weeks</div>
          <div className="wk-val">{posWeeks} / {totalWeeks}</div>
        </div>
        <div className="week-chip">
          <div className="wk-label">Avg / Week</div>
          <div className="wk-val">{totalWeeks ? fmt(totalValue / totalWeeks) : '—'}</div>
        </div>
      </div>
    </div>
  );
}