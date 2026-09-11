// src/components/dashboard/sections/AdvancedKPIGrid.jsx
import { useStats } from '../../../hooks/useStats';

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