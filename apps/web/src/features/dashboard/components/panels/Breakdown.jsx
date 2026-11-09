// "categoryCharts" panel = tabbed breakdown (session / weekday / direction).
import { useMemo, useState } from 'react';
import { useStats } from '@/features/dashboard/hooks/useStats';
import Segmented from '@/features/dashboard/components/viz/Segmented';
import { aggregate } from '@/features/dashboard/components/viz/analytics';
import { makeFmt, fmtPct, toneColor } from '@/features/dashboard/components/viz/format';
import PanelChrome, { PanelEmpty } from './PanelChrome';

const SESSION_ORDER = ['Asia', 'London', 'NY Pre-Market', 'NY AM', 'NY Lunch', 'NY PM', 'After Hours'];
const DOW_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : s);

export default function Breakdown() {
  const { stats, metric } = useStats();
  const isMoney = metric === '$';
  const fmt = makeFmt(isMoney);
  const [tab, setTab] = useState('session');

  const rows = useMemo(() => {
    const out = stats?.outcomes || [];
    if (tab === 'session') return aggregate(out, (o) => o.session, SESSION_ORDER);
    if (tab === 'weekday') return aggregate(out, (o) => o.dowName, DOW_ORDER);
    return aggregate(out, (o) => cap(o.dir));
  }, [stats, tab]);

  const maxPos = Math.max(0, ...rows.map((r) => r.total));
  const maxNeg = Math.max(0, ...rows.map((r) => -r.total));
  const span = maxPos + maxNeg || 1;
  const axis = (maxNeg / span) * 100;

  return (
    <PanelChrome
      title="Breakdown"
      actions={
        <Segmented
          label="Group by"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'session', label: 'Session' },
            { value: 'weekday', label: 'Weekday' },
            { value: 'direction', label: 'Side' },
          ]}
        />
      }
      scrollable
    >
      {rows.length === 0 ? (
        <PanelEmpty title="Nothing to group yet" />
      ) : (
        <div className="bk">
          {rows.map((r) => {
            const w = (Math.abs(r.total) / span) * 100;
            const left = r.total >= 0 ? axis : axis - w;
            return (
              <div key={r.key} className="bk-row">
                <div className="bk-name">{r.key}</div>
                <div className="bk-track">
                  {maxPos > 0 && maxNeg > 0 && <i className="bk-axis" style={{ left: `${axis}%` }} />}
                  <i
                    className={`bk-fill ${r.total >= 0 ? 'w' : 'l'}`}
                    style={{ left: `${left}%`, width: `${Math.max(w, 1.2)}%` }}
                  />
                </div>
                <div className="bk-val" style={{ color: toneColor(r.total) }}>{fmt(r.total)}</div>
                <div className="bk-meta">{r.n} · {fmtPct(r.winRate, 0)}</div>
              </div>
            );
          })}
        </div>
      )}
    </PanelChrome>
  );
}
