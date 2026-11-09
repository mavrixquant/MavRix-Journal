import { useEffect, useState } from 'react';
import { getResponsiveGridMetrics } from '../layout/dashboardLayout';

export function useResponsiveGridMetrics() {
  const [metrics, setMetrics] = useState(() =>
    typeof window === 'undefined'
      ? { rowHeight: 40, margin: 16 }
      : getResponsiveGridMetrics(window.innerWidth)
  );

  useEffect(() => {
    const onResize = () =>
      setMetrics(getResponsiveGridMetrics(window.innerWidth));

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return metrics;
}