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

  // Duration sub-hint based on whether winners or losers are held longer
  const dd = stats.durationDelta || 0;

  const kellyDisplay = stats.kellyRaw > 0
    ? `${(stats.kelly * 100).toFixed(1)}%`
    : 'No edge';
  const kellyCls = stats.kellyRaw > 0 ? 'pos' : 'amber';

  const kpis = [
    { label: 'Sharpe',      value: formatRatio(stats.sharpe),   cls: ratioColorClass(stats.sharpe),   sub: 'mean / σ per trade' },
    { label: 'Sortino',     value: formatRatio(stats.sortino),  cls: ratioColorClass(stats.sortino),  sub: 'downside-only σ' },
    { label: 'Calmar',      value: formatRatio(stats.calmar),   cls: ratioColorClass(stats.calmar),   sub: 'total / max DD' },
    { label: 'MAR',         value: formatRatio(stats.mar),      cls: ratioColorClass(stats.mar),      sub: 'total / max DD' },
    { label: 'Sterling',    value: formatRatio(stats.sterling), cls: ratioColorClass(stats.sterling), sub: 'total / avg DD' },
    { label: 'Kelly %',     value: kellyDisplay,                cls: kellyCls,                        sub: stats.kellyRaw > 0 ? 'suggested size' : 'negative edge' },
  ];

  const getColor = (cls) => cls === 'pos' ? '#35C4A1' : cls === 'neg' ? '#FF5C5C' : cls === 'amber' ? '#FFB020' : '#E7E9EE';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px', width: '100%', fontFamily: "'Inter', sans-serif" }}>
      {kpis.map((k) => (
        <div key={k.label} style={{ backgroundColor: '#11151F', border: '1px solid #212836', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'border-color 0.15s ease, transform 0.15s ease', cursor: 'default' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3A4456'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#212836'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#8892A3', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{k.label}</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: getColor(k.cls), fontFamily: "'IBM Plex Mono', monospace", margin: '8px 0 4px 0', lineHeight: '1.1' }}>{k.value}</div>
          <div style={{ fontSize: '11px', color: '#545E6E', fontWeight: '400', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.sub || '—'}</div>
        </div>
      ))}
    </div>
  );
}