// apps/web/src/features/charts/components/CandlestickChart.jsx
//
// Canvas chart: candles + volume + indicators + drawings.
//
// Chart is created once on mount. Indicator series and drawing shapes are
// added/removed declaratively as props change.
//
// NOTE: trendline points arrive pre-sorted from drawingTools.normalizeDrawing;
// we sort defensively again here because lightweight-charts hard-rejects
// out-of-order setData.

import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  CrosshairMode,
  ColorType,
  LineStyle,
} from 'lightweight-charts';

import { chartTheme } from '../lib/chartTheme';

const INDICATOR_COLORS = {
  ema20: '#F59E0B',
  ema50: '#4C8BF5',
  vwap:  '#A78BFA',
  bb:    '#8892A3',
};

/* ------------------------------------------------------------------ */
/*  Time comparator — works for number or string times                 */
/* ------------------------------------------------------------------ */

function ascendingByTime(a, b) {
  if (a.time === b.time) return 0;
  return a.time < b.time ? -1 : 1;
}

export default function CandlestickChart({
  bars,
  interval,
  isLoading,
  indicators,
  indicatorData,
  drawings = [],
  drawingMode = 'none',
  onChartClick,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const volumeRef = useRef(null);

  const indicatorRefs = useRef(new Map());
  const drawingRefs = useRef(new Map());

  const clickHandlerRef = useRef(onChartClick);
  useEffect(() => { clickHandlerRef.current = onChartClick; }, [onChartClick]);

  /* ------------------------------------------------------------------ */
  /*  Create chart once                                                  */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    // Capture stable refs so the cleanup doesn't chase .current.
    const indicatorMap = indicatorRefs.current;
    const drawingMap = drawingRefs.current;

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
        vertLine: { color: chartTheme.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: chartTheme.accent },
        horzLine: { color: chartTheme.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: chartTheme.accent },
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

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: chartTheme.up,
      downColor: chartTheme.down,
      borderVisible: false,
      wickUpColor: chartTheme.upWick,
      wickDownColor: chartTheme.downWick,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      color: chartTheme.volumeUp,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    chartRef.current = chart;
    candleRef.current = candle;
    volumeRef.current = volume;

    const handleClick = (param) => {
      const cb = clickHandlerRef.current;
      if (!cb || !param?.time || !param?.point || !candleRef.current) return;
      const price = candleRef.current.coordinateToPrice(param.point.y);
      if (!Number.isFinite(price)) return;
      cb({ time: param.time, price });
    };
    chart.subscribeClick(handleClick);

    return () => {
      chart.unsubscribeClick(handleClick);
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      indicatorMap.clear();
      drawingMap.clear();
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Time-visible flag when interval changes                            */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.timeScale().applyOptions({ timeVisible: interval !== '1d' });
  }, [interval]);

  /* ------------------------------------------------------------------ */
  /*  Feed base candle + volume data                                     */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const candle = candleRef.current;
    const volume = volumeRef.current;
    const chart = chartRef.current;
    if (!candle || !volume || !chart) return;
    if (!Array.isArray(bars) || bars.length === 0) return;

    candle.setData(bars.map((b) => ({
      time: b.time, open: b.open, high: b.high, low: b.low, close: b.close,
    })));

    volume.setData(bars.map((b) => ({
      time: b.time,
      value: b.volume,
      color: b.close >= b.open ? chartTheme.volumeUp : chartTheme.volumeDown,
    })));

    chart.timeScale().fitContent();
  }, [bars, interval]);

  /* ------------------------------------------------------------------ */
  /*  Sync indicator series                                              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !indicators || !indicatorData) return;

    const refs = indicatorRefs.current;

    const createLine = (color, width = 2, dashed = false) =>
      chart.addSeries(LineSeries, {
        color,
        lineWidth: width,
        lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

    // --- EMA 20 ---
    if (indicators.ema20 && !refs.has('ema20')) {
      refs.set('ema20', createLine(INDICATOR_COLORS.ema20, 2));
    } else if (!indicators.ema20 && refs.has('ema20')) {
      chart.removeSeries(refs.get('ema20'));
      refs.delete('ema20');
    }

    // --- EMA 50 ---
    if (indicators.ema50 && !refs.has('ema50')) {
      refs.set('ema50', createLine(INDICATOR_COLORS.ema50, 2));
    } else if (!indicators.ema50 && refs.has('ema50')) {
      chart.removeSeries(refs.get('ema50'));
      refs.delete('ema50');
    }

    // --- VWAP ---
    if (indicators.vwap && !refs.has('vwap')) {
      refs.set('vwap', createLine(INDICATOR_COLORS.vwap, 2, true));
    } else if (!indicators.vwap && refs.has('vwap')) {
      chart.removeSeries(refs.get('vwap'));
      refs.delete('vwap');
    }

    // --- Bollinger Bands ---
    if (indicators.bb && !refs.has('bbUpper')) {
      refs.set('bbUpper', createLine(INDICATOR_COLORS.bb, 1));
      refs.set('bbMiddle', createLine(INDICATOR_COLORS.bb, 1, true));
      refs.set('bbLower', createLine(INDICATOR_COLORS.bb, 1));
    } else if (!indicators.bb && refs.has('bbUpper')) {
      chart.removeSeries(refs.get('bbUpper'));
      chart.removeSeries(refs.get('bbMiddle'));
      chart.removeSeries(refs.get('bbLower'));
      refs.delete('bbUpper');
      refs.delete('bbMiddle');
      refs.delete('bbLower');
    }

    if (refs.has('ema20')) refs.get('ema20').setData(indicatorData.ema20 || []);
    if (refs.has('ema50')) refs.get('ema50').setData(indicatorData.ema50 || []);
    if (refs.has('vwap')) refs.get('vwap').setData(indicatorData.vwap || []);
    if (refs.has('bbUpper')) {
      refs.get('bbUpper').setData(indicatorData.bb?.upper || []);
      refs.get('bbMiddle').setData(indicatorData.bb?.middle || []);
      refs.get('bbLower').setData(indicatorData.bb?.lower || []);
    }
  }, [indicators, indicatorData]);

  /* ------------------------------------------------------------------ */
  /*  Sync drawings                                                      */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const chart = chartRef.current;
    const candle = candleRef.current;
    if (!chart || !candle) return;

    const refs = drawingRefs.current;
    const incomingIds = new Set(drawings.map((d) => d.id));

    // Remove drawings that no longer exist
    for (const [id, entry] of refs.entries()) {
      if (incomingIds.has(id)) continue;
      if (entry.kind === 'priceLine') candle.removePriceLine(entry.handle);
      else if (entry.kind === 'lineSeries') chart.removeSeries(entry.handle);
      refs.delete(id);
    }

    // Add or update drawings
    for (const d of drawings) {
      if (d.mode === 'hline') {
        if (refs.has(d.id)) continue; // already drawn
        const handle = candle.createPriceLine({
          price: d.points[0].price,
          color: d.color,
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: '',
        });
        refs.set(d.id, { kind: 'priceLine', handle });
        continue;
      }

      if (d.mode === 'trendline') {
        // Defensive: sort ascending before handing to lightweight-charts.
        const sortedPoints = [...d.points]
          .map((p) => ({ time: p.time, value: p.price }))
          .sort(ascendingByTime);

        // Guard against degenerate (identical times) — skip silently.
        if (sortedPoints.length < 2 || sortedPoints[0].time === sortedPoints[1].time) {
          continue;
        }

        const existing = refs.get(d.id);
        if (existing && existing.kind === 'lineSeries') {
          existing.handle.setData(sortedPoints);
          continue;
        }

        const handle = chart.addSeries(LineSeries, {
          color: d.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        handle.setData(sortedPoints);
        refs.set(d.id, { kind: 'lineSeries', handle });
      }
    }
  }, [drawings]);

  /* ------------------------------------------------------------------ */
  /*  Cursor hint when a drawing tool is active                          */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.cursor = drawingMode !== 'none' ? 'crosshair' : 'default';
  }, [drawingMode]);

  const showEmpty = !isLoading && (!bars || bars.length === 0);

  return (
    <div className="cx-root">
      <div ref={containerRef} className="cx-canvas" />

      {isLoading && (
        <div className="cx-overlay"><div className="cx-spinner" /></div>
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