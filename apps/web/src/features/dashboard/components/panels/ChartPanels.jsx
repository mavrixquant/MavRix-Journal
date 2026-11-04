// monthly / rollingExpectancy / distribution panels
import { useMemo } from 'react';
import { useStats } from '@/features/dashboard/hooks/useStats';
import BarsChart from '@/features/dashboard/components/viz/BarsChart';
import LineChart from '@/features/dashboard/components/viz/LineChart';
import Histogram from '@/features/dashboard/components/viz/Histogram';
import { monthly, rollingAverage } from '@/features/dashboard/components/viz/analytics';
import { makeFmt, fmtPct } from '@/features/dashboard/components/viz/format';
import PanelChrome, { PanelEmpty } from './PanelChrome';

const monthLabel = (key, long) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', long ? { month: 'long', year: 'numeric' } : { month: 'short' });
};

export function MonthlyPanel() {
  const { stats, metric } = useStats();
  const isMoney = metric === '$';
  const items = useMemo(
    () =>
      monthly(stats?.outcomes)
        .slice(-24)
        .map((m, i, arr) => ({
          label: monthLabel(m.key) + (m.key.endsWith('-01') || i === 0 || arr[i - 1]?.key.slice(0, 4) !== m.key.slice(0, 4) ? ` '${m.key.slice(2, 4)}` : ''),
          title: monthLabel(m.key, true),
          value: m.total,
          sub: `${m.n} trades · ${fmtPct(m.winRate)} win`,
        })),
    [stats]
  );
  const best = items.length ? items.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const fmt = makeFmt(isMoney);

  return (
    <PanelChrome title="Monthly performance" note={best ? `best ${best.label.split(' ')[0]} ${fmt(best.value)}` : undefined}>
      {items.length ? <BarsChart items={items} isMoney={isMoney} /> : <PanelEmpty title="No monthly data" />}
    </PanelChrome>
  );
}

export function RollingPanel() {
  const { stats, metric } = useStats();
  const isMoney = metric === '$';
  const fmt = makeFmt(isMoney);

  const model = useMemo(() => {
    const out = stats?.outcomes || [];
    const n = out.length;
    if (n < 8) return null;
    const window = n >= 40 ? 20 : Math.max(5, Math.floor(n / 2));
    const series = rollingAverage(out.map((o) => Number(o.score) || 0), window);
    return {
      window,
      values: series.map((p) => p.v),
      labels: series.map((p) => `Trades ${p.i - window + 2}–${p.i + 1}`),
    };
  }, [stats]);

  const last = model ? model.values[model.values.length - 1] : null;

  return (
    <PanelChrome
      title="Rolling expectancy"
      subtitle={model ? `${model.window}-trade window` : undefined}
      note={last != null ? `now ${fmt(last)}` : undefined}
    >
      {model ? <LineChart values={model.values} labels={model.labels} isMoney={isMoney} /> : <PanelEmpty title="Needs 8+ trades" hint="Rolling average appears once there is enough history" />}
    </PanelChrome>
  );
}

export function DistributionPanel() {
  const { stats, metric } = useStats();
  const isMoney = metric === '$';
  const fmt = makeFmt(isMoney);
  const values = useMemo(() => (stats?.outcomes || []).map((o) => Number(o.score) || 0), [stats]);
  const median = useMemo(() => {
    if (!values.length) return null;
    const s = [...values].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }, [values]);

  return (
    <PanelChrome title="Trade distribution" note={median != null ? `median ${fmt(median)}` : undefined}>
      {values.length >= 3 ? <Histogram values={values} isMoney={isMoney} /> : <PanelEmpty title="Needs 3+ trades" />}
    </PanelChrome>
  );
}
