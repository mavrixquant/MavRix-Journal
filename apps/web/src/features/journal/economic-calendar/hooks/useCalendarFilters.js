
import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_CALENDAR_CURRENCIES,
  DEFAULT_CALENDAR_DAYS_BACK,
  DEFAULT_CALENDAR_DAYS_FORWARD,
} from '@mavrix/shared';


function toIsoDate(d) {
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


export function useCalendarFilters() {
  const initialRange = useMemo(
    () => rangeFromPreset('today') ?? { from: '', to: '' },
    []
  );

  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [rangePreset, setRangePreset] = useState('today');

  const [currencies, setCurrencies] = useState([]);
  const [impacts, setImpacts] = useState([]);

  const [view, setView] = useState('list');

  const [selectedEventId, setSelectedEventId] = useState(null);


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


  const openEvent = useCallback((id) => setSelectedEventId(id), []);
  const closeEvent = useCallback(() => setSelectedEventId(null), []);


  const query = useMemo(
    () => ({ from, to, currencies, impacts }),
    [from, to, currencies, impacts]
  );

  return {
    from,
    to,
    rangePreset,
    applyPreset,
    setCustomRange,
    goToToday,

    currencies,
    impacts,
    toggleCurrency,
    clearCurrencies,
    useDefaultCurrencies,
    toggleImpact,
    clearImpacts,

    view,
    setView,

    selectedEventId,
    openEvent,
    closeEvent,

    query,
  };
}