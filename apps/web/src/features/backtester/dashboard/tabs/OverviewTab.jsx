import { Panel, KpiRibbon, CalendarPanelBody, BreakdownBody } from '../components/panels';
import { EquityChart, DrawdownChart, HistogramChart } from '../components/charts';
import { fmtMoney, fmtSignedPct, toneOf } from '../../lib/format';

export default function OverviewTab({ session, stats, tz }) {
  const cur = session.currency;
  const last = stats.equity.length ? stats.equity[stats.equity.length - 1] : null;

  return (
    <div className="bt-dgrid">
      <Panel panelId="kpiGrid" title="Performance" subtitle={`${stats.n} closed trade${stats.n === 1 ? '' : 's'}`} height={150} span={12} flush>
        <KpiRibbon stats={stats} currency={cur} />
      </Panel>

      <Panel hero title="Equity curve" subtitle={`from ${fmtMoney(session.startingBalance, cur, { digits: 0 })}`}
        note={stats.n ? fmtSignedPct(stats.returnPct) : null} height={360} span={8}>
        <div className="ep">
          <div className="ep-top">
            <span className="ep-value">{fmtMoney(last ? last.balance : session.startingBalance, cur)}</span>
            <div className="ep-chips">
              <span className="chip">Net <b className={toneOf(stats.netPnl)}>{fmtMoney(stats.netPnl, cur, { digits: 0 })}</b></span>
              <span className="chip">Max DD <b className="neg">{stats.maxDDPct.toFixed(2)}%</b></span>
              {stats.openCount > 0 && <span className="chip">Open <b>{stats.openCount}</b></span>}
            </div>
          </div>
          <div className="ep-chart"><EquityChart points={stats.equity} start={session.startingBalance} currency={cur} tz={tz} /></div>
        </div>
      </Panel>

      <Panel panelId="calendar" title="Calendar" subtitle="daily net P&L" height={360} span={4}>
        <CalendarPanelBody daily={stats.daily} currency={cur} />
      </Panel>

      <Panel title="Drawdown" subtitle="from equity peak" height={270} span={4}>
        <DrawdownChart points={stats.drawdown} currency={cur} tz={tz} />
      </Panel>

      <Panel title="Result distribution" subtitle="net per trade" height={270} span={4}>
        <HistogramChart bins={stats.histogram} currency={cur} />
      </Panel>

      <Panel panelId="strategyBreakdown" title="Breakdown" height={270} span={4} scroll>
        <BreakdownBody stats={stats} currency={cur} />
      </Panel>
    </div>
  );
}
