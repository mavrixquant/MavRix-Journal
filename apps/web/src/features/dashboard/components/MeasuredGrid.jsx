// apps/web/src/features/dashboard/components/MeasuredGrid.jsx
//
// Wraps react-grid-layout's <Responsive> with a pre-paint width measurement.
//
// WHY THIS EXISTS
// ---------------
// react-grid-layout ships WidthProvider, which initializes its width state
// to 1280 and only measures the real container in componentDidMount. That
// produces two renders on every cold mount:
//
//   Render 1: layouts computed for 1280px (typically the `lg` breakpoint)
//   Render 2: layouts recomputed for the actual container width
//
// With the CSS transition on `.react-grid-item`, the second render animates
// every panel into its final position. On a ~1100-1270px viewport the shift
// is dramatic: the right-column panels slide left, and the largest panel
// (the calendar) briefly renders at the wider `lg` size before snapping to
// its final `md` size. Users see a fast, janky reflow on every cold open.
//
// This wrapper measures its own width synchronously inside useLayoutEffect
// (before the browser paints) and only then renders <Responsive> with the
// correct width. RGL never sees the wrong width, so there is no reflow and
// no transition replay.
//
// The ResizeObserver keeps the width in sync on subsequent resizes (window
// resize, sidebar collapse, container-query reflow, etc.).
//
// USAGE
// -----
//   <MeasuredGrid
//     breakpoints={...}
//     cols={...}
//     layouts={...}
//     rowHeight={...}
//     ...rest
//   >
//     {items}
//   </MeasuredGrid>
//
// All props (except children) are forwarded verbatim to <Responsive>.

import { useLayoutEffect, useRef, useState } from 'react';
import { Responsive } from 'react-grid-layout/legacy';

const SUBPIXEL_TOLERANCE = 0.5;

export default function MeasuredGrid({ children, ...gridProps }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // Synchronous first measurement — happens before paint.
    const initial = el.getBoundingClientRect().width;
    if (initial > 0) setWidth(initial);

    // Track subsequent resizes.
    const ro = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect?.width ?? 0;
      setWidth((prev) =>
        Math.abs(prev - next) > SUBPIXEL_TOLERANCE ? next : prev
      );
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: '100%' }}>
      {width > 0 && (
        <Responsive width={width} {...gridProps}>
          {children}
        </Responsive>
      )}
    </div>
  );
}