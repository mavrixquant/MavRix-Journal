// apps/web/src/features/journal/economic-calendar/EconomicCalendarPage.jsx
//
// Economic Calendar — read-only feed of macro releases (CPI, NFP, FOMC, etc.)
// sourced from Biquote and cached on the API. Fully independent from trades.
//
// Title + subtitle are published to the GLOBAL header bar via usePageHeader().
// The List/Month view toggle has moved down into <CalendarFilters /> so it
// sits next to the Sync button on the same row.
//
// Layout:
//   ┌──────────────────────────────────────────────────────────────┐
//   │  Filters card: impact / currency / date / view toggle / sync │
//   ├──────────────────────────────────────────────────────────────┤
//   │  Content: List view  OR  Month grid                          │
//   └──────────────────────────────────────────────────────────────┘

import { useMemo } from 'react';

import {
  useCalendarEvents,
  useCalendarCurrencies,
  useCalendarMeta,
} from '@/shared/api/calendar';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

import { useCalendarFilters } from './hooks/useCalendarFilters';
import CalendarFilters from './components/CalendarFilters';
import CalendarGrid from './components/CalendarGrid';
import EventList from './components/EventList';
import EventDetailModal from './components/EventDetailModal';

/* ------------------------------------------------------------------ */
/*  Page-local CSS.                                                    */
/*  Header chrome now lives in the global HeaderBar. This block only   */
/*  covers the content card shell + loading/error states.              */
/* ------------------------------------------------------------------ */

const CSS = `
  .ec-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 18px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* Content cards (filters + events) — glass panels. */
  .ec-card {
    position: relative;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
  }
  .ec-body { padding: 4px 18px 18px; }

  .ec-loading {
    padding: 80px 20px;
    text-align: center;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }
  .ec-spinner {
    width: 28px;
    height: 28px;
    border: 2.5px solid var(--line);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: ecSpin .8s linear infinite;
  }
  .ec-error {
    padding: 24px 20px;
    text-align: center;
    border-radius: 12px;
    background: rgba(239,68,68,.06);
    border: 1px solid rgba(239,68,68,.22);
    color: #fca5a5;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    line-height: 1.6;
  }

  @keyframes ecSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .ec-spinner { animation: none !important; }
  }
  @media (max-width: 640px) {
    .ec-root { padding: 16px; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EconomicCalendarPage() {
  const filters = useCalendarFilters();

  const meta = useCalendarMeta();
  const currencies = useCalendarCurrencies();

  const eventsQuery = useCalendarEvents(filters.query, {
    enabled: !!filters.from && !!filters.to,
  });

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  const selectedEvent = useMemo(() => {
    if (!filters.selectedEventId) return null;
    return events.find((e) => e.id === filters.selectedEventId) ?? null;
  }, [events, filters.selectedEventId]);

  const handleDayClick = (isoDate) => {
    filters.setCustomRange(isoDate, isoDate);
    filters.setView('list');
  };

  const showInitialSkeleton =
    eventsQuery.isPending && eventsQuery.data === undefined;

  const showError = eventsQuery.isError;

  // Publish title + dynamic subtitle to the global header bar.
  const subText = meta.data?.totalEvents
    ? `${meta.data.totalEvents.toLocaleString()} events cached · live from Biquote`
    : 'Live macro releases · CPI · NFP · FOMC · central banks';

  usePageHeader({
    title: 'Economic Calendar',
    subtitle: subText,
  });

  return (
    <>
      <style>{CSS}</style>
      <div className="ec-root">

        {/* ---------- Filters card (view toggle lives here now) ---------- */}
        <div className="ec-card" style={{ padding: '18px 22px' }}>
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
            goToToday={filters.goToToday}
            view={filters.view}
            setView={filters.setView}
          />
        </div>

        {/* ---------- Content card ---------- */}
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

          {!showInitialSkeleton && !showError && filters.view === 'list' && (
            <EventList events={events} onEventClick={filters.openEvent} />
          )}

          {!showInitialSkeleton && !showError && filters.view === 'month' && (
            <CalendarGrid events={events} onDayClick={handleDayClick} />
          )}
        </div>
      </div>

      {/* ---------- Detail modal ---------- */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={filters.closeEvent}
        />
      )}
    </>
  );
}