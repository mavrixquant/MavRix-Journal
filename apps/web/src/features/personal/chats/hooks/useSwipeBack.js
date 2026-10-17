// apps/web/src/features/personal/chats/hooks/useSwipeBack.js
//
// Detects a rightward horizontal swipe that starts within `edgeWidth` px of
// the container's left edge and travels at least `threshold` px. Used on
// mobile to reproduce the WhatsApp/Telegram "swipe-right to go back from
// thread" gesture.
//
// Ignored gestures:
//   • Any gesture that is more vertical than horizontal (scrolling)
//   • Any gesture that takes longer than `maxDurationMs` (long-press then
//     drag)
//   • Any gesture that does NOT start within the left-edge zone
//
// Attaches to the returned ref's element. When `enabled` is false, no
// listeners are attached — safe to keep the hook mounted on desktop.

import { useEffect, useRef } from 'react';

export function useSwipeBack({
  onBack,
  enabled = true,
  edgeWidth = 32,
  threshold = 64,
  maxDurationMs = 700,
} = {}) {
  const containerRef = useRef(null);
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!enabled) return undefined;
    const el = containerRef.current;
    if (!el) return undefined;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;
    let fromEdge = false;

    const handleStart = (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
      fromEdge = startX <= edgeWidth;
      tracking = fromEdge;
    };

    const handleMove = (e) => {
      if (!tracking) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      // Bail if the user is scrolling vertically
      if (Math.abs(dy) > Math.abs(dx) * 1.2) {
        tracking = false;
      }
    };

    const handleEnd = (e) => {
      if (!tracking) return;
      tracking = false;

      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;

      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startTime;

      const horizontal = Math.abs(dy) < Math.abs(dx) * 0.75;
      const rightward = dx >= threshold;
      const fastEnough = dt < maxDurationMs;

      if (fromEdge && horizontal && rightward && fastEnough) {
        if (typeof onBackRef.current === 'function') {
          onBackRef.current();
        }
      }
    };

    const handleCancel = () => {
      tracking = false;
    };

    el.addEventListener('touchstart', handleStart, { passive: true });
    el.addEventListener('touchmove', handleMove, { passive: true });
    el.addEventListener('touchend', handleEnd, { passive: true });
    el.addEventListener('touchcancel', handleCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleStart);
      el.removeEventListener('touchmove', handleMove);
      el.removeEventListener('touchend', handleEnd);
      el.removeEventListener('touchcancel', handleCancel);
    };
  }, [enabled, edgeWidth, threshold, maxDurationMs]);

  return containerRef;
}