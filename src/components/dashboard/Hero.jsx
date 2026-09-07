// src/components/dashboard/Hero.jsx
import { useStats } from '../../hooks/useStats';
import { useAppContext } from '../../context/AppContext';
import { applyFilters } from '../../utils/filterHelpers';
import { computeStats } from '../../utils/statsEngine';
import EquityChart from './EquityChart';

const RR_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function Hero() {
  const { state } = useAppContext();
  const { stats, filteredTrades } = useStats();

  if (!stats || stats.n === 0) {
    return (
      <div className="hero" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ color: 'var(--text-faint)' }}>No trades match current filters.</div>
      </div>
    );
  }

  // Compute best RR target
  const bestRR = RR_LEVELS.reduce((best, r) => {
    const s = computeStats(filteredTrades, r);
    if (s.totalR > best.totalR) return { r, totalR: s.totalR, winRate: s.winRate };
    return best;
  }, { r: 1, totalR: -Infinity, winRate: 0 });

  const formatR = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + 'R';
  const formatPct = (v) => v.toFixed(1) + '%';

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
          <span className="v num">{isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}</span>
        </div>
        <div className="hero-metric-row">
          <span className="k">Max Drawdown</span>
          <span className="v num">{stats.maxDD.toFixed(2)}R</span>
        </div>
        <div className="hero-metric-row">
          <span className="k">Total Trades</span>
          <span className="v num">{stats.n}</span>
        </div>
      </div>
    </div>
  );
}