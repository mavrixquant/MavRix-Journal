import { fmtPct } from '@/features/dashboard/components/viz/format';
import { Empty, fmtDuration, fmtPF } from './Card';

function Row({ label, value, tone, hint }) {
  return (
    <div className="ax-kv" title={hint}>
      <span>{label}</span>
      <b className={tone || ''}>{value}</b>
    </div>
  );
}

export function WinnersLosers({ stats, fmt }) {
  const largestWin = stats.wins.length ? Math.max(...stats.wins.map((o) => o.score)) : null;
  const largestLoss = stats.losses.length ? Math.min(...stats.losses.map((o) => o.score)) : null;
  return (
    <div className="ax-split">
      <div className="ax-split-col">
        <h4 className="pos">Winners</h4>
        <Row label="Trades" value={stats.wins.length} />
        <Row label="Gross" value={fmt(stats.winSum)} tone="pos" />
        <Row label="Average" value={fmt(stats.avgWin)} tone="pos" />
        <Row label="Largest" value={largestWin == null ? '-' : fmt(largestWin)} tone="pos" />
        <Row label="Average hold" value={fmtDuration(stats.avgWinDuration)} />
      </div>
      <div className="ax-split-col">
        <h4 className="neg">Losers</h4>
        <Row label="Trades" value={stats.losses.length} />
        <Row label="Gross" value={fmt(stats.lossSum)} tone="neg" />
        <Row label="Average" value={fmt(stats.avgLoss)} tone="neg" />
        <Row label="Largest" value={largestLoss == null ? '-' : fmt(largestLoss)} tone="neg" />
        <Row label="Average hold" value={fmtDuration(stats.avgLossDuration)} />
      </div>
    </div>
  );
}

export function RiskMetrics({ stats }) {
  const f = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '-');
  return (
    <div className="ax-kvlist">
      <Row label="Sharpe (per trade)" value={f(stats.sharpe)} hint="Mean result divided by standard deviation of results" />
      <Row label="Sortino (per trade)" value={f(stats.sortino)} hint="Like Sharpe, but only counts downside deviation" />
      <Row label="Calmar" value={f(stats.calmar)} hint="Net result divided by max drawdown" />
      <Row label="Profit factor" value={fmtPF(stats.profitFactor)} />
      <Row label="Kelly fraction" value={fmtPct(stats.kelly * 100, 1)} hint="Theoretical optimal risk fraction. Most traders use a fraction of this." />
      <Row label="Std. deviation" value={f(stats.stdR)} />
    </div>
  );
}

function Sample({ label, s, fmt }) {
  return (
    <div className="ax-sample-box">
      <span className="ax-sample-label">{label}</span>
      {s.n ? (
        <>
          <b>{fmtPct(s.winRate, 0)} win</b>
          <em>{s.n} trades, {fmt(s.expectancy)} each</em>
        </>
      ) : (
        <em>No trades</em>
      )}
    </div>
  );
}

/** What happens to your next trade after a win, after a loss, and on busy days. */
export function BehaviorPanel({ behavior, stats, fmt }) {
  const { afterWin, afterLoss, dayRows, currentStreak } = behavior;
  const drop = afterWin.n >= 5 && afterLoss.n >= 5 ? afterWin.winRate - afterLoss.winRate : null;
  const maxAbs = Math.max(1e-9, ...dayRows.map((r) => Math.abs(r.expectancy)));

  return (
    <div className="ax-behavior">
      <div className="ax-pair">
        <Sample label="Next trade after a win" s={afterWin} fmt={fmt} />
        <Sample label="Next trade after a loss" s={afterLoss} fmt={fmt} />
      </div>
      {drop != null && Math.abs(drop) >= 8 && (
        <p className={`ax-note ${drop > 0 ? 'neg' : 'pos'}`}>
          {drop > 0
            ? `Win rate drops ${drop.toFixed(0)} points after a loss. This can point to revenge trading or tilt.`
            : `Win rate rises ${Math.abs(drop).toFixed(0)} points after a loss. You reset well.`}
        </p>
      )}

      <h4 className="ax-sub">Result by trades taken in a day</h4>
      {dayRows.length === 0 ? (
        <Empty title="No data" />
      ) : (
        <div className="ax-bars">
          {dayRows.map((r) => (
            <div key={r.key} className="ax-bar-row">
              <span className="ax-bar-name">{r.key}</span>
              <i className="ax-bar-track">
                <b
                  className={r.expectancy >= 0 ? 'pos' : 'neg'}
                  style={{ width: `${Math.max(2, (Math.abs(r.expectancy) / maxAbs) * 100)}%` }}
                />
              </i>
              <span className={`ax-bar-val ${r.expectancy >= 0 ? 'pos' : 'neg'}`}>{fmt(r.expectancy)}</span>
              <span className="ax-bar-n">{r.n}</span>
            </div>
          ))}
          <p className="ax-foot">Average per trade, grouped by how many trades you took that day.</p>
        </div>
      )}

      {currentStreak.type && (
        <Row
          label="Current streak"
          value={`${currentStreak.n} ${currentStreak.type === 'win' ? 'wins' : 'losses'}`}
          tone={currentStreak.type === 'win' ? 'pos' : 'neg'}
        />
      )}
      <Row label="Trading days" value={behavior.tradingDays} />
      <Row label="Trades per day" value={(stats.n / Math.max(1, behavior.tradingDays)).toFixed(1)} />
    </div>
  );
}
