// src/components/dashboard/KPIGrid.jsx
import { useStats } from '../../../hooks/useStats';

const formatR = (v) => (v != null && !Number.isNaN(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}R` : '—');
const formatPct = (v) => (v != null && !Number.isNaN(v) ? `${v.toFixed(1)}%` : '—');

export default function KPIGrid() {
  const { stats, currentR } = useStats();

  // Empty State UI
  if (!stats || stats.n === 0) {
    return (
      <div
        style={{
          backgroundColor: '#11151F',
          border: '1px solid #212836',
          borderRadius: '14px',
          padding: '48px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Empty State Icon */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#161B26',
            border: '1px solid #212836',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#545E6E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>

        <h4
          style={{
            margin: '0 0 6px 0',
            fontSize: '15px',
            fontWeight: '600',
            color: '#E7E9EE',
          }}
        >
          No Trading Data Available
        </h4>
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: '#8892A3',
            maxWidth: '320px',
            lineHeight: '1.5',
          }}
        >
          Log trades in your journal or adjust active filters to display key performance metrics.
        </p>
      </div>
    );
  }

  const kpis = [
    { label: 'Win Rate', value: formatPct(stats.winRate), cls: stats.winRate >= 50 ? 'pos' : 'neg', sub: `${stats.wins?.length ?? 0}W` },
    { label: 'Loss Rate', value: formatPct(stats.lossRate), cls: 'neg', sub: `${stats.losses?.length ?? 0}L` },
    { label: 'Total R', value: formatR(stats.totalR), cls: stats.totalR >= 0 ? 'pos' : 'neg', sub: `${stats.n} trades` },
    { label: 'Expectancy', value: formatR(stats.expectancy), cls: stats.expectancy >= 0 ? 'pos' : 'neg', sub: 'per trade' },
    { label: 'Profit Factor', value: Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞', cls: 'amber', sub: 'gross W / gross L' },
    { label: 'Avg Win', value: formatR(currentR), cls: 'pos', sub: 'fixed at target' },
    { label: 'Avg Loss', value: '-1.00R', cls: 'neg', sub: 'fixed at stop' },
    { label: 'Max Drawdown', value: stats.maxDD != null ? `${stats.maxDD.toFixed(2)}R` : '—', cls: 'neg', sub: 'peak to trough' },
    { label: 'Best Win Streak', value: stats.bestWinStreak ?? 0, cls: 'pos', sub: 'consecutive' },
    { label: 'Worst Loss Streak', value: stats.worstLossStreak ?? 0, cls: 'neg', sub: 'consecutive' },
    {
      label: 'Best Trade',
      value: stats.bestTrade ? formatR(stats.bestTrade.r) : '—',
      cls: 'pos',
      sub: stats.bestTrade ? `${stats.bestTrade.date} ${stats.bestTrade.entry}` : '',
    },
    {
      label: 'Worst Trade',
      value: stats.worstTrade ? formatR(stats.worstTrade.r) : '—',
      cls: 'neg',
      sub: stats.worstTrade ? `${stats.worstTrade.date} ${stats.worstTrade.entry}` : '',
    },
  ];

  const getColor = (cls) => {
    switch (cls) {
      case 'pos':
        return '#35C4A1';
      case 'neg':
        return '#FF5C5C';
      case 'amber':
        return '#FFB020';
      default:
        return '#E7E9EE';
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: '12px',
        width: '100%',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {kpis.map((k) => (
        <div
          key={k.label}
          style={{
            backgroundColor: '#11151F',
            border: '1px solid #212836',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'border-color 0.15s ease, transform 0.15s ease',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#3A4456';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#212836';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: '#8892A3',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            {k.label}
          </div>

          <div
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: getColor(k.cls),
              fontFamily: "'IBM Plex Mono', monospace",
              margin: '8px 0 4px 0',
              lineHeight: '1.1',
            }}
          >
            {k.value}
          </div>

          <div
            style={{
              fontSize: '11px',
              color: '#545E6E',
              fontWeight: '400',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {k.sub || '—'}
          </div>
        </div>
      ))}
    </div>
  );
}