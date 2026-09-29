// apps/web/src/features/journal/economic-calendar/components/EventList.jsx
//
// Grouped list view: one section per calendar day, sticky date headers,
// one row per event. Rows are clickable → onEventClick(id) opens the modal.
//
// Visual conventions:
//   - Released events (actual !== null) show actual in green.
//   - Pending events show a pulsing dot in the time column.
//   - Impact dots mirror the grid view.

import { useMemo } from 'react';

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                         */
/* ------------------------------------------------------------------ */

const CSS = `
  .el-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --impact-high: #F59E0B;
    --impact-medium: #60A5FA;
    --impact-low: #545E6E;
    --win: #22c55e;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  }

  .el-day {
    margin-bottom: 20px;
  }
  .el-day:last-child { margin-bottom: 0; }

  .el-day-head {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 8px 12px;
    margin-bottom: 6px;
    background: rgba(15,18,25,.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .el-day-title {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--ink-1);
  }
  .el-day-title.is-today {
    color: var(--accent);
  }
  .el-day-sub {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    color: var(--ink-3);
    letter-spacing: .04em;
  }
  .el-day-count {
    margin-left: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    color: var(--ink-3);
  }

  .el-rows {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .el-row {
    display: grid;
    grid-template-columns: 62px 56px 1fr 90px 90px 90px;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: rgba(255,255,255,.015);
    cursor: pointer;
    transition: all .15s cubic-bezier(.2,.8,.25,1);
    text-align: left;
    width: 100%;
    font-family: inherit;
  }
  .el-row:hover {
    background: rgba(255,255,255,.04);
    border-color: rgba(255,255,255,.1);
    transform: translateX(2px);
  }

  .el-time {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ink-2);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    letter-spacing: .02em;
  }
  .el-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px rgba(245,158,11,.7);
    animation: elPulse 1.8s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes elPulse {
    0%, 100% { opacity: .35; transform: scale(.8); }
    50%      { opacity: 1;   transform: scale(1.15); }
  }

  .el-cur {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .08em;
    color: var(--ink-2);
  }
  .el-cur-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .el-cur-dot.high   { background: var(--impact-high);   box-shadow: 0 0 6px rgba(245,158,11,.5); }
  .el-cur-dot.medium { background: var(--impact-medium); }
  .el-cur-dot.low    { background: var(--impact-low); }

  .el-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-1);
    letter-spacing: -.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .el-val {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    color: var(--ink-2);
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: .01em;
  }
  .el-val.is-released {
    color: var(--win);
    font-weight: 700;
  }
  .el-val.is-empty {
    color: var(--ink-3);
  }

  .el-col-head {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--ink-3);
    padding: 4px 12px 0;
    display: grid;
    grid-template-columns: 62px 56px 1fr 90px 90px 90px;
    gap: 12px;
  }
  .el-col-head > span:not(.el-head-name) {
    text-align: right;
  }

  .el-empty {
    padding: 60px 20px;
    text-align: center;
    border: 1px dashed rgba(255,255,255,.1);
    border-radius: 14px;
    background: rgba(255,255,255,.012);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    line-height: 1.7;
  }
  .el-empty b { color: var(--accent); }

  @media (prefers-reduced-motion: reduce) {
    .el-pulse { animation: none !important; opacity: 1; }
    .el-row { transition: none !important; }
  }

  @media (max-width: 820px) {
    .el-row {
      grid-template-columns: 52px 44px 1fr;
      row-gap: 8px;
    }
    .el-col-head {
      grid-template-columns: 52px 44px 1fr;
    }
    .el-col-head > span:not(.el-head-name) { display: none; }
    .el-val {
      text-align: left;
      grid-column: 3;
      font-size: 10.5px;
      color: var(--ink-3);
    }
    .el-val::before {
      content: attr(data-label) ' ';
      color: var(--ink-3);
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: .08em;
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Date utilities                                                     */
/* ------------------------------------------------------------------ */

function formatDayHeader(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function isToday(isoDate) {
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return isoDate === iso;
}

/* ------------------------------------------------------------------ */
/*  Value formatting                                                   */
/* ------------------------------------------------------------------ */

function formatValue(v) {
  if (v === null || v === undefined || v === '') return null;
  return String(v);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EventList({ events = [], onEventClick }) {
  // Group by date, keeping insertion order from the API (already sorted
  // ascending by dateTimeUtc).
  const grouped = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  if (grouped.length === 0) {
    return (
      <>
        <style>{CSS}</style>
        <div className="el-root">
          <div className="el-empty">
            No economic events match the current filters.
            <br />
            Try widening the date range or clearing the currency/impact filter.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="el-root">
        <div className="el-col-head">
          <span>Time</span>
          <span>Cur</span>
          <span className="el-head-name">Event</span>
          <span>Actual</span>
          <span>Forecast</span>
          <span>Previous</span>
        </div>

        {grouped.map(([date, dayEvents]) => {
          const today = isToday(date);
          return (
            <div key={date} className="el-day">
              <div className="el-day-head">
                <span className={`el-day-title ${today ? 'is-today' : ''}`}>
                  {today ? 'Today' : formatDayHeader(date)}
                </span>
                <span className="el-day-sub">{date}</span>
                <span className="el-day-count">
                  {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                </span>
              </div>

              <div className="el-rows">
                {dayEvents.map((e) => {
                  const actual = formatValue(e.actual);
                  const forecast = formatValue(e.forecast);
                  const previous = formatValue(e.previous);
                  const released = actual !== null;

                  return (
                    <button
                      key={e.id}
                      type="button"
                      className="el-row"
                      onClick={() => onEventClick && onEventClick(e.id)}
                    >
                      <span className="el-time">
                        {e.timeUtc}
                        {!released && <span className="el-pulse" />}
                      </span>

                      <span className="el-cur">
                        <span className={`el-cur-dot ${e.impact}`} />
                        {e.currency}
                      </span>

                      <span className="el-name" title={e.event}>
                        {e.event}
                      </span>

                      <span
                        className={`el-val ${released ? 'is-released' : 'is-empty'}`}
                        data-label="Actual"
                      >
                        {actual ?? '—'}
                      </span>

                      <span
                        className={`el-val ${forecast === null ? 'is-empty' : ''}`}
                        data-label="Forecast"
                      >
                        {forecast ?? '—'}
                      </span>

                      <span
                        className={`el-val ${previous === null ? 'is-empty' : ''}`}
                        data-label="Previous"
                      >
                        {previous ?? '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}