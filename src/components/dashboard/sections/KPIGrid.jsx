// src/components/dashboard/sections/KPIGrid.jsx
import { useStats } from '../../../hooks/useStats';

const KPI_CSS = `
  .kpi-container {
    container-type: inline-size;
    container-name: kpi;
    width: 100%;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 12px;
    width: 100%;
    font-family: 'Inter', sans-serif;
  }

  .kpi-card {
    background-color: #11151F;
    border: 1px solid #212836;
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 60px;
    transition: border-color 0.15s ease;
    cursor: default;
  }
  .kpi-card:hover { border-color: #3A4456; }

  .kpi-label {
    font-size: 9px;
    font-weight: 700;
    color: #8892A3;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .kpi-value {
    font-size: 14px;
    font-weight: 700;
    font-family: 'IBM Plex Mono', monospace;
    margin: 2px 0 1px 0;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .kpi-sub {
    font-size: 9px;
    color: #545E6E;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }

  /* XS panel */
  @container kpi (max-width: 240px) {
    .kpi-grid { grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 6px; }
    .kpi-card { padding: 5px 7px; min-height: 44px; border-radius: 6px; }
    .kpi-label { font-size: 7.5px; }
    .kpi-value { font-size: 11.5px; margin: 1px 0; }
    .kpi-sub { font-size: 7.5px; }
  }

  /* Small panel */
  @container kpi (min-width: 241px) and (max-width: 360px) {
    .kpi-grid { grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); gap: 8px; }
    .kpi-card { padding: 6px 8px; min-height: 52px; }
    .kpi-label { font-size: 8px; }
    .kpi-value { font-size: 12px; }
    .kpi-sub { font-size: 8px; }
  }

  /* Medium panel */
  @container kpi (min-width: 361px) and (max-width: 560px) {
    .kpi-grid { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
    .kpi-card { padding: 8px 10px; min-height: 58px; }
    .kpi-label { font-size: 9px; }
    .kpi-value { font-size: 14px; }
    .kpi-sub { font-size: 9px; }
  }

  /* Large panel */
  @container kpi (min-width: 561px) and (max-width: 800px) {
    .kpi-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
    .kpi-card { padding: 10px 12px; min-height: 68px; border-radius: 10px; }
    .kpi-label { font-size: 10px; }
    .kpi-value { font-size: 16px; }
    .kpi-sub { font-size: 9.5px; }
  }

  /* XL panel */
  @container kpi (min-width: 801px) {
    .kpi-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; }
    .kpi-card { padding: 12px 14px; min-height: 78px; border-radius: 12px; }
    .kpi-label { font-size: 11px; }
    .kpi-value { font-size: 20px; }
    .kpi-sub { font-size: 10px; }
  }
`;

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
    <>
      <style>{KPI_CSS}</style>
      <div className="kpi-container">
        <div className="kpi-grid">
          {kpis.map((k) => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ color: getColor(k.cls) }}>{k.value}</div>
              <div className="kpi-sub">{k.sub || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}