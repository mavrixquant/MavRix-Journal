// apps/web/src/shared/hooks/useHotkey.js
import { useEffect } from 'react';

/**
 * Global keyboard shortcut.
 * Use "mod" for Cmd on Mac / Ctrl elsewhere.
 *
 * @param {string} combo - e.g. "mod+b", "shift+enter"
 * @param {(e: KeyboardEvent) => void} handler
 */
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