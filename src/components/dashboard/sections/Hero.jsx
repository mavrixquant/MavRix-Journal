// src/components/dashboard/sections/Hero.jsx
import { useMemo, useState } from 'react';
import { useStats } from '../../../hooks/useStats';
import { computeStats } from '../../../utils/statsEngine';
import EquityChart from '../charts/EquityChart';
import MonteCarloModal from '../monteCarlo/MonteCarloModal';
import { FaProjectDiagram } from 'react-icons/fa';

const RR_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];

const formatR = (v) => (v != null && !Number.isNaN(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}R` : '—');
const formatPct = (v) => (v != null && !Number.isNaN(v) ? `${v.toFixed(1)}%` : '—');
const formatMoney = (v) => {
  if (v == null || Number.isNaN(v)) return '—';
  const sign = v < 0 ? '-' : '+';
  return `${sign}$${Math.abs(v).toFixed(2)}`;
};

export default function Hero() {
  const { stats, filteredTrades, account, metric } = useStats();
  const isMoney = metric === '$';
  const fmt = isMoney ? formatMoney : formatR;
  const [showMC, setShowMC] = useState(false);

  const bestRR = useMemo(() => {
    if (isMoney) return null;
    if (!filteredTrades || filteredTrades.length === 0) return { r: 1, totalR: 0, winRate: 0 };
    return RR_LEVELS.reduce((best, r) => {
      const s = computeStats(filteredTrades, r, account);
      if (s.totalR > best.totalR) return { r, totalR: s.totalR, winRate: s.winRate };
      return best;
    }, { r: 1, totalR: -Infinity, winRate: 0 });
  }, [filteredTrades, account, isMoney]);

  if (!stats || stats.n === 0) {
    return <div className="panel"><div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '20px' }}>No data</div></div>;
  }

  const totalValue = isMoney ? stats.total : stats.totalR;
  const maxDD = stats.maxDD;
  const canSimulate = stats.n >= 5;

  return (
    <>
      <div className="hero">
        <div className="hero-left">
          <div className="hero-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div className="hero-title">
                {isMoney ? 'Cumulative Equity — Net P&L' : 'Cumulative Equity — R Multiples'}
              </div>
              <button
                onClick={() => canSimulate && setShowMC(true)}
                disabled={!canSimulate}
                title={canSimulate ? 'Run Monte Carlo simulation' : 'Need at least 5 trades'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '5px 11px',
                  background: canSimulate ? 'rgba(255, 176, 32, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${canSimulate ? 'rgba(255, 176, 32, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '6px',
                  color: canSimulate ? '#FFB020' : '#545E6E',
                  fontSize: '11px', fontWeight: 600,
                  cursor: canSimulate ? 'pointer' : 'not-allowed',
                  fontFamily: "'IBM Plex Mono', monospace",
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { if (canSimulate) e.currentTarget.style.background = 'rgba(255, 176, 32, 0.18)'; }}
                onMouseLeave={(e) => { if (canSimulate) e.currentTarget.style.background = 'rgba(255, 176, 32, 0.1)'; }}
              >
                <FaProjectDiagram size={10} />
                Simulate
              </button>
            </div>
            <div className={`hero-value ${totalValue >= 0 ? 'pos' : 'neg'}`}>
              {fmt(totalValue)}
            </div>
          </div>
          <div className="chart-box">
            <EquityChart />
          </div>
        </div>
        <div className="hero-right">
          {!isMoney && bestRR && (
            <div className="best-badge">
              BEST TARGET: 1:{bestRR.r}  ·  {formatR(bestRR.totalR)}  ·  {formatPct(bestRR.winRate)} WIN
            </div>
          )}
          <div className="hero-metric-row">
            <span className="k">Win Rate</span>
            <span className="v num">{formatPct(stats.winRate)}</span>
          </div>
          <div className="hero-metric-row">
            <span className="k">{isMoney ? 'Avg P&L / trade' : 'Expectancy / trade'}</span>
            <span className="v num">{fmt(stats.expectancy)}</span>
          </div>
          <div className="hero-metric-row">
            <span className="k">Profit Factor</span>
            <span className="v num">{Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}</span>
          </div>
          <div className="hero-metric-row">
            <span className="k">Max Drawdown</span>
            <span className="v num">{maxDD != null ? (isMoney ? formatMoney(maxDD) : `${maxDD.toFixed(2)}R`) : '—'}</span>
          </div>
          <div className="hero-metric-row">
            <span className="k">Total Trades</span>
            <span className="v num">{stats.n}</span>
          </div>
        </div>
      </div>

      <MonteCarloModal isOpen={showMC} onClose={() => setShowMC(false)} />
    </>
  );
}