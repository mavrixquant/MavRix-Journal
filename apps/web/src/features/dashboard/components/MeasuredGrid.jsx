
import { useLayoutEffect, useRef, useState } from 'react';
import { Responsive } from 'react-grid-layout/legacy';

const SUBPIXEL_TOLERANCE = 0.5;

export default function MeasuredGrid({ children, ...gridProps }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const initial = el.getBoundingClientRect().width;
    if (initial > 0) setWidth(initial);

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