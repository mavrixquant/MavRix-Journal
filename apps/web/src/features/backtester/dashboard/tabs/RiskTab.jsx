import { Panel, BreakdownBody } from '../components/panels';
import { fmtDuration, fmtNum, fmtPF, fmtPct, fmtSigned, toneOf } from '../../lib/format';

function Item({ label, value, tone, gauge, hint }) {
  return (
    <div className="rk-item" data-tone={tone} title={hint}>
      <div className="rk-top"><span className="rk-label">{label}</span><b className="rk-value">{value}</b></div>
      <div className="rk-gauge"><i style={{ width: `${Math.max(0, Math.min(100, gauge))}%` }} /></div>
    </div>
  );
}

function Row({ label, value, tone }) {
  return <div className="bt-kv"><span>{label}</span><b className={tone || ''}>{value}</b></div>;
}

export default function RiskTab({ session, stats }) {
  const cur = session.currency;
  const t = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');
  const empty = stats.n === 0;

  return (
    <div className="bt-dgrid">
      <Panel title="Risk-adjusted metrics" subtitle="per trade" height={250} span={12} scroll>
        {empty ? (
          <div className="pc-empty"><b>No closed trades</b><span>Risk metrics need at least one closed trade.</span></div>
        ) : (
          <div className="rk">
            <Item label="Sharpe" value={fmtNum(stats.sharpe)} tone={t(stats.sharpe)} gauge={(stats.sharpe / 1) * 100} hint="Mean result ÷ standard deviation of results" />
            <Item label="Sortino" value={fmtNum(stats.sortino)} tone={t(stats.sortino)} gauge={(stats.sortino / 1.5) * 100} hint="Like Sharpe but only penalises downside" />
            <Item label="Profit factor" value={fmtPF(stats.profitFactor)} tone={stats.profitFactor >= 1 ? 'pos' : 'neg'} gauge={(Math.min(stats.profitFactor, 3) / 3) * 100} hint="Gross profit ÷ gross loss" />
            <Item label="Payoff ratio" value={fmtNum(stats.payoff)} tone={stats.payoff >= 1 ? 'pos' : ''} gauge={(Math.min(stats.payoff, 3) / 3) * 100} hint="Average win ÷ average loss" />
            <Item label="Recovery factor" value={fmtNum(stats.recovery)} tone={t(stats.recovery)} gauge={(Math.min(Math.abs(stats.recovery), 5) / 5) * 100} hint="Net profit ÷ max drawdown" />
            <Item label="Kelly fraction" value={fmtPct(stats.kelly * 100, 1)} tone={stats.kelly > 0 ? 'accent' : 'neg'} gauge={Math.abs(stats.kelly) * 100} hint="Theoretical optimal risk fraction. Most traders use a fraction of this." />
            <Item label="Std. deviation" value={fmtSigned(stats.stdDev, cur, { digits: 0 }).replace(/^[+−]/, '')} tone="" gauge={30} hint="Spread of per-trade results" />
            <Item label="Max drawdown" value={`${stats.maxDDPct.toFixed(2)}%`} tone={stats.maxDD < 0 ? 'neg' : ''} gauge={Math.abs(stats.maxDDPct) * 5} />
          </div>
        )}
      </Panel>

      <Panel title="Winners & losers" height={300} span={6} scroll>
        {empty ? <div className="pc-empty"><b>No closed trades</b></div> : (
          <div className="bt-split">
            <div>
              <h4 className="pos">Winners</h4>
              <Row label="Trades" value={stats.wins} />
              <Row label="Gross" value={fmtSigned(stats.grossProfit, cur, { digits: 0 })} tone="pos" />
              <Row label="Average" value={fmtSigned(stats.avgWin, cur, { digits: 0 })} tone="pos" />
              <Row label="Largest" value={stats.largestWin == null ? '—' : fmtSigned(stats.largestWin, cur, { digits: 0 })} tone="pos" />
              <Row label="Avg hold" value={fmtDuration(stats.avgWinHoldMin)} />
            </div>
            <div>
              <h4 className="neg">Losers</h4>
              <Row label="Trades" value={stats.losses} />
              <Row label="Gross" value={fmtSigned(stats.grossLoss, cur, { digits: 0 })} tone="neg" />
              <Row label="Average" value={fmtSigned(stats.avgLoss, cur, { digits: 0 })} tone="neg" />
              <Row label="Largest" value={stats.largestLoss == null ? '—' : fmtSigned(stats.largestLoss, cur, { digits: 0 })} tone="neg" />
              <Row label="Avg hold" value={fmtDuration(stats.avgLossHoldMin)} />
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Streaks & days" height={300} span={3} scroll>
        {empty ? <div className="pc-empty"><b>No closed trades</b></div> : (
          <div className="bt-kvlist">
            <Row label="Best win streak" value={stats.streaks.maxWin} tone="pos" />
            <Row label="Worst loss streak" value={stats.streaks.maxLoss} tone="neg" />
            <Row label="Current" value={stats.streaks.current > 0 ? `${stats.streaks.current} W` : stats.streaks.current < 0 ? `${-stats.streaks.current} L` : '—'} tone={toneOf(stats.streaks.current)} />
            <Row label="Best day" value={stats.bestDay ? `${fmtSigned(stats.bestDay.net, cur, { digits: 0 })}` : '—'} tone="pos" />
            <Row label="Worst day" value={stats.worstDay ? `${fmtSigned(stats.worstDay.net, cur, { digits: 0 })}` : '—'} tone="neg" />
            <Row label="Avg hold" value={fmtDuration(stats.avgHoldMin)} />
          </div>
        )}
      </Panel>

      <Panel title="Breakdown" height={300} span={3} scroll>
        <BreakdownBody stats={stats} currency={cur} />
      </Panel>
    </div>
  );
}
