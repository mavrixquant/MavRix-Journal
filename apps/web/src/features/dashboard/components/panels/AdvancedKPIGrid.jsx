// "advancedKpiGrid" panel = risk-adjusted ratios with tiny gauges.
import { useStats } from '@/features/dashboard/hooks/useStats';
import { nf } from '@/features/dashboard/components/viz/format';
import PanelChrome, { PanelEmpty } from './PanelChrome';

const ok = (v) => v != null && Number.isFinite(v);

export default function AdvancedKPIGrid() {
  const { stats } = useStats();

  if (!stats || stats.n === 0) {
    return (
      <PanelChrome title="Risk-adjusted">
        <PanelEmpty title="No data yet" />
      </PanelChrome>
    );
  }

  const hasEdge = stats.kellyRaw > 0;
  const items = [
    { label: 'Sharpe', v: stats.sharpe, tip: 'Mean return ÷ standard deviation' },
    { label: 'Sortino', v: stats.sortino, tip: 'Mean return ÷ downside deviation' },
    { label: 'Calmar', v: stats.calmar, tip: 'Total return ÷ max drawdown' },
    { label: 'MAR', v: stats.mar, tip: 'Return versus max drawdown' },
    { label: 'Sterling', v: stats.sterling, tip: 'Total return ÷ average drawdown' },
  ];

  return (
    <PanelChrome title="Risk-adjusted" subtitle="quality of returns" scrollable>
      <div className="rk">
        {items.map((it) => {
          const pct = ok(it.v) ? Math.max(0, Math.min(1, it.v / 3)) * 100 : 0;
          const tone = !ok(it.v) ? 'flat' : it.v > 0 ? 'pos' : it.v < 0 ? 'neg' : 'flat';
          return (
            <div key={it.label} className="rk-item" data-tone={tone} title={it.tip}>
              <div className="rk-top">
                <span className="rk-label">{it.label}</span>
                <span className="rk-value">{ok(it.v) ? nf(it.v) : '—'}</span>
              </div>
              <div className="rk-gauge"><i style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
        <div className="rk-item" data-tone={hasEdge ? 'pos' : 'accent'} title="Kelly-suggested risk fraction">
          <div className="rk-top">
            <span className="rk-label">Kelly</span>
            <span className="rk-value">{hasEdge ? `${(stats.kelly * 100).toFixed(1)}%` : 'No edge'}</span>
          </div>
          <div className="rk-gauge"><i style={{ width: `${hasEdge ? Math.min(100, stats.kelly * 100 * 4) : 0}%` }} /></div>
        </div>
      </div>
    </PanelChrome>
  );
}
