import { useStats } from '@/features/dashboard/hooks/useStats';
import PanelChrome, { PanelEmpty } from './PanelChrome';

const formatRatio = (v) => {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return '—';
  return v.toFixed(2);
};

const tone = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'accent');

export default function AdvancedKPIGrid() {
  const { stats } = useStats();

  if (!stats || stats.n === 0) {
    return (
      <PanelChrome title="Risk-Adjusted">
        <PanelEmpty title="No data yet" />
      </PanelChrome>
    );
  }

  const hasEdge = stats.kellyRaw > 0;

  const kpis = [
    { label: 'Sharpe', value: formatRatio(stats.sharpe), tone: tone(stats.sharpe), sub: 'μ / σ', tip: 'Mean return divided by standard deviation' },
    { label: 'Sortino', value: formatRatio(stats.sortino), tone: tone(stats.sortino), sub: 'downside σ', tip: 'Mean return divided by downside deviation' },
    { label: 'Calmar', value: formatRatio(stats.calmar), tone: tone(stats.calmar), sub: 'total / maxDD', tip: 'Total return divided by max drawdown' },
    { label: 'MAR', value: formatRatio(stats.mar), tone: tone(stats.mar), sub: 'total / maxDD', tip: 'Return versus max drawdown' },
    { label: 'Sterling', value: formatRatio(stats.sterling), tone: tone(stats.sterling), sub: 'total / avgDD', tip: 'Total return divided by average drawdown' },
    { label: 'Kelly %', value: hasEdge ? `${(stats.kelly * 100).toFixed(1)}%` : 'No edge', tone: hasEdge ? 'pos' : 'accent', sub: hasEdge ? 'suggested' : 'no edge', tip: 'Kelly-suggested risk fraction' },
  ];

  return (
    <PanelChrome title="Risk-Adjusted" note="ratios" scrollable>
      <div className="kx">
        <div className="kx-grid is-adv">
          {kpis.map((k) => (
            <div key={k.label} className="kx-card" data-tone={k.tone} title={k.tip}>
              <div className="kx-label">{k.label}</div>
              <div className="kx-value">{k.value}</div>
              <div className="kx-sub">{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </PanelChrome>
  );
}
