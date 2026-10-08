// apps/web/src/features/charts/components/CandlestickChart.jsx
//
// Thin React wrapper around lightweight-charts v5.
//
// The chart instance is created ONCE on mount. Interval changes do NOT
// recreate it — they just update timeScale options (whether to show intraday
// time or just dates). Data flows in via setData().
//
// Candles + volume histogram share the pane; volume occupies the bottom
// 15% via a dedicated 'volume' price scale.

import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
  ColorType,
} from 'lightweight-charts';

import { chartTheme } from '../lib/chartTheme';

export default function CandlestickChart({ bars, interval, isLoading }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const volumeRef = useRef(null);

  /* ------------------------------------------------------------------ */
  /*  Create chart once                                                  */
  /* ------------------------------------------------------------------ */
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
          style: 2,
          labelBackgroundColor: chartTheme.accent,
        },
        horzLine: {
          color: chartTheme.crosshair,
          width: 1,
          style: 2,
          labelBackgroundColor: chartTheme.accent,
        },
      },
      rightPriceScale: {
        borderColor: chartTheme.border,
        scaleMargins: { top: 0.08, bottom: 0.24 },
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

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: chartTheme.up,
      downColor: chartTheme.down,
      borderVisible: false,
      wickUpColor: chartTheme.upWick,
      wickDownColor: chartTheme.downWick,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      color: chartTheme.volumeUp,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // Pin the volume scale to the bottom 15% of the pane.
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleRef.current = candleSeries;
    volumeRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Update timeScale when interval changes (intraday vs daily)         */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.timeScale().applyOptions({
      timeVisible: interval !== '1d',
    });
  }, [interval]);

  /* ------------------------------------------------------------------ */
  /*  Feed bars                                                          */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const candle = candleRef.current;
    const volume = volumeRef.current;
    const chart = chartRef.current;
    if (!candle || !volume || !chart) return;
    if (!Array.isArray(bars) || bars.length === 0) return;

    const candleData = bars.map((b) => ({
      time: b.time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));

    const volumeData = bars.map((b) => ({
      time: b.time,
      value: b.volume,
      color: b.close >= b.open ? chartTheme.volumeUp : chartTheme.volumeDown,
    }));

    candle.setData(candleData);
    volume.setData(volumeData);
    chart.timeScale().fitContent();
  }, [bars, interval]);

  const showEmpty = !isLoading && (!bars || bars.length === 0);

  return (
    <div className="cx-root">
      <div ref={containerRef} className="cx-canvas" />

      {isLoading && (
        <div className="cx-overlay">
          <div className="cx-spinner" />
        </div>
      )}

      {showEmpty && (
        <div className="cx-empty">
          No data for this symbol and interval.
          <br />
          Try a different timeframe or symbol.
        </div>
      )}
    </div>
  );
}