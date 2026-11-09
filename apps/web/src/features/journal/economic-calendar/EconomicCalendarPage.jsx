import { useEffect, useMemo, useState } from 'react';

import {
  useCalendarEvents,
  useCalendarCurrencies,
  useCalendarMeta,
} from '@/shared/api/calendar';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

import { useCalendarFilters } from './hooks/useCalendarFilters';
import CalendarFilters from './components/CalendarFilters';
import EventList from './components/EventList';
import EventDetailModal from './components/EventDetailModal';
import MarketGlobe from './components/MarketGlobe';
import StatsStrip from './components/StatsStrip';
import ComingUp from './components/ComingUp';

const CSS = `
  .ec-root {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --win: #22c55e;
    width: 100%; margin: 0 auto; box-sizing: border-box;
    display: flex; flex-direction: column; gap: 14px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    height: calc(100vh - 108px); height: calc(100dvh - 108px);
    min-height: 560px; overflow: hidden;
  }
  @media (min-width: 1024px) {
    .ec-root { height: calc(100vh - 116px); height: calc(100dvh - 116px); }
  }

  .ec-card {
    position: relative; border-radius: 18px;
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden; flex-shrink: 0;
  }
  .ec-toolbar { padding: 10px 14px; }

  /* Two-column workspace: data on the left, globe + upcoming on the right */
  .ec-main {
    flex: 1 1 auto; min-height: 0;
    display: grid; grid-template-columns: minmax(0, 1fr) 460px; gap: 14px;
  }
  .ec-left { display: flex; flex-direction: column; gap: 14px; min-height: 0; min-width: 0; }
  .ec-right {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,.08) transparent;
  }
  .ec-right::-webkit-scrollbar { width: 6px; }
  .ec-right::-webkit-scrollbar-track { background: transparent; }
  .ec-right::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }
  .ec-right::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,.14);
  }
  .ec-grow { flex: 1 0 auto; min-height: 420px; }

  .ec-body { flex: 1 1 auto; min-height: 0; padding: 0; display: flex; flex-direction: column; overflow: hidden; }
  .ec-loading {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 14px; padding: 60px 20px; color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12.5px;
  }
  .ec-spinner {
    width: 28px; height: 28px; border: 2.5px solid var(--line);
    border-top-color: var(--accent); border-radius: 50%; animation: ecSpin .8s linear infinite;
  }
  .ec-error {
    flex: 1; display: flex; align-items: center; justify-content: center; padding: 60px 20px;
    text-align: center; color: #fca5a5;
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12.5px; line-height: 1.6;
  }
  @keyframes ecSpin { to { transform: rotate(360deg); } }

  /* ---------- Stats strip ---------- */
  .es-card { padding: 0; }
  .es-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
  .es-tile { display: flex; flex-direction: column; gap: 4px; padding: 14px 20px 12px; }
  .es-tile + .es-tile { border-left: 1px solid var(--line-soft); }
  .es-val {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 24px; font-weight: 700; letter-spacing: -.02em; line-height: 1.1; color: var(--ink-1);
  }
  .es-tile.is-high .es-val { color: var(--accent); }
  .es-tile.is-win .es-val { color: var(--win); }
  .es-lab { font-size: 12px; color: var(--ink-2); }
  .es-bar { height: 2px; background: var(--line-soft); }
  .es-bar span {
    display: block; height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent-2, var(--accent)));
    transition: width .5s cubic-bezier(.2,.8,.25,1);
  }

  /* ---------- Globe card ---------- */
  .eg-card { padding: 0; }
  .eg-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 18px 0; }
  .eg-title { font-size: 14px; font-weight: 600; letter-spacing: -.01em; }
  .eg-sub { margin-top: 2px; font-size: 12px; color: var(--ink-2); }
  .eg-live {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 10.5px; font-weight: 600; color: var(--ink-2);
  }
  .eg-live i {
    width: 6px; height: 6px; border-radius: 50%; background: var(--win);
    box-shadow: 0 0 8px rgba(34,197,94,.7); animation: egPulse 1.8s ease-in-out infinite;
  }
  @keyframes egPulse { 0%,100% { opacity: .4; } 50% { opacity: 1; } }

  .eg-stage-wrap { position: relative; }
  .eg-stage {
    position: relative;
    height: clamp(230px, 36vh, 360px);
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--accent) 13%, transparent), transparent 62%);
  }
  .eg-canvas { cursor: grab; touch-action: none; max-width: 100%; display: block; }
  .eg-tip {
    position: absolute; transform: translate(-50%, calc(-100% - 16px)); pointer-events: none; white-space: nowrap;
    padding: 5px 9px; border-radius: 8px; background: rgba(10,13,19,.92); border: 1px solid var(--line);
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; color: var(--ink-2);
  }
  .eg-tip b { color: var(--accent); }
  .eg-loading {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12px; color: var(--ink-3); pointer-events: none;
  }
  .eg-next {
    position: absolute; left: 12px; right: 12px; bottom: 10px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 10px 14px; border-radius: 12px; text-align: left; cursor: pointer; font: inherit; color: inherit;
    background: rgba(10,13,19,.72); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
    transition: border-color .18s, background .18s;
  }
  .eg-next:hover { border-color: color-mix(in srgb, var(--accent) 60%, transparent); background: rgba(10,13,19,.85); }
  .eg-next:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent); }
  .eg-next.is-empty { justify-content: center; color: var(--ink-3); font-size: 12px; cursor: default; border-color: var(--line); }
  .eg-next-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .eg-next-label { font-size: 11px; color: var(--ink-2); }
  .eg-next-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .eg-count {
    flex-shrink: 0; display: inline-flex; align-items: baseline; gap: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 20px; font-weight: 700;
    letter-spacing: -.02em; color: var(--accent); font-variant-numeric: tabular-nums;
  }
  .eg-count-d { font-size: 12px; color: var(--ink-2); }

  .eg-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 18px 16px; }
  .eg-chip {
    display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 99px;
    border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.025); color: var(--ink-2); cursor: pointer;
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; transition: all .16s;
  }
  .eg-chip b { font-weight: 700; color: var(--ink-1); }
  .eg-chip:hover { border-color: rgba(255,255,255,.2); background: rgba(255,255,255,.05); }
  .eg-chip:focus-visible { outline: none; border-color: var(--accent); }
  .eg-chip.is-active {
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent);
  }
  .eg-chip.is-active b { color: var(--accent); }
  .eg-chip-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 6px color-mix(in srgb, var(--accent) 60%, transparent); }

  /* ---------- Coming up ---------- */
  .cu-card { display: flex; flex-direction: column; }
  .cu-head { display: flex; align-items: center; gap: 8px; padding: 14px 18px 10px; border-bottom: 1px solid var(--line-soft); flex-shrink: 0; }
  .cu-title { font-size: 14px; font-weight: 600; letter-spacing: -.01em; }
  .cu-count { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; color: var(--ink-3); }
  .cu-toggle {
    margin-left: auto; padding: 5px 10px; border-radius: 8px; cursor: pointer;
    border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); color: var(--ink-2);
    font-size: 11.5px; font-weight: 500; transition: all .16s;
  }
  .cu-toggle:hover { color: var(--ink-1); border-color: rgba(255,255,255,.2); }
  .cu-toggle:focus-visible { outline: none; border-color: var(--accent); }
  .cu-toggle.is-active {
    color: var(--accent); border-color: color-mix(in srgb, var(--accent) 42%, transparent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }
  .cu-scroll { padding: 8px; }
  .cu-scroll::-webkit-scrollbar { width: 6px; }
  .cu-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 99px; }
  .cu-empty { padding: 28px 16px; text-align: center; color: var(--ink-3); font-size: 12.5px; line-height: 1.5; }
  .cu-row {
    width: 100%; display: grid; grid-template-columns: 62px 1fr auto; align-items: center; gap: 12px;
    padding: 9px 10px; border-radius: 10px; border: 1px solid transparent; background: transparent;
    text-align: left; cursor: pointer; font: inherit; color: inherit; transition: background .15s, border-color .15s;
  }
  .cu-row:hover { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.08); }
  .cu-row:focus-visible { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent); }
  .cu-when { display: flex; flex-direction: column; gap: 2px; }
  .cu-when b { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12px; font-weight: 600; color: var(--ink-1); white-space: nowrap; }
  .cu-when i { font-style: normal; font-size: 11px; color: var(--ink-3); }
  .cu-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .cu-name { font-size: 13px; font-weight: 500; letter-spacing: -.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cu-meta { display: inline-flex; align-items: center; gap: 6px; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 10.5px; color: var(--ink-2); }
  .cu-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .cu-dot.high { background: var(--accent); box-shadow: 0 0 6px color-mix(in srgb, var(--accent) 55%, transparent); }
  .cu-dot.medium { background: #60A5FA; }
  .cu-dot.low { background: #545E6E; }
  .cu-in { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; color: var(--ink-3); white-space: nowrap; }

  /* ---------- Responsive ---------- */
  @media (max-width: 1180px) {
    .ec-main { grid-template-columns: minmax(0, 1fr) 400px; }
    .es-val { font-size: 20px; }
  }
  @media (min-width: 1600px) {
    .ec-main {
      grid-template-columns: minmax(0, 1300px) 500px;
      justify-content: center;
    }
  }
  @media (max-width: 980px) {
    .ec-root { height: auto; overflow: visible; }
    .ec-main { display: flex; flex-direction: column; }
    .ec-body { height: 620px; flex: none; }
    .cu-card { height: 420px; flex: none; }
    .eg-stage { height: 300px; }
  }
  @media (max-width: 560px) {
    .es-grid { grid-template-columns: repeat(2, 1fr); }
    .es-tile:nth-child(3) { border-left: none; }
    .es-tile:nth-child(n+3) { border-top: 1px solid var(--line-soft); }
  }
  @media (prefers-reduced-motion: reduce) {
    .ec-spinner, .eg-live i { animation: none !important; }
    .es-bar span { transition: none; }
  }
`;

const isPending = (e) => e.actual === null || e.actual === undefined || e.actual === '';
const pad = (n) => String(n).padStart(2, '0');
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function useNow(ms) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(iv);
  }, [ms]);
  return now;
}

export default function EconomicCalendarPage() {
  const filters = useCalendarFilters();
  const meta = useCalendarMeta();
  const currencies = useCalendarCurrencies();
  const now = useNow(30_000);

  // Main data: follows the filters (list / month views + stats)
  const eventsQuery = useCalendarEvents(filters.query, {
    enabled: !!filters.from && !!filters.to,
  });
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  // Side data: the next 7 days, independent of the filters (globe + coming up)
  const dayStamp = new Date(now).toDateString();
  const weekRange = useMemo(() => {
    const t = new Date();
    const end = new Date(t);
    end.setDate(end.getDate() + 7);
    return { from: toIso(t), to: toIso(end) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayStamp]);
  const weekQuery = useCalendarEvents(weekRange);
  const week = useMemo(() => weekQuery.data ?? [], [weekQuery.data]);

  const geoStats = useMemo(() => {
    const map = new Map();
    for (const e of week) {
      if (!e.currency) continue;
      const s = map.get(e.currency) ?? { currency: e.currency, count: 0, high: 0, pending: 0 };
      s.count += 1;
      if (e.impact === 'high') s.high += 1;
      if (isPending(e)) s.pending += 1;
      map.set(e.currency, s);
    }
    return [...map.values()].sort((a, b) => b.high - a.high || b.count - a.count);
  }, [week]);

  const upcoming = useMemo(() => {
    const scoped = filters.currencies.length
      ? week.filter((e) => filters.currencies.includes(e.currency))
      : week;
    return scoped
      .filter((e) => e.dateTimeUtc && isPending(e) && new Date(e.dateTimeUtc).getTime() >= now - 15 * 60_000)
      .sort((a, b) => new Date(a.dateTimeUtc) - new Date(b.dateTimeUtc));
  }, [week, filters.currencies, now]);

  const nextEvent = useMemo(() => {
    const future = upcoming.filter((e) => new Date(e.dateTimeUtc).getTime() >= now);
    return future.find((e) => e.impact === 'high') ?? future[0] ?? null;
  }, [upcoming, now]);

  const selectedEvent = useMemo(() => {
    if (!filters.selectedEventId) return null;
    return (
      events.find((e) => e.id === filters.selectedEventId) ??
      week.find((e) => e.id === filters.selectedEventId) ??
      null
    );
  }, [events, week, filters.selectedEventId]);

  const [focus, setFocus] = useState(null);
  const handlePickCurrency = (code) => {
    if (!filters.currencies.includes(code)) setFocus({ currency: code, n: Date.now() });
    filters.toggleCurrency(code);
  };

  const showInitialSkeleton = eventsQuery.isPending && eventsQuery.data === undefined;
  const showError = eventsQuery.isError;

  const subText = meta.data?.totalEvents
    ? `${meta.data.totalEvents.toLocaleString()} events cached · live from Biquote`
    : 'Live macro releases · CPI · NFP · FOMC · central banks';

  usePageHeader({ title: 'Economic Calendar', subtitle: subText });

  return (
    <>
      <style>{CSS}</style>
      <div className="ec-root page-fade-in">
        

        <div className="ec-main">
          <section className="ec-left">
  <div className="ec-card ec-toolbar">
            <CalendarFilters
              availableCurrencies={currencies.data ?? []}
              currencies={filters.currencies}
              impacts={filters.impacts}
              toggleCurrency={filters.toggleCurrency}
              clearCurrencies={filters.clearCurrencies}
              toggleImpact={filters.toggleImpact}
              clearImpacts={filters.clearImpacts}
              from={filters.from}
              to={filters.to}
              rangePreset={filters.rangePreset}
              applyPreset={filters.applyPreset}
              setCustomRange={filters.setCustomRange}
            />
          </div>

            <StatsStrip events={events} />

            <div className="ec-card ec-body">
              {showInitialSkeleton && (
                <div className="ec-loading">
                  <div className="ec-spinner" />
                  <span>Loading events…</span>
                </div>
              )}

              {showError && (
                <div className="ec-error">
                  Could not load events. {eventsQuery.error?.message || 'Unknown error.'}
                  <br />
                  If this persists, check that the API is running and the calendar
                  sync has completed at least once.
                </div>
              )}

              {!showInitialSkeleton && !showError && (
                <EventList events={events} onEventClick={filters.openEvent} />
              )}
            </div>
          </section>

          <aside className="ec-right">
            <MarketGlobe
              stats={geoStats}
              selected={filters.currencies}
              focus={focus}
              next={nextEvent}
              loading={weekQuery.isPending}
              onPick={handlePickCurrency}
              onOpenEvent={filters.openEvent}
            />
            <ComingUp events={upcoming} now={now} onOpenEvent={filters.openEvent} />
          </aside>
        </div>
      </div>

      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={filters.closeEvent} />
      )}
    </>
  );
}