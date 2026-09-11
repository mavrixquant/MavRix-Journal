// src/components/dashboard/sections/KPIGrid.jsx
import { useStats } from '../../../hooks/useStats';

const formatR = (v) => (v != null && !Number.isNaN(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}R` : '—');
const formatPct = (v) => (v != null && !Number.isNaN(v) ? `${v.toFixed(1)}%` : '—');
const formatMoney = (v) => {
  if (v == null || Number.isNaN(v)) return '—';
  const sign = v < 0 ? '-' : '+';
  return `${sign}$${Math.abs(v).toFixed(2)}`;
};

export default function KPIGrid() {
  const { stats, currentR, metric } = useStats();
  const isMoney = metric === '$';

  if (!stats || stats.n === 0) {
    return (
      <div style={{ backgroundColor: '#11151F', border: '1px solid #212836', borderRadius: '12px', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#161B26', border: '1px solid #212836', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#545E6E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '600', color: '#E7E9EE' }}>No Trading Data</h4>
        <p style={{ margin: 0, fontSize: '11px', color: '#8892A3', maxWidth: '280px', lineHeight: '1.5' }}>
          Log trades to display performance metrics.
        </p>
      </div>
    );
  }

  const kpis = isMoney
    ? [
        { label: 'Win Rate', value: formatPct(stats.winRate), cls: stats.winRate >= 50 ? 'pos' : 'neg', sub: `${stats.wins?.length ?? 0}W` },
        { label: 'Loss Rate', value: formatPct(stats.lossRate), cls: 'neg', sub: `${stats.losses?.length ?? 0}L` },
        { label: 'Net P&L', value: formatMoney(stats.total), cls: stats.total >= 0 ? 'pos' : 'neg', sub: `${stats.n} trades` },
        { label: 'Avg P&L', value: formatMoney(stats.expectancy), cls: stats.expectancy >= 0 ? 'pos' : 'neg', sub: 'per trade' },
        { label: 'Profit Factor', value: Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞', cls: 'amber', sub: 'W / L' },
        { label: 'Avg Win', value: formatMoney(stats.avgWin), cls: 'pos', sub: 'per win' },
        { label: 'Avg Loss', value: formatMoney(stats.avgLoss), cls: 'neg', sub: 'per loss' },
        { label: 'Max DD', value: stats.maxDD != null ? formatMoney(stats.maxDD) : '—', cls: 'neg', sub: 'peak→trough' },
        { label: 'Win Streak', value: stats.bestWinStreak ?? 0, cls: 'pos', sub: 'best' },
        { label: 'Loss Streak', value: stats.worstLossStreak ?? 0, cls: 'neg', sub: 'worst' },
        { label: 'Best Trade', value: stats.bestTrade ? formatMoney(stats.bestTrade.score) : '—', cls: 'pos', sub: stats.bestTrade ? `${stats.bestTrade.date}` : '' },
        { label: 'Worst Trade', value: stats.worstTrade ? formatMoney(stats.worstTrade.score) : '—', cls: 'neg', sub: stats.worstTrade ? `${stats.worstTrade.date}` : '' },
      ]
    : [
        { label: 'Win Rate', value: formatPct(stats.winRate), cls: stats.winRate >= 50 ? 'pos' : 'neg', sub: `${stats.wins?.length ?? 0}W` },
        { label: 'Loss Rate', value: formatPct(stats.lossRate), cls: 'neg', sub: `${stats.losses?.length ?? 0}L` },
        { label: 'Total R', value: formatR(stats.totalR), cls: stats.totalR >= 0 ? 'pos' : 'neg', sub: `${stats.n} trades` },
        { label: 'Expectancy', value: formatR(stats.expectancy), cls: stats.expectancy >= 0 ? 'pos' : 'neg', sub: 'per trade' },
        { label: 'Profit Factor', value: Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞', cls: 'amber', sub: 'W / L' },
        { label: 'Avg Win', value: formatR(currentR), cls: 'pos', sub: 'at target' },
        { label: 'Avg Loss', value: '-1.00R', cls: 'neg', sub: 'at stop' },
        { label: 'Max DD', value: stats.maxDD != null ? `${stats.maxDD.toFixed(2)}R` : '—', cls: 'neg', sub: 'peak→trough' },
        { label: 'Win Streak', value: stats.bestWinStreak ?? 0, cls: 'pos', sub: 'best' },
        { label: 'Loss Streak', value: stats.worstLossStreak ?? 0, cls: 'neg', sub: 'worst' },
        { label: 'Best Trade', value: stats.bestTrade ? formatR(stats.bestTrade.r) : '—', cls: 'pos', sub: stats.bestTrade ? `${stats.bestTrade.date}` : '' },
        { label: 'Worst Trade', value: stats.worstTrade ? formatR(stats.worstTrade.r) : '—', cls: 'neg', sub: stats.worstTrade ? `${stats.worstTrade.date}` : '' },
      ];

  const getColor = (cls) => cls === 'pos' ? '#35C4A1' : cls === 'neg' ? '#FF5C5C' : cls === 'amber' ? '#FFB020' : '#E7E9EE';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '14px', width: '100%', fontFamily: "'Inter', sans-serif" }}>
      {kpis.map((k) => (
        <div
          key={k.label}
          style={{
            backgroundColor: '#11151F',
            border: '1px solid #212836',
            borderRadius: '8px',
            padding: '7px 9px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '60px',
            transition: 'border-color 0.15s ease',
            cursor: 'default',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3A4456'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#212836'; }}
        >
          <div style={{ fontSize: '8.5px', fontWeight: '700', color: '#8892A3', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {k.label}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: getColor(k.cls), fontFamily: "'IBM Plex Mono', monospace", margin: '2px 0 1px 0', lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {k.value}
          </div>
          <div style={{ fontSize: '8.5px', color: '#545E6E', fontWeight: '400', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>
            {k.sub || '—'}
          </div>
        </div>
      ))}
    </div>
  );
}