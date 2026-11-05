import { useMemo, useState } from 'react';

import BarsChart from '@/features/dashboard/components/viz/BarsChart';
import EquityDrawdownChart from '@/features/dashboard/components/viz/EquityDrawdownChart';
import { longDate, shortDate } from '@/features/dashboard/components/viz/format';

import {
  DOW_ORDER,
  SESSION_ORDER,
  buildDaily,
  buildHeatmap,
  buildHistogram,
  groupRows,
  hourLabel,
} from '../lib/analysis';
import { Card, Seg } from './Card';
import { EdgeExplorer, Histogram, HourHeatmap } from './Explore';
import { BehaviorPanel, RiskMetrics, WinnersLosers } from './Risk';
import TradesTable from './TradesTable';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (key) => {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1] || m} ${String(y).slice(2)}`;
};

const toItems = (rows) =>
  rows.map((r) => ({
    label: r.key,
    value: r.total,
    sub: `${r.n} ${r.n === 1 ? 'trade' : 'trades'}, ${Math.round(r.winRate)}% win`,
  }));

const RANGES = [
  { value: 'all', label: 'All' },
  { value: 100, label: '100' },
  { value: 50, label: '50' },
  { value: 20, label: '20' },
];

export function OverviewTab({ stats, outcomes, isMoney }) {
  const [range, setRange] = useState('all');

  const monthly = useMemo(() => {
    const map = new Map();
    outcomes.forEach((o) => {
      const k = o.date?.slice(0, 7);
      if (!k) return;
      if (!map.has(k)) map.set(k, { total: 0, n: 0, wins: 0 });
      const e = map.get(k);
      e.total += Number(o.score) || 0;
      e.n += 1;
      if (o.result === 'win') e.wins += 1;
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, e]) => ({
        label: monthLabel(k),
        value: e.total,
        sub: `${e.n} trades, ${Math.round((e.wins / e.n) * 100)}% win`,
      }));
  }, [outcomes]);

  const daily = useMemo(
    () =>
      buildDaily(outcomes)
        .slice(-60)
        .map((d) => ({
          label: shortDate(d.date),
          title: longDate(d.date),
          value: d.total,
          sub: `${d.n} ${d.n === 1 ? 'trade' : 'trades'}`,
        })),
    [outcomes]
  );

  const bins = useMemo(() => buildHistogram(outcomes.map((o) => o.score)), [outcomes]);

  return (
    <div className="ax-stack">
      <Card
        title="Equity and drawdown"
        note={isMoney ? 'Cumulative net' : 'Cumulative R'}
        height={380}
        right={<Seg value={range} options={RANGES} onChange={setRange} label="Trades shown" />}
      >
        <EquityDrawdownChart equity={stats.equity} isMoney={isMoney} range={range} />
      </Card>

      <div className="ax-grid c2">
        <Card title="Monthly result" height={290}>
          <BarsChart items={monthly} isMoney={isMoney} />
        </Card>
        <Card
          title="Distribution of results"
          note="How trades are spread"
          height={290}
        >
          <Histogram bins={bins} isMoney={isMoney} />
        </Card>
      </div>

      <Card title="Daily result" note="Last 60 trading days" height={260}>
        <BarsChart items={daily} isMoney={isMoney} />
      </Card>
    </div>
  );
}

export function TimeTab({ outcomes, isMoney, fmt }) {
  const heatmap = useMemo(() => buildHeatmap(outcomes), [outcomes]);
  const session = useMemo(
    () => toItems(groupRows(outcomes, (o) => o.session, { order: SESSION_ORDER })),
    [outcomes]
  );
  const dow = useMemo(
    () => toItems(groupRows(outcomes, (o) => o.dowName, { order: DOW_ORDER })),
    [outcomes]
  );
  const hour = useMemo(
    () => toItems(groupRows(outcomes, (o) => hourLabel(o.entryMinutes), { natural: true })),
    [outcomes]
  );

  return (
    <div className="ax-stack">
      <Card title="When you make and lose money" note="Day of week by entry hour">
        <HourHeatmap heatmap={heatmap} isMoney={isMoney} fmt={fmt} />
      </Card>
      <div className="ax-grid c2">
        <Card title="By session" height={280}>
          <BarsChart items={session} isMoney={isMoney} />
        </Card>
        <Card title="By day of week" height={280}>
          <BarsChart items={dow} isMoney={isMoney} />
        </Card>
      </div>
      <Card title="By entry hour" height={280}>
        <BarsChart items={hour} isMoney={isMoney} />
      </Card>
    </div>
  );
}

export function ExplorerTab({ outcomes, dims, fmt }) {
  return (
    <Card title="Edge explorer" note="Pick what to slice by, then how to rank it">
      <EdgeExplorer outcomes={outcomes} dims={dims} fmt={fmt} />
    </Card>
  );
}

export function RiskTab({ stats, behavior, fmt }) {
  return (
    <div className="ax-stack">
      <div className="ax-grid c2">
        <Card title="Winners vs losers">
          <WinnersLosers stats={stats} fmt={fmt} />
        </Card>
        <Card title="Risk-adjusted metrics">
          <RiskMetrics stats={stats} />
        </Card>
      </div>
      <Card title="Behavior" note="How one trade affects the next">
        <BehaviorPanel behavior={behavior} stats={stats} fmt={fmt} />
      </Card>
    </div>
  );
}

export function TradesTab({ outcomes, fmt, strategyName }) {
  return (
    <Card title="Filtered trades" flush>
      <TradesTable outcomes={outcomes} fmt={fmt} strategyName={strategyName} />
    </Card>
  );
}

