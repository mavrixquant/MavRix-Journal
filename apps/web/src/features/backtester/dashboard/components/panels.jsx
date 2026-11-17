import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fmtCompact, fmtNum, fmtPct, fmtR, fmtSigned, fmtSignedPct, toneOf } from '../../lib/format';

/** Dashboard panel — same chrome as the journal dashboard (dash-panel / pc). */
export function Panel({ title, subtitle, note, right, flush, scroll, hero, panelId, height, span, children }) {
  return (
    <section
      className="dash-panel bt-panel"
      data-panel={hero ? 'hero' : panelId}
      style={{ '--h': `${height}px`, '--span': span }}
    >
      <div className="pc">
        <div className="pc-head">
          <div className="pc-title-wrap">
            <i className="pc-dot" />
            <div className="pc-titles">
              <span className="pc-title">{title}</span>
              {subtitle && <span className="pc-subtitle">{subtitle}</span>}
            </div>
          </div>
          <div className="pc-right">{note && <span className="pc-note">{note}</span>}{right}</div>
        </div>
        <div className={`pc-body${flush ? ' is-flush' : ''}${scroll ? ' is-scroll' : ''}`}>{children}</div>
      </div>
    </section>
  );
}

/* ------------------------------ KPI ribbon ------------------------------ */
function Tile({ label, value, tone, sub, viz }) {
  return (
    <div className="rb-tile" data-tone={tone}>
      <span className="rb-label">{label}</span>
      <b className="rb-value">{value}</b>
      <span className="rb-sub">{sub}</span>
      <div className="rb-viz">{viz}</div>
    </div>
  );
}

export function KpiRibbon({ stats, currency }) {
  return (
    <div className="rb">
      <Tile
        label="Net P&L" value={fmtSigned(stats.netPnl, currency, { digits: 0 })} tone={toneOf(stats.netPnl) === 'pos' ? 'pos' : toneOf(stats.netPnl) === 'neg' ? 'neg' : ''}
        sub={`${fmtSignedPct(stats.returnPct)} · ${stats.n} trade${stats.n === 1 ? '' : 's'}`}
        viz={<div className="rb-spark-empty" />}
      />
      <Tile
        label="Win rate" value={fmtPct(stats.winRate, 1)} tone=""
        sub={`${stats.wins}W · ${stats.losses}L${stats.breakeven ? ` · ${stats.breakeven}BE` : ''}`}
        viz={stats.n ? (
          <div className="rb-split"><i className="w" style={{ flex: stats.wins || 0.0001 }} /><i className="l" style={{ flex: stats.losses || 0.0001 }} /></div>
        ) : <div className="rb-spark-empty" />}
      />
      <Tile
        label="Avg R" value={stats.avgR == null ? '—' : fmtR(stats.avgR)} tone={stats.avgR == null ? '' : toneOf(stats.avgR) === 'pos' ? 'pos' : toneOf(stats.avgR) === 'neg' ? 'neg' : ''}
        sub={stats.rCount ? `${stats.rCount} trade${stats.rCount === 1 ? '' : 's'} with a stop` : 'Set a stop loss to get R'}
        viz={<div className="rb-spark-empty" />}
      />
      <Tile
        label="Expectancy" value={fmtSigned(stats.expectancy, currency, { digits: 0 })} tone={toneOf(stats.expectancy) === 'pos' ? 'pos' : toneOf(stats.expectancy) === 'neg' ? 'neg' : ''}
        sub={`PF ${stats.profitFactor === Infinity ? '∞' : fmtNum(stats.profitFactor)} · payoff ${fmtNum(stats.payoff)}`}
        viz={<div className="rb-spark-empty" />}
      />
      <Tile
        label="Max drawdown" value={fmtSigned(stats.maxDD, currency, { digits: 0 })} tone={stats.maxDD < 0 ? 'neg' : ''}
        sub={`${stats.maxDDPct.toFixed(2)}% from peak`}
        viz={<div className="rb-meter"><i style={{ width: `${Math.min(100, Math.abs(stats.maxDDPct) * 5)}%` }} /></div>}
      />
      <Tile
        label="Sharpe" value={fmtNum(stats.sharpe)} tone={stats.sharpe > 0 ? 'pos' : stats.sharpe < 0 ? 'neg' : ''}
        sub={`Sortino ${fmtNum(stats.sortino)} · per trade`}
        viz={<div className="rb-spark-empty" />}
      />
    </div>
  );
}

/* ------------------------------- calendar ------------------------------- */
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarPanelBody({ daily, currency, initialMonth }) {
  const [cursor, setCursor] = useState(() => {
    const base = initialMonth || (daily.length ? daily[daily.length - 1].date : new Date().toISOString().slice(0, 10));
    return { y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 };
  });

  const map = useMemo(() => new Map(daily.map((d) => [d.date, d])), [daily]);
  const { cells, rows, monthNet, monthDays } = useMemo(() => {
    const first = new Date(Date.UTC(cursor.y, cursor.m, 1));
    const lead = (first.getUTCDay() + 6) % 7; // Monday first
    const dim = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
    const total = Math.ceil((lead + dim) / 7) * 7;
    const out = [];
    let net = 0;
    let days = 0;
    let weekNet = 0;
    let weekN = 0;
    for (let i = 0; i < total; i += 1) {
      const dayNum = i - lead + 1;
      if (dayNum >= 1 && dayNum <= dim) {
        const key = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const d = map.get(key);
        out.push({ key, dayNum, d });
        if (d) { net += d.net; days += 1; weekNet += d.net; weekN += d.n; }
      } else {
        out.push({ key: `e${i}`, empty: true });
      }
      if (i % 7 === 6) {
        out.push({ key: `w${i}`, week: true, net: weekNet, n: weekN });
        weekNet = 0; weekN = 0;
      }
    }
    return { cells: out, rows: total / 7, monthNet: net, monthDays: days };
  }, [cursor, map]);

  const maxAbs = useMemo(() => Math.max(1, ...daily.map((d) => Math.abs(d.net))), [daily]);
  const todayKey = new Date().toISOString().slice(0, 10);
  const label = new Date(Date.UTC(cursor.y, cursor.m, 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const shift = (n) => setCursor((c) => {
    const d = new Date(Date.UTC(c.y, c.m + n, 1));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  });

  return (
    <div className="cx">
      <div className="cx-sum">
        <span className="chip">Month <b className={toneOf(monthNet)}>{fmtSigned(monthNet, currency, { digits: 0 })}</b></span>
        <span className="chip">Trading days <b>{monthDays}</b></span>
        <span className="cx-nav" style={{ marginLeft: 'auto' }}>
          <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={14} /></button>
          <span className="cx-month">{label}</span>
          <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={14} /></button>
        </span>
      </div>
      <div className="cx-grid" style={{ gridTemplateRows: `auto repeat(${rows}, minmax(0, 1fr))` }}>
        {[...DOW, 'Week'].map((d) => <div key={d} className="cx-dow">{d}</div>)}
        {cells.map((c) => {
          if (c.empty) return <div key={c.key} className="cx-cell is-empty" />;
          if (c.week) {
            return (
              <div key={c.key} className="cx-cell is-week">
                <span className="cx-date">{c.n ? `${c.n}t` : ''}</span>
                <span className={`cx-val ${toneOf(c.net)}`}>{c.n ? fmtCompact(c.net, currency) : ''}</span>
              </div>
            );
          }
          const a = c.d ? Math.min(1, Math.abs(c.d.net) / maxAbs) : 0;
          const bg = c.d ? (c.d.net >= 0 ? `rgba(53,196,161,${0.08 + a * 0.3})` : `rgba(255,92,92,${0.08 + a * 0.3})`) : undefined;
          return (
            <div key={c.key} className={`cx-cell${c.key === todayKey ? ' is-today' : ''}`} style={bg ? { background: bg } : undefined}
              title={c.d ? `${c.key}: ${fmtSigned(c.d.net, currency)} (${c.d.n} trades)` : c.key}>
              <span className="cx-date">{c.dayNum}</span>
              {c.d && <span className={`cx-val ${toneOf(c.d.net)}`}>{fmtCompact(c.d.net, currency)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------- breakdown ------------------------------- */
export function BreakdownBody({ stats, currency }) {
  const groups = [
    { title: 'By instrument', rows: stats.bySymbol },
    { title: 'By side', rows: stats.bySide },
  ];
  const max = Math.max(1, ...stats.bySymbol.concat(stats.bySide).map((r) => Math.abs(r.net)));
  if (!stats.n) return <div className="pc-empty"><b>No data yet</b><span>Close a trade to see the breakdown.</span></div>;

  return (
    <div className="bk">
      {groups.map((g) => (
        <div key={g.title} style={{ display: 'contents' }}>
          <div className="hb-head">{g.title}</div>
          {g.rows.map((r) => {
            const w = (Math.abs(r.net) / max) * 50;
            return (
              <div key={r.key} className="bk-row">
                <span className="bk-name">{r.key}</span>
                <span className="bk-track">
                  <i className="bk-axis" style={{ left: '50%' }} />
                  <i className={`bk-fill ${r.net >= 0 ? 'w' : 'l'}`} style={r.net >= 0 ? { left: '50%', width: `${w}%` } : { right: '50%', width: `${w}%` }} />
                </span>
                <span className={`bk-val ${toneOf(r.net)}`}>{fmtSigned(r.net, currency, { digits: 0 })}</span>
                <span className="bk-meta">{r.n} trades · {r.winRate.toFixed(0)}% win</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

