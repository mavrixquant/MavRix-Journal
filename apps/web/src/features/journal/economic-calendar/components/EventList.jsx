// apps/web/src/features/journal/economic-calendar/components/EventList.jsx
//
// Grouped list view: one section per calendar day, sticky date headers.
//
// Auto-scroll behaviour:
//   • Fires on mount, on filter changes (new events array), on target
//     event id change (30s clock rollover), AND on slow data arrival
//     (retries if the row isn't in the DOM yet).
//   • No "already scrolled" guard — react-query structural sharing keeps
//     `events` reference-stable across identical responses, so background
//     refetches don't cause spurious scrolls.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import {
  resolveTimezone,
  dayKey,
  formatTime,
} from '@/shared/format/datetime';

const CLOCK_TICK_MS = 30_000;
const SCROLL_RETRY_MS = 150;
const SCROLL_MAX_ATTEMPTS = 10;

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                         */
/* ------------------------------------------------------------------ */

const CSS = `
  .el-root {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --win: #22c55e;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .el-col-head {
    flex-shrink: 0;
    display: grid;
    grid-template-columns: 72px 56px 1fr 90px 90px 90px;
    gap: 12px;
    padding: 12px 18px 10px;
    border-bottom: 1px solid var(--line-soft);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
    background: rgba(0,0,0,.10);
  }
  .el-col-head > span:not(.el-head-name) { text-align: right; }

  .el-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 0 18px 18px;
    overscroll-behavior: contain;
  }
  .el-scroll::-webkit-scrollbar { width: 8px; }
  .el-scroll::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }
  .el-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,.14);
  }

  .el-day { margin-bottom: 20px; }
  .el-day:last-child { margin-bottom: 0; }
  .el-day:first-child { margin-top: 4px; }

  .el-day-head {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 8px 12px;
    margin-bottom: 6px;
    background: rgba(15,18,25,.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
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
  .el-day-title.is-today { color: var(--accent); }
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
    grid-template-columns: 72px 56px 1fr 90px 90px 90px;
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
    outline: none;
  }
  .el-row:hover {
    background: rgba(255,255,255,.04);
    border-color: rgba(255,255,255,.1);
    transform: translateX(2px);
  }
  .el-row:focus-visible {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.18);
  }

  .el-row.is-current-pending {
    background: linear-gradient(
      90deg,
      rgba(245,158,11,.14) 0%,
      rgba(245,158,11,.05) 60%,
      rgba(245,158,11,.015) 100%
    );
    border-color: rgba(245,158,11,.42);
    box-shadow:
      inset 3px 0 0 #F59E0B,
      0 0 20px -8px rgba(245,158,11,.45);
  }
  .el-row.is-current-pending:hover {
    background: linear-gradient(
      90deg,
      rgba(245,158,11,.20) 0%,
      rgba(245,158,11,.08) 60%,
      rgba(245,158,11,.03) 100%
    );
    border-color: rgba(245,158,11,.60);
  }
  .el-row.is-current-pending .el-time {
    color: #FDE68A;
    font-weight: 700;
  }
  .el-row.is-current-pending .el-name {
    color: #FFFFFF;
    font-weight: 600;
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
    white-space: nowrap;
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
  .el-cur-dot.high   { background: #F59E0B; box-shadow: 0 0 6px rgba(245,158,11,.5); }
  .el-cur-dot.medium { background: #60A5FA; }
  .el-cur-dot.low    { background: #545E6E; }

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
  .el-val.is-released { color: var(--win); font-weight: 700; }
  .el-val.is-empty { color: var(--ink-3); }

  .el-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    margin: 18px;
    text-align: center;
    border: 1px dashed rgba(255,255,255,.10);
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
    .el-col-head { display: none; }
    .el-row {
      grid-template-columns: 60px 44px 1fr;
      row-gap: 8px;
    }
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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDayTitle(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatValue(v) {
  if (v === null || v === undefined || v === '') return null;
  return String(v);
}

function isPending(e) {
  const a = e.actual;
  return a === null || a === undefined || a === '';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EventList({ events = [], onEventClick }) {
  const { settings } = useSettings();
  const timezone = settings.preferences.timezone;
  const timeFormat = settings.preferences.timeFormat;

  const tz = useMemo(() => resolveTimezone(timezone), [timezone]);

  /* -------- Live clock -------- */

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(iv);
  }, []);

  const nowIso = useMemo(() => new Date(now).toISOString(), [now]);
  const todayKey = useMemo(() => dayKey(nowIso, tz), [nowIso, tz]);

  /* -------- Group events by day in the user's tz -------- */

  const grouped = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      if (!e.dateTimeUtc) continue;
      const key = dayKey(e.dateTimeUtc, tz);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events, tz]);

  /* -------- Current pending (recomputes as clock ticks) -------- */

  const currentPendingId = useMemo(() => {
    const todayEntry = grouped.find(([k]) => k === todayKey);
    if (!todayEntry) return null;

    const pending = todayEntry[1].filter(isPending);
    if (pending.length === 0) return null;

    const sorted = [...pending].sort(
      (a, b) =>
        new Date(a.dateTimeUtc).getTime() - new Date(b.dateTimeUtc).getTime()
    );

    const next = sorted.find(
      (e) => new Date(e.dateTimeUtc).getTime() >= now
    );

    return (next || sorted[sorted.length - 1]).id;
  }, [grouped, todayKey, now]);

  /* -------- Auto-scroll with retries -------- */

  const containerRef = useRef(null);

  useEffect(() => {
    if (!currentPendingId) return;
    if (events.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let attempt = 0;
    let timerId = null;

    const tryScroll = () => {
      if (cancelled) return;

      const target = container.querySelector('[data-current-pending="true"]');

      if (target) {
        const cRect = container.getBoundingClientRect();
        const tRect = target.getBoundingClientRect();
        const delta =
          tRect.top - cRect.top - cRect.height / 2 + tRect.height / 2;

        container.scrollTo({
          top: container.scrollTop + delta,
          behavior: 'smooth',
        });
        return;
      }

      attempt += 1;
      if (attempt < SCROLL_MAX_ATTEMPTS) {
        timerId = setTimeout(tryScroll, SCROLL_RETRY_MS);
      }
    };

    timerId = setTimeout(tryScroll, SCROLL_RETRY_MS);

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [currentPendingId, events]);

  /* -------- Empty state -------- */

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

  /* -------- Render -------- */

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

        <div className="el-scroll" ref={containerRef}>
          {grouped.map(([dateKey, dayEvents]) => {
            const isToday = dateKey === todayKey;
            return (
              <div key={dateKey} className="el-day">
                <div className="el-day-head">
                  <span className={`el-day-title ${isToday ? 'is-today' : ''}`}>
                    {isToday ? 'Today' : formatDayTitle(dateKey)}
                  </span>
                  <span className="el-day-sub">{dateKey}</span>
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
                    const isCurrentPending = e.id === currentPendingId;

                    return (
                      <button
                        key={e.id}
                        type="button"
                        data-current-pending={
                          isCurrentPending ? 'true' : undefined
                        }
                        className={`el-row${isCurrentPending ? ' is-current-pending' : ''}`}
                        onClick={() => onEventClick && onEventClick(e.id)}
                      >
                        <span className="el-time">
                          {formatTime(e.dateTimeUtc, timeFormat, tz)}
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
      </div>
    </>
  );
}