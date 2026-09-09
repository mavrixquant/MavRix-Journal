// src/components/dashboard/Hero.jsx
import { useMemo } from 'react';
import { useStats } from '../../../hooks/useStats';
import { computeStats } from '../../../utils/statsEngine';
import EquityChart from '../charts/EquityChart';

const RR_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];

const formatR = (v) => (v != null && !Number.isNaN(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}R` : '—');
const formatPct = (v) => (v != null && !Number.isNaN(v) ? `${v.toFixed(1)}%` : '—');

export default function Hero() {
  const { stats, filteredTrades } = useStats();

  // Memoize heavy calculation of best RR target across trade history
  const bestRR = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) {
      return { r: 1, totalR: 0, winRate: 0 };
    }
    return RR_LEVELS.reduce(
      (best, r) => {
        const s = computeStats(filteredTrades, r);
        if (s.totalR > best.totalR) return { r, totalR: s.totalR, winRate: s.winRate };
        return best;
      },
      { r: 1, totalR: -Infinity, winRate: 0 }
    );
  }, [filteredTrades]);

  if (!stats || stats.n === 0) {
    return (
      <div className="panel">
        <div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '20px' }}>
          No data
        </div>
      </div>
    );
  }

  return (
    <div className="hero">
      <div className="hero-left">
        <div className="hero-head">
          <div>
            <div className="hero-title">Cumulative Equity — R Multiples</div>
          </div>
          <div className={`hero-value ${stats.totalR >= 0 ? 'pos' : 'neg'}`}>
            {formatR(stats.totalR)}
          </div>
        </div>
        <div className="chart-box">
          <EquityChart />
        </div>
      </div>
      <div className="hero-right">
        <div className="best-badge">
          BEST TARGET: 1:{bestRR.r}  ·  {formatR(bestRR.totalR)}  ·  {formatPct(bestRR.winRate)} WIN
        </div>
        <div className="hero-metric-row">
          <span className="k">Win Rate</span>
          <span className="v num">{formatPct(stats.winRate)}</span>
        </div>
        <div className="hero-metric-row">
          <span className="k">Expectancy / trade</span>
          <span className="v num">{formatR(stats.expectancy)}</span>
        </div>
        <div className="hero-metric-row">
          <span className="k">Profit Factor</span>
          <span className="v num">
            {Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}
          </span>
        </div>
        <div className="hero-metric-row">
          <span className="k">Max Drawdown</span>
          <span className="v num">{stats.maxDD != null ? `${stats.maxDD.toFixed(2)}R` : '—'}</span>
        </div>
        <div className="hero-metric-row">
          <span className="k">Total Trades</span>
          <span className="v num">{stats.n}</span>
        </div>
      </div>
    </div>
  );
}