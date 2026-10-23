import { useEffect, useRef, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  createChart,
  CandlestickSeries,
  createSeriesMarkers,
  CrosshairMode,
  ColorType,
  LineStyle,
} from 'lightweight-charts';

import EmptyState from '@/shared/components/EmptyState';
import { chartTheme } from '../lib/chartTheme';

function fmtPrice(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function OhlcLegend({ ohlc, interval }) {
  if (!ohlc) return null;
  const up = ohlc.close >= ohlc.open;
  const dirClass = up ? 'is-up' : 'is-down';

  return (
    <div className="cl-ohlc" aria-hidden>
      <span className="cl-ohlc-item"><em>O</em><b className={dirClass}>{fmtPrice(ohlc.open)}</b></span>
      <span className="cl-ohlc-item"><em>H</em><b className={dirClass}>{fmtPrice(ohlc.high)}</b></span>
      <span className="cl-ohlc-item"><em>L</em><b className={dirClass}>{fmtPrice(ohlc.low)}</b></span>
      <span className="cl-ohlc-item"><em>C</em><b className={dirClass}>{fmtPrice(ohlc.close)}</b></span>
      {interval && <span className="cl-ohlc-tf">{interval.toUpperCase()}</span>}
    </div>
  );
}

const CSS = `
  .cl-root {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .cl-canvas {
    width: 100%;
    height: 100%;
  }
  .cl-ohlc {
    position: absolute;
    top: 12px;
    left: 16px;
    z-index: 3;
    display: inline-flex;
    align-items: center;
    gap: 14px;
    padding: 6px 12px;
    border-radius: 8px;
    background: rgba(12, 16, 23, 0.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,.06);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    letter-spacing: .02em;
    pointer-events: none;
    animation: clFadeIn .35s ease;
  }
  .cl-ohlc-item { display: inline-flex; gap: 5px; align-items: center; }
  .cl-ohlc-item em {
    font-style: normal;
    color: #545E6E;
    font-weight: 700;
    font-size: 9.5px;
    letter-spacing: .12em;
  }
  .cl-ohlc-item b {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .cl-ohlc-item b.is-up   { color: #35C4A1; }
  .cl-ohlc-item b.is-down { color: #FF5C5C; }
  .cl-ohlc-tf {
    margin-left: 4px;
    padding: 1px 7px;
    border-radius: 4px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.06);
    color: #8892A3;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .08em;
  }
  .cl-empty-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  @keyframes clFadeIn { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) {
    .cl-ohlc { animation: none; }
  }
`;

export default function CandlestickChart({
  bars,
  interval,
  markers = [],
  focusTime = null,
  onReady,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const markersPluginRef = useRef(null);

  const [ohlc, setOhlc] = useState(null);

  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  // ---- mount chart once ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: chartTheme.text,
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: chartTheme.grid },
        horzLines: { color: chartTheme.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: chartTheme.crosshair,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: chartTheme.accent,
        },
        horzLine: {
          color: chartTheme.crosshair,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: chartTheme.accent,
        },
      },
      rightPriceScale: {
        borderColor: chartTheme.border,
        scaleMargins: { top: 0.06, bottom: 0.06 },
      },
      timeScale: {
        borderColor: chartTheme.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 8,
        minBarSpacing: 0.5,
      },
      handleScroll: true,
      handleScale: true,
      autoSize: true,
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: chartTheme.up,
      downColor: chartTheme.down,
      borderVisible: false,
      wickUpColor: chartTheme.upWick,
      wickDownColor: chartTheme.downWick,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // v5: markers live in a plugin attached to the series.
    let markersPlugin = null;
    try {
      markersPlugin = createSeriesMarkers(candle, []);
    } catch (err) {
      console.warn('[chart] createSeriesMarkers failed — markers disabled:', err);
    }

    chartRef.current = chart;
    candleRef.current = candle;
    markersPluginRef.current = markersPlugin;

    const handleCrosshair = (param) => {
      if (!param.time || !param.point) {
        const lastBar = (bars && bars.length > 0) ? bars[bars.length - 1] : null;
        setOhlc(lastBar ? { open: lastBar.open, high: lastBar.high, low: lastBar.low, close: lastBar.close } : null);
        return;
      }
      const barData = param.seriesData.get(candle);
      if (barData && barData.open != null) {
        setOhlc({ open: barData.open, high: barData.high, low: barData.low, close: barData.close });
      }
    };
    chart.subscribeCrosshairMove(handleCrosshair);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshair);
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      markersPluginRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- time axis: show times on intraday ----
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.timeScale().applyOptions({ timeVisible: interval !== '1d' });
  }, [interval]);

  // ---- feed data + markers ----
  useEffect(() => {
    const candle = candleRef.current;
    const chart = chartRef.current;
    if (!candle || !chart) return;
    if (!Array.isArray(bars) || bars.length === 0) return;

    candle.setData(bars.map((b) => ({
      time: b.time, open: b.open, high: b.high, low: b.low, close: b.close,
    })));

    // Re-apply markers AFTER setData.
    const plugin = markersPluginRef.current;
    if (plugin) {
      try {
        plugin.setMarkers(Array.isArray(markers) ? markers : []);
      } catch (err) {
        console.warn('[chart] markers set (after data) failed:', err);
      }
    }

    chart.timeScale().fitContent();

    const last = bars[bars.length - 1];
    setOhlc({ open: last.open, high: last.high, low: last.low, close: last.close });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onReadyRef.current?.();
      });
    });
  }, [bars, interval]);

  // ---- markers can change independently ----
  useEffect(() => {
    const plugin = markersPluginRef.current;
    if (!plugin) return;
    try {
      plugin.setMarkers(Array.isArray(markers) ? markers : []);
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[chart] markers applied:', markers.length);
      }
    } catch (err) {
      console.warn('[chart] markers update failed:', err);
    }
  }, [markers]);

  // ---- focus a specific timestamp ----
  useEffect(() => {
    if (focusTime == null) return;
    const chart = chartRef.current;
    if (!chart) return;

    requestAnimationFrame(() => {
      try {
        if (typeof focusTime === 'number') {
          chart.timeScale().setVisibleRange({
            from: focusTime - 3600 * 6,
            to: focusTime + 3600 * 6,
          });
        } else {
          const d = new Date(focusTime);
          if (Number.isNaN(d.getTime())) return;
          const from = new Date(d.getTime() - 7 * 86400000);
          const to = new Date(d.getTime() + 7 * 86400000);
          chart.timeScale().setVisibleRange({
            from: from.toISOString().slice(0, 10),
            to: to.toISOString().slice(0, 10),
          });
        }
      } catch (err) {
        console.warn('[chart] focusTime scroll failed:', err);
      }
    });
  }, [focusTime]);

  const showEmpty = (!bars || bars.length === 0);

  return (
    <>
      <style>{CSS}</style>
      <div className="cl-root">
        <div ref={containerRef} className="cl-canvas" />
        {!showEmpty && <OhlcLegend ohlc={ohlc} interval={interval} />}
        {showEmpty && (
          <div className="cl-empty-overlay">
            <EmptyState
              size="sm"
              icon={BarChart3}
              eyebrow="No data"
              title="No chart data"
              description="No data for this symbol and interval. Try a different timeframe or symbol."
            />
          </div>
        )}
      </div>
    </>
  );
}