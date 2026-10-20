import { useEffect } from 'react';

export function useHotkey(combo, handler) {
  useEffect(() => {
    const isMac =
      typeof navigator !== 'undefined' &&
      /Mac|iPhone|iPad/.test(navigator.platform);

    const parts = combo.toLowerCase().split('+').map((s) => s.trim());
    const key = parts[parts.length - 1];
    const needsMod = parts.includes('mod');
    const needsShift = parts.includes('shift');
    const needsAlt = parts.includes('alt');

    const onKey = (e) => {
      const modPressed = isMac ? e.metaKey : e.ctrlKey;

      if (needsMod !== modPressed) return;
      if (needsShift && !e.shiftKey) return;
      if (needsAlt && !e.altKey) return;
      if (e.key.toLowerCase() !== key) return;

      e.preventDefault();
      handler(e);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, handler]);
}