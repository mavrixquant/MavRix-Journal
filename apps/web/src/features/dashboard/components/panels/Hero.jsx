import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaProjectDiagram } from 'react-icons/fa';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { computeStats } from '@/shared/trading/stats';
import EquityChart from '@/features/dashboard/components/charts/EquityChart';
import PanelChrome, { PanelEmpty } from './PanelChrome';

const RR_LEVELS = [1, 2, 3, 4];

const formatR = (v) => (v != null && !Number.isNaN(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}R` : '—');
const formatPct = (v) => (v != null && !Number.isNaN(v) ? `${v.toFixed(1)}%` : '—');
const formatMoney = (v) => {
  if (v == null || Number.isNaN(v)) return '—';
  const sign = v < 0 ? '-' : '+';
  return `${sign}$${Math.abs(v).toFixed(2)}`;
};

/** Win/loss donut. Win arc in green over a red track. */
function WinRing({ winRate }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, winRate || 0));
  return (
    <div className="hx-ring">
      <svg viewBox="0 0 84 84" aria-hidden="true">
        <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,92,92,.55)" strokeWidth="7" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke="#35C4A1"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          style={{ transition: 'stroke-dasharray .6s cubic-bezier(.2,.8,.25,1)' }}
        />
      </svg>
      <div className="hx-ring-center">
        <b>{pct.toFixed(0)}%</b>
        <span>win</span>
      </div>
    </div>
  );
}

export default function Hero() {
  const navigate = useNavigate();
  const { stats, filteredTrades, account, metric } = useStats();
  const isMoney = metric === '$';
  const fmt = isMoney ? formatMoney : formatR;

  const bestRR = useMemo(() => {
    if (isMoney) return null;
    if (!filteredTrades || filteredTrades.length === 0) return { r: 1, totalR: 0, winRate: 0 };
    return RR_LEVELS.reduce(
      (best, r) => {
        const s = computeStats(filteredTrades, r, account);
        if (s.totalR > best.totalR) return { r, totalR: s.totalR, winRate: s.winRate };
        return best;
      },
      { r: 1, totalR: -Infinity, winRate: 0 }
    );
  }, [filteredTrades, account, isMoney]);

  if (!stats || stats.n === 0) {
    return (
      <PanelChrome title="Cumulative Equity">
        <PanelEmpty title="No data yet" hint="Log trades to see your equity curve" />
      </PanelChrome>
    );
  }

  const totalValue = isMoney ? stats.total : stats.totalR;
  const canSimulate = stats.n >= 5;
  const wins = stats.wins?.length ?? 0;
  const losses = stats.losses?.length ?? 0;
  const pf = Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞';

  const simulate = (
    <button
      type="button"
      className="hx-sim"
      onClick={() => canSimulate && navigate('/backtester/simulator')}
      disabled={!canSimulate}
      title={canSimulate ? 'Open Monte Carlo Simulator' : 'Need at least 5 trades'}
    >
      <FaProjectDiagram size={10} />
      Simulator
    </button>
  );

  return (
    <PanelChrome
      flush
      title={isMoney ? 'Cumulative Equity' : 'Cumulative Equity (R)'}
      note={`${stats.n} trades`}
      actions={simulate}
    >
      <div className="hx">
        <div className="hx-main">
          <div className="hx-head">
            <div>
              <div className="hx-eyebrow">{isMoney ? 'Net P&L' : 'Total R'}</div>
              <div className={`hx-value ${totalValue >= 0 ? 'pos' : 'neg'}`}>{fmt(totalValue)}</div>
            </div>
            <div className="hx-chips">
              <span className="hx-chip">
                {isMoney ? 'Avg' : 'Exp'} <b>{fmt(stats.expectancy)}</b>
              </span>
              <span className="hx-chip">
                PF <b>{pf}</b>
              </span>
              {!isMoney && bestRR && (
                <span className="hx-chip is-accent">
                  Best 1:{bestRR.r} · {formatR(bestRR.totalR)}
                </span>
              )}
            </div>
          </div>
          <div className="hx-chart">
            <EquityChart />
          </div>
        </div>

        <aside className="hx-rail">
          <div className="hx-ring-wrap">
            <WinRing winRate={stats.winRate} />
            <div className="hx-wl">
              <div>
                <i style={{ background: '#35C4A1' }} />
                <b>{wins}</b> wins
              </div>
              <div>
                <i style={{ background: '#FF5C5C' }} />
                <b>{losses}</b> losses
              </div>
            </div>
          </div>

          {!isMoney && bestRR && (
            <div className="hx-best">
              Best target 1:{bestRR.r}
              <br />
              {formatR(bestRR.totalR)} · {formatPct(bestRR.winRate)} win
            </div>
          )}

          <div className="hx-rows">
            <div className="hx-row">
              <span className="k">Win rate</span>
              <span className="v">{formatPct(stats.winRate)}</span>
            </div>
            <div className="hx-row">
              <span className="k">{isMoney ? 'Avg P&L / trade' : 'Expectancy'}</span>
              <span className={`v ${stats.expectancy >= 0 ? 'pos' : 'neg'}`}>{fmt(stats.expectancy)}</span>
            </div>
            <div className="hx-row">
              <span className="k">Profit factor</span>
              <span className="v">{pf}</span>
            </div>
            <div className="hx-row">
              <span className="k">Max drawdown</span>
              <span className="v neg">
                {stats.maxDD != null ? (isMoney ? formatMoney(stats.maxDD) : `${stats.maxDD.toFixed(2)}R`) : '—'}
              </span>
            </div>
            <div className="hx-row">
              <span className="k">Total trades</span>
              <span className="v">{stats.n}</span>
            </div>
          </div>
        </aside>
      </div>
    </PanelChrome>
  );
}
