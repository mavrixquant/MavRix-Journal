// src/components/dashboard/sections/AdvancedKPIGrid.jsx
import { useStats } from '../../../hooks/useStats';

const ADV_CSS = `
  .adv-kpi-container {
    container-type: inline-size;
    container-name: adv-kpi;
    width: 100%;
  }

  /* Default = 2 columns × 3 rows (tallest, for narrow panels) */
  .adv-kpi-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
    font-family: 'Inter', sans-serif;
  }

  .adv-kpi-card {
    background-color: #11151F;
    border: 1px solid #212836;
    border-radius: 8px;
    padding: 7px 9px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 54px;
    transition: border-color 0.15s ease;
    cursor: default;
  }
  .adv-kpi-card:hover { border-color: #3A4456; }

  .adv-kpi-label {
    font-size: 8.5px;
    font-weight: 700;
    color: #8892A3;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .adv-kpi-value {
    font-size: 13px;
    font-weight: 700;
    font-family: 'IBM Plex Mono', monospace;
    margin: 2px 0 1px 0;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .adv-kpi-sub {
    font-size: 8.5px;
    color: #545E6E;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }

  /* 240–419px → 3 columns (2 rows of 3) */
  @container adv-kpi (min-width: 240px) {
    .adv-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .adv-kpi-card { padding: 8px 10px; min-height: 58px; }
    .adv-kpi-label { font-size: 9px; }
    .adv-kpi-value { font-size: 14px; }
    .adv-kpi-sub { font-size: 9px; }
  }

  /* 480–719px → 3 columns, roomier */
  @container adv-kpi (min-width: 480px) {
    .adv-kpi-grid { gap: 12px; }
    .adv-kpi-card { padding: 10px 12px; min-height: 66px; border-radius: 10px; }
    .adv-kpi-label { font-size: 10px; }
    .adv-kpi-value { font-size: 17px; }
    .adv-kpi-sub { font-size: 9.5px; }
  }

  /* 720px+ → 6 columns (1 clean row) */
  @container adv-kpi (min-width: 720px) {
    .adv-kpi-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
    .adv-kpi-card { padding: 12px 12px; min-height: 78px; border-radius: 12px; }
    .adv-kpi-label { font-size: 10.5px; }
    .adv-kpi-value { font-size: 18px; }
    .adv-kpi-sub { font-size: 10px; }
  }

  /* 1000px+ → 6 columns, larger text */
  @container adv-kpi (min-width: 1000px) {
    .adv-kpi-card { padding: 14px 14px; min-height: 84px; }
    .adv-kpi-label { font-size: 11px; }
    .adv-kpi-value { font-size: 20px; }
    .adv-kpi-sub { font-size: 10.5px; }
  }
`;

const formatRatio = (v) => {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return '—';
  return v.toFixed(2);
};

const ratioColorClass = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'amber');

export default function AdvancedKPIGrid() {
  const { stats } = useStats();

  if (!stats || stats.n === 0) return null;

  const kellyDisplay = stats.kellyRaw > 0
    ? `${(stats.kelly * 100).toFixed(1)}%`
    : 'No edge';
  const kellyCls = stats.kellyRaw > 0 ? 'pos' : 'amber';

  const kpis = [
    { label: 'Sharpe',   value: formatRatio(stats.sharpe),   cls: ratioColorClass(stats.sharpe),   sub: 'μ / σ' },
    { label: 'Sortino',  value: formatRatio(stats.sortino),  cls: ratioColorClass(stats.sortino),  sub: 'downside σ' },
    { label: 'Calmar',   value: formatRatio(stats.calmar),   cls: ratioColorClass(stats.calmar),   sub: 'total / maxDD' },
    { label: 'MAR',      value: formatRatio(stats.mar),      cls: ratioColorClass(stats.mar),      sub: 'total / maxDD' },
    { label: 'Sterling', value: formatRatio(stats.sterling), cls: ratioColorClass(stats.sterling), sub: 'total / avgDD' },
    { label: 'Kelly %',  value: kellyDisplay,                cls: kellyCls,                        sub: stats.kellyRaw > 0 ? 'suggested' : 'no edge' },
  ];

  const getColor = (cls) => cls === 'pos' ? '#35C4A1' : cls === 'neg' ? '#FF5C5C' : cls === 'amber' ? '#FFB020' : '#E7E9EE';

  return (
    <>
      <style>{ADV_CSS}</style>
      <div className="adv-kpi-container">
        <div className="adv-kpi-grid">
          {kpis.map((k) => (
            <div key={k.label} className="adv-kpi-card">
              <div className="adv-kpi-label">{k.label}</div>
              <div className="adv-kpi-value" style={{ color: getColor(k.cls) }}>{k.value}</div>
              <div className="adv-kpi-sub">{k.sub || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}