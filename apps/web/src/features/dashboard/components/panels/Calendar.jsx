import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { makeFmt, toneColor } from '@/features/dashboard/components/viz/format';
import { fmtCompact } from '@/features/dashboard/components/viz/format';
import PanelChrome, { PanelEmpty } from './PanelChrome';

const WIN = [53, 196, 161];
const LOSS = [255, 92, 92];
const BE = [136, 146, 163];
const BASE = [15, 19, 28];
const mix = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Calendar() {
  const { stats, metric } = useStats();
  const isMoney = metric === '$';
  const fmt = makeFmt(isMoney);
  const [month, setMonth] = useState(null);

  const months = useMemo(() => {
    if (!stats?.outcomes?.length) return [];
    return [...new Set(stats.outcomes.map((o) => o.date?.slice(0, 7)))].filter(Boolean).sort();
  }, [stats]);

  useEffect(() => {
    if (months.length && (!month || !months.includes(month))) setMonth(months[months.length - 1]);
  }, [months, month]);

  const byDate = useMemo(() => {
    const map = new Map();
    (stats?.outcomes || []).forEach((o) => {
      if (!o.date) return;
      const d = map.get(o.date) || { v: 0, n: 0 };
      d.v += Number(o.score) || 0;
      d.n += 1;
      map.set(o.date, d);
    });
    return map;
  }, [stats]);

  const model = useMemo(() => {
    if (!month || !byDate.size) return null;
    const [y, mo] = month.split('-').map(Number);
    const offset = new Date(y, mo - 1, 1).getDay();
    const dim = new Date(y, mo, 0).getDate();
    const maxAbs = Math.max(1e-9, ...[...byDate.values()].map((d) => Math.abs(d.v)));

    const cells = [];
    for (let i = 0; i < offset; i += 1) cells.push(null);
    let monthV = 0;
    let monthN = 0;
    let green = 0;
    let traded = 0;
    for (let d = 1; d <= dim; d += 1) {
      const date = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const info = byDate.get(date);
      if (info) {
        monthV += info.v;
        monthN += info.n;
        traded += 1;
        if (info.v > 0) green += 1;
      }
      cells.push({ d, date, v: info?.v ?? 0, n: info?.n ?? 0 });
    }
    while (cells.length % 7) cells.push(null);

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      const row = cells.slice(i, i + 7);
      weeks.push({ row, v: row.reduce((a, c) => a + (c?.v || 0), 0), n: row.reduce((a, c) => a + (c?.n || 0), 0) });
    }
    return { weeks, maxAbs, monthV, monthN, green, traded, label: new Date(y, mo - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }) };
  }, [month, byDate]);

  if (!model) {
    return (
      <PanelChrome title="P&L calendar">
        <PanelEmpty title="No calendar data" hint="Trades appear here by day" />
      </PanelChrome>
    );
  }

  const idx = months.indexOf(month);
  const today = todayStr();

  return (
    <PanelChrome
      title="P&L calendar"
      actions={
        <div className="cx-nav">
          <button type="button" className="icon-btn" disabled={idx <= 0} onClick={() => setMonth(months[idx - 1])} aria-label="Previous month">
            <ChevronLeft size={14} />
          </button>
          <span className="cx-month">{model.label}</span>
          <button type="button" className="icon-btn" disabled={idx >= months.length - 1} onClick={() => setMonth(months[idx + 1])} aria-label="Next month">
            <ChevronRight size={14} />
          </button>
        </div>
      }
    >
      <div className="cx">
        <div className="cx-sum">
          <span className="chip">Month <b style={{ color: toneColor(model.monthV) }}>{model.monthN ? fmt(model.monthV) : '—'}</b></span>
          <span className="chip">Green days <b>{model.green}/{model.traded}</b></span>
          <span className="chip cx-hide-sm">Trades <b>{model.monthN}</b></span>
        </div>

        <div className="cx-grid" style={{ gridTemplateRows: `auto repeat(${model.weeks.length}, minmax(0, 1fr))` }}>
          {DOW.map((d, i) => <div key={i} className="cx-dow">{d}</div>)}
          <div className="cx-dow is-week">Wk</div>

          {model.weeks.map((w, wi) => (
            <Row key={wi} w={w} wi={wi} model={model} fmt={fmt} isMoney={isMoney} today={today} />
          ))}
        </div>
      </div>
    </PanelChrome>
  );
}

function Row({ w, wi, model, fmt, isMoney, today }) {
  const weekTint = w.n ? mix(BASE, w.v > 0 ? WIN : w.v < 0 ? LOSS : BE, 0.14) : BASE;
  return (
    <>
      {w.row.map((c, i) => {
        if (!c) return <div key={i} className="cx-cell is-empty" />;
        const bg = c.n ? rgb(mix(BASE, c.v > 0 ? WIN : c.v < 0 ? LOSS : BE, 0.1 + Math.min(1, Math.abs(c.v) / model.maxAbs) * 0.32)) : undefined;
        return (
          <div key={i} className={`cx-cell${c.date === today ? ' is-today' : ''}`} style={{ background: bg }} title={c.n ? `${c.date} · ${fmt(c.v)} · ${c.n} trades` : c.date}>
            <span className="cx-date">{c.d}</span>
            {c.n > 0 && (
              <span className="cx-val" style={{ color: toneColor(c.v) }}>
                <span className="cx-full">{fmt(c.v)}</span>
                <span className="cx-short">{fmtCompact(c.v, isMoney)}</span>
              </span>
            )}
          </div>
        );
      })}
      <div className="cx-cell is-week" style={{ background: rgb(weekTint) }}>
        <span className="cx-date">W{wi + 1}</span>
        <span className="cx-val" style={{ color: w.n ? toneColor(w.v) : 'var(--d-ink-3)' }}>
          <span className="cx-full">{w.n ? fmt(w.v) : '—'}</span>
          <span className="cx-short">{w.n ? fmtCompact(w.v, isMoney) : '—'}</span>
        </span>
      </div>
    </>
  );
}
