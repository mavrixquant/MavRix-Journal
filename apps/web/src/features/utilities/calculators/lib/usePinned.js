import { useCallback, useEffect, useState } from 'react';
import { PINS_EVENT, getPinned, togglePinned } from './storage.js';

/** Pinned calculator ids, kept in sync across every card / page / tab. */
export function usePinned() {
  const [pins, setPins] = useState(getPinned);

  useEffect(() => {
    const sync = () => setPins(getPinned());
    window.addEventListener(PINS_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(PINS_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isPinned = useCallback((id) => pins.includes(id), [pins]);
  return { pins, isPinned, toggle: togglePinned };
}
