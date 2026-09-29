// apps/web/src/features/charts/components/TradingViewChart.jsx
//
// Thin wrapper around TradingView's official advanced-chart iframe embed.
//
// Why iframe embed and not tv.js:
//   - No global window pollution (tv.js attaches to window.TradingView)
//   - iframe isolation means TradingView's CSS cannot leak into our app
//   - Canonical, documented, actively maintained
//   - Re-mounting with new props is a simple innerHTML swap
//
// The widget's own toolbar handles symbol search, interval, chart type,
// indicators, and drawings. We only supply the initial defaults.

import { useEffect, useRef } from 'react';
import {
  TV_WIDGET_CONFIG,
  TV_SCRIPT_SRC,
  TV_CONTAINER_CLASS,
  TV_INNER_CLASS,
} from '../lib/chartConfig';

export default function TradingViewChart({
  symbol,
  interval,
  style = '1',
}) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    // Wipe any previous mount (React strict-mode double-invoke, prop change,
    // or remount after fullscreen exit).
    host.innerHTML = '';

    // TradingView's embed script expects this exact DOM shape:
    //   <div class="tradingview-widget-container">
    //     <div class="tradingview-widget-container__widget"></div>
    //     <script src="...advanced-chart.js" async>
    //       { ...config as JSON... }
    //     </script>
    //   </div>
    const container = document.createElement('div');
    container.className = TV_CONTAINER_CLASS;
    container.style.width = '100%';
    container.style.height = '100%';

    const inner = document.createElement('div');
    inner.className = TV_INNER_CLASS;
    inner.style.width = '100%';
    inner.style.height = '100%';
    container.appendChild(inner);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = TV_SCRIPT_SRC;
    script.async = true;
    script.innerHTML = JSON.stringify({
      ...TV_WIDGET_CONFIG,
      symbol,
      interval,
      style,
    });
    container.appendChild(script);

    host.appendChild(container);

    return () => {
      // Tear down so the iframe, its timers, and its network sockets release.
      host.innerHTML = '';
    };
  }, [symbol, interval, style]);

  return (
    <div
      ref={hostRef}
      style={{ width: '100%', height: '100%', minHeight: 0 }}
    />
  );
}
