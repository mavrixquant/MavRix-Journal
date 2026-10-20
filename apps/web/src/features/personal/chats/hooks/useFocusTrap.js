
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap({ active = false, onEscape } = {}) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    previousFocusRef.current =
      typeof document !== 'undefined' ? document.activeElement : null;

    const getFocusables = () =>
      Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
      );

    const initial = getFocusables()[0] || container;
    if (initial && typeof initial.focus === 'function') {
      requestAnimationFrame(() => {
        try { initial.focus({ preventScroll: true }); } catch { }
      });
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (typeof onEscapeRef.current === 'function') {
          e.stopPropagation();
          onEscapeRef.current();
        }
        return;
      }

      if (e.key !== 'Tab') return;

      const focusables = getFocusables();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;

      const inside = container.contains(activeEl);

      if (e.shiftKey) {
        if (!inside || activeEl === first) {
          e.preventDefault();
          try { last.focus(); } catch { }
        }
      } else {
        if (!inside || activeEl === last) {
          e.preventDefault();
          try { first.focus(); } catch { }
        }
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === 'function') {
        try { prev.focus({ preventScroll: true }); } catch { }
      }
      previousFocusRef.current = null;
    };
  }, [active]);

  return containerRef;
}