// "hero" panel = equity curve with drawdown strip, range switch, simulator shortcut.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaProjectDiagram } from 'react-icons/fa';
import { useStats } from '@/features/dashboard/hooks/useStats';
import EquityDrawdownChart from '@/features/dashboard/components/viz/EquityDrawdownChart';
import Segmented from '@/features/dashboard/components/viz/Segmented';
import { summarize } from '@/features/dashboard/components/viz/analytics';
import { makeFmt, nf } from '@/features/dashboard/components/viz/format';
import PanelChrome, { PanelEmpty } from './PanelChrome';

export default function Hero() {
  const navigate = useNavigate();
  const { stats, metric, currentR } = useStats();
  const [range, setRange] = useState('all');
  const isMoney = metric === '$';
  const fmt = makeFmt(isMoney);
  const s = useMemo(() => (stats?.n ? summarize(stats) : null), [stats]);

  if (!stats || stats.n === 0 || !s) {
    return (
      <PanelChrome title="Equity curve">
        <PanelEmpty title="No equity data yet" hint="Log trades to draw your curve" />
      </PanelChrome>
    );
  }

  const options = [{ value: 'all', label: 'All' }, ...[100, 50, 20].filter((n) => n < stats.n).map((n) => ({ value: n, label: String(n) }))];
  const activeRange = options.some((o) => o.value === range) ? range : 'all';
  const total = isMoney ? stats.total : stats.totalR;
  const canSimulate = stats.n >= 5;

  return (
    <PanelChrome
      title="Equity curve"
      subtitle={isMoney ? 'cumulative net P&L' : `cumulative R · 1:${currentR} target`}
      actions={
        <>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => canSimulate && navigate('/backtester/simulator')}
            disabled={!canSimulate}
            title={canSimulate ? 'Open Monte Carlo simulator' : 'Need at least 5 trades'}
          >
            <FaProjectDiagram size={10} />
            <span>Simulate</span>
          </button>
          <Segmented label="Range" options={options} value={activeRange} onChange={setRange} />
        </>
      }
    >
      <div className="ep">
        <div className="ep-top">
          <div className={`ep-value ${total >= 0 ? 'pos' : 'neg'}`}>{fmt(total)}</div>
          <div className="ep-chips">
            <span className="chip">PF <b>{Number.isFinite(stats.profitFactor) ? nf(stats.profitFactor) : '∞'}</b></span>
            <span className="chip">Exp <b>{fmt(stats.expectancy)}</b></span>
            <span className="chip">Max DD <b className="neg">{s.maxDD ? fmt(-s.maxDD, { sign: false }) : '—'}</b></span>
          </div>
          <div className="ep-legend">
            <span><i style={{ background: 'var(--accent)' }} />Equity</span>
            <span><i style={{ background: 'var(--d-loss)' }} />Drawdown</span>
          </div>
        </div>
        <div className="ep-chart">
          <EquityDrawdownChart equity={s.equity} isMoney={isMoney} range={activeRange} />
        </div>
      </div>
    </PanelChrome>
  );
}
