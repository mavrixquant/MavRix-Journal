
import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_CALENDAR_CURRENCIES,
} from '@mavrix/shared';


function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeFromPreset(preset) {
  const today = new Date();
  switch (preset) {
    case 'today':
      return { from: toIsoDate(today), to: toIsoDate(today) };
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
    setRangePreset('custom');
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
  setImpacts((prev) => {
    const next = prev.includes(level) ? prev.filter((i) => i !== level) : [...prev, level];
    // All 3 impacts selected = same as "All" (no filter)
    return next.length >= 3 ? [] : next;
  });
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

    selectedEventId,
    openEvent,
    closeEvent,

    query,
  };
}