import { useMemo } from 'react';

const isPending = (e) => e.actual === null || e.actual === undefined || e.actual === '';

export default function StatsStrip({ events = [] }) {
  const s = useMemo(() => {
    let high = 0;
    let released = 0;
    for (const e of events) {
      if (e.impact === 'high') high += 1;
      if (!isPending(e)) released += 1;
    }
    return { total: events.length, high, released, pending: events.length - released };
  }, [events]);

  const pct = s.total ? Math.round((s.released / s.total) * 100) : 0;

  return (
    <div className="ec-card es-card">
      <div className="es-grid">
        <div className="es-tile"><span className="es-val">{s.total}</span><span className="es-lab">Events in range</span></div>
        <div className="es-tile is-high"><span className="es-val">{s.high}</span><span className="es-lab">High impact</span></div>
        <div className="es-tile is-win"><span className="es-val">{s.released}</span><span className="es-lab">Released</span></div>
        <div className="es-tile"><span className="es-val">{s.pending}</span><span className="es-lab">Still to come</span></div>
      </div>
      <div className="es-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Share of events released">
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}