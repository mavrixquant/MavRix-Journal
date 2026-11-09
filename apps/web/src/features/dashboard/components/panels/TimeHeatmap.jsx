// "timeChart" panel = weekday x time-of-day edge heatmap.
import { useMemo, useState } from 'react';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { useElementSize } from '@/features/dashboard/components/viz/useElementSize';
import Segmented from '@/features/dashboard/components/viz/Segmented';
import { makeFmt, fmtPct } from '@/features/dashboard/components/viz/format';
import PanelChrome, { PanelEmpty } from './PanelChrome';

const DOW_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BASE = [15, 19, 28];
const WIN = [53, 196, 161];
const LOSS = [255, 92, 92];
const ACC = [245, 158, 11];
const mix = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const pad = (n) => String(n).padStart(2, '0');

const toMinutes = (b) => {
  const m = String(b ?? '').match(/(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export default function TimeHeatmap() {
  const { stats, metric } = useStats();
  const isMoney = metric === '$';
  const fmt = makeFmt(isMoney);
  const [mode, setMode] = useState('net');
  const [hover, setHover] = useState(null);
  const [ref, { width }] = useElementSize();

  const model = useMemo(() => {
    const out = (stats?.outcomes || []).filter((o) => o.bucket != null && o.dowName);
    if (!out.length) return null;

    const parsable = out.every((o) => toMinutes(o.bucket) != null);
    const keyOf = (o) => (parsable ? toMinutes(o.bucket) : String(o.bucket));

    const cells = new Map();
    out.forEach((o) => {
      const k = `${o.dowName}|${keyOf(o)}`;
      const c = cells.get(k) || { total: 0, n: 0, wins: 0 };
      c.total += Number(o.score) || 0;
      c.n += 1;
      if (o.result === 'win') c.wins += 1;
      cells.set(k, c);
    });

    let cols;
    if (parsable) {
      const mins = [...new Set(out.map(keyOf))].sort((a, b) => a - b);
      let step = 30;
      if (mins.length > 1) step = Math.max(5, Math.min(...mins.slice(1).map((m, i) => m - mins[i])));
      cols = [];
      for (let m = mins[0]; m <= mins[mins.length - 1] && cols.length < 72; m += step) {
        cols.push({ key: m, label: `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}` });
      }
    } else {
      cols = [...new Set(out.map(keyOf))].sort().map((k) => ({ key: k, label: String(k) }));
    }

    const present = new Set(out.map((o) => o.dowName));
    const rows = DOW_ORDER.filter((d) => present.has(d));

    let maxAbs = 1e-9;
    let maxN = 1;
    cells.forEach((c) => {
      maxAbs = Math.max(maxAbs, Math.abs(c.total));
      maxN = Math.max(maxN, c.n);
    });
    return { cells, cols, rows, maxAbs, maxN };
  }, [stats]);

  if (!model) {
    return (
      <PanelChrome title="Edge by time">
        <PanelEmpty title="No time data" hint="Trades with entry times appear here" />
      </PanelChrome>
    );
  }

  const { cells, cols, rows, maxAbs, maxN } = model;
  const labelWidth = 46;
  const maxLabels = Math.max(2, Math.floor((width - labelWidth) / 46));
  const every = Math.ceil(cols.length / maxLabels);

  const color = (c) => {
    if (!c) return 'rgba(255,255,255,.025)';
    if (mode === 'net') return rgb(mix(BASE, c.total >= 0 ? WIN : LOSS, 0.12 + (Math.abs(c.total) / maxAbs) * 0.78));
    if (mode === 'win') {
      const w = (c.wins / c.n) * 100;
      return rgb(mix(BASE, w >= 50 ? WIN : LOSS, 0.12 + (Math.abs(w - 50) / 50) * 0.78));
    }
    return rgb(mix(BASE, ACC, 0.12 + (c.n / maxN) * 0.78));
  };

  const readout = hover
    ? `${hover.d} ${hover.label} — ${hover.c ? `${fmt(hover.c.total)} · ${hover.c.n} trade${hover.c.n > 1 ? 's' : ''} · ${fmtPct((hover.c.wins / hover.c.n) * 100, 0)} win` : 'no trades'}`
    : 'Hover a cell for details';

  return (
    <PanelChrome
      title="Edge by time"
      subtitle="weekday × time of day"
      actions={
        <Segmented
          label="Metric"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'net', label: isMoney ? 'P&L' : 'R' },
            { value: 'win', label: 'Win %' },
            { value: 'n', label: 'Trades' },
          ]}
        />
      }
    >
      <div className="hm">
        <div
          ref={ref}
          className="hm-grid"
          style={{
            gridTemplateColumns: `${labelWidth}px repeat(${cols.length}, minmax(0, 1fr))`,
            gridTemplateRows: `auto repeat(${rows.length}, minmax(0, 1fr))`,
          }}
          onPointerLeave={() => setHover(null)}
        >
          <div />
          {cols.map((col, i) => (
            <div key={col.key} className="hm-col">{i % every === 0 ? col.label : ''}</div>
          ))}
          {rows.map((d) => (
            <Fragment2 key={d}>
              <div className="hm-row">{d}</div>
              {cols.map((col) => {
                const c = cells.get(`${d}|${col.key}`);
                return (
                  <div
                    key={col.key}
                    className={`hm-cell${c ? ' has' : ''}`}
                    style={{ background: color(c) }}
                    onPointerEnter={() => setHover({ d, label: col.label, c })}
                  />
                );
              })}
            </Fragment2>
          ))}
        </div>
        <div className="hm-foot">{readout}</div>
      </div>
    </PanelChrome>
  );
}

// tiny fragment helper (keeps keys explicit)
function Fragment2({ children }) {
  return <>{children}</>;
}
