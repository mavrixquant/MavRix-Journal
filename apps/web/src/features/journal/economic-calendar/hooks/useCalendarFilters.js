// apps/web/src/features/journal/economic-calendar/hooks/useCalendarFilters.js
//
// Filter state for the Economic Calendar page.
//
// Owns:
//   - currencies   (array of ISO codes; empty = "all")
//   - impacts      (array of "high"|"medium"|"low"; empty = "all")
//   - from / to    (YYYY-MM-DD date strings for the API query window)
//   - rangePreset  (which quick-range button is active; null = custom)
//   - view         ("list" | "month")
//   - selectedEventId  (id of the event shown in the detail modal)
//
// Date helpers are local because the app has no date library and the
// operations are simple enough that introducing one would be overkill.

import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_CALENDAR_CURRENCIES,
  DEFAULT_CALENDAR_DAYS_BACK,
  DEFAULT_CALENDAR_DAYS_FORWARD,
} from '@mavrix/shared';

/* ------------------------------------------------------------------ */
/*  Date utilities                                                     */
/* ------------------------------------------------------------------ */

function toIsoDate(d) {
  // Local-time YYYY-MM-DD, not UTC. The user thinks in their own calendar,
  // and Biquote's `from`/`to` are inclusive day boundaries.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function rangeFromPreset(preset) {
  const today = new Date();
  switch (preset) {
    case 'today':
      return { from: toIsoDate(today), to: toIsoDate(today) };
    case 'week':
      return {
        from: toIsoDate(addDays(today, -DEFAULT_CALENDAR_DAYS_BACK)),
        to: toIsoDate(addDays(today, DEFAULT_CALENDAR_DAYS_FORWARD)),
      };
    case 'month':
      return {
        from: toIsoDate(addDays(today, -15)),
        to: toIsoDate(addDays(today, 15)),
      };
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useCalendarFilters() {
  // Range — default preset is "week" (-7/+14 days)
  const initialRange = useMemo(
    () => rangeFromPreset('week') ?? { from: '', to: '' },
    []
  );

  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [rangePreset, setRangePreset] = useState('week');

  // Filters — empty arrays mean "no filter" (show all)
  const [currencies, setCurrencies] = useState([]);
  const [impacts, setImpacts] = useState([]);

  // View mode
  const [view, setView] = useState('list');

  // Selected event for the detail modal
  const [selectedEventId, setSelectedEventId] = useState(null);

  /* ---------------- Range setters ---------------- */

  const applyPreset = useCallback((preset) => {
    const range = rangeFromPreset(preset);
    if (!range) return;
    setFrom(range.from);
    setTo(range.to);
    setRangePreset(preset);
  }, []);

  const setCustomRange = useCallback((nextFrom, nextTo) => {
    setFrom(nextFrom);
    setTo(nextTo);
    setRangePreset(null);
  }, []);

  const goToToday = useCallback(() => {
    applyPreset('today');
  }, [applyPreset]);

  /* ---------------- Filter setters ---------------- */

  const toggleCurrency = useCallback((code) => {
    setCurrencies((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }, []);

  const clearCurrencies = useCallback(() => setCurrencies([]), []);

  const useDefaultCurrencies = useCallback(
    () => setCurrencies([...DEFAULT_CALENDAR_CURRENCIES]),
    []
  );

  const toggleImpact = useCallback((level) => {
    setImpacts((prev) =>
      prev.includes(level) ? prev.filter((i) => i !== level) : [...prev, level]
    );
  }, []);

  const clearImpacts = useCallback(() => setImpacts([]), []);

  /* ---------------- Modal setters ---------------- */

  const openEvent = useCallback((id) => setSelectedEventId(id), []);
  const closeEvent = useCallback(() => setSelectedEventId(null), []);

  /* ---------------- Derived query object ---------------- */

  // Stable shape for useCalendarEvents. Arrays are already stable from
  // useState, so referential equality holds unless the user actually
  // toggled something.
  const query = useMemo(
    () => ({ from, to, currencies, impacts }),
    [from, to, currencies, impacts]
  );

  return {
    // range
    from,
    to,
    rangePreset,
    applyPreset,
    setCustomRange,
    goToToday,

    // filters
    currencies,
    impacts,
    toggleCurrency,
    clearCurrencies,
    useDefaultCurrencies,
    toggleImpact,
    clearImpacts,

    // view
    view,
    setView,

    // modal
    selectedEventId,
    openEvent,
    closeEvent,

    // derived
    query,
  };
}