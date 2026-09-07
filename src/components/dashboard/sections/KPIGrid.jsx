// src/components/dashboard/KPIGrid.jsx
import { useStats } from '../../../hooks/useStats';

const formatR = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + 'R';
const formatPct = (v) => v.toFixed(1) + '%';

export default function KPIGrid() {
  const { stats, currentR } = useStats();

  if (!stats || stats.n === 0) {
    return <div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '20px' }}>No data</div>;
  }

  const kpis = [
    { label: 'Win Rate', value: formatPct(stats.winRate), cls: stats.winRate >= 50 ? 'pos' : 'neg', sub: `${stats.wins.length}W` },
    { label: 'Loss Rate', value: formatPct(stats.lossRate), cls: 'neg', sub: `${stats.losses.length}L` },
    { label: 'Total R', value: formatR(stats.totalR), cls: stats.totalR >= 0 ? 'pos' : 'neg', sub: `${stats.n} trades` },
    { label: 'Expectancy', value: formatR(stats.expectancy), cls: stats.expectancy >= 0 ? 'pos' : 'neg', sub: 'per trade' },
    { label: 'Profit Factor', value: isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞', cls: 'amber', sub: 'gross W / gross L' },
    { label: 'Avg Win', value: formatR(currentR), cls: 'pos', sub: 'fixed at target' },
    { label: 'Avg Loss', value: '-1.00R', cls: 'neg', sub: 'fixed at stop' },
    { label: 'Max Drawdown', value: stats.maxDD.toFixed(2) + 'R', cls: 'neg', sub: 'peak to trough' },
    { label: 'Best Win Streak', value: stats.bestWinStreak, cls: 'pos', sub: 'consecutive' },
    { label: 'Worst Loss Streak', value: stats.worstLossStreak, cls: 'neg', sub: 'consecutive' },
    { label: 'Best Trade', value: stats.bestTrade ? formatR(stats.bestTrade.r) : '—', cls: 'pos', sub: stats.bestTrade ? stats.bestTrade.date + ' ' + stats.bestTrade.entry : '' },
    { label: 'Worst Trade', value: stats.worstTrade ? formatR(stats.worstTrade.r) : '—', cls: 'neg', sub: stats.worstTrade ? stats.worstTrade.date + ' ' + stats.worstTrade.entry : '' },
  ];

  return (
    <div className="kpi-grid">
      {kpis.map((k, idx) => (
        <div key={idx} className="kpi-card">
          <div className="kpi-label">{k.label}</div>
          <div className={`kpi-value ${k.cls}`}>{k.value}</div>
          <div className="kpi-sub">{k.sub}</div>
        </div>
      ))}
    </div>
  );
}