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

// ---------------------------------------------------------------------------
// TradeBoxesPrimitive: Renders TradingView-style position boxes
// ---------------------------------------------------------------------------
class TradeBoxesPrimitive {
  constructor(trades, series, chart, showLabels) {
    this._trades = trades;
    this._series = series;
    this._chart = chart;
    this._showLabels = showLabels;
    this._paneViews = [{ renderer: () => this }];
  }

  paneViews() {
    return this._paneViews;
  }

  updateAllViews() {}

  draw(target) {
    if (!this._trades || this._trades.length === 0) return;

    const timeScale = this._chart.timeScale();
    const series = this._series;

    target.useMediaCoordinateSpace((scope) => {
      const ctx = scope.context;

      for (const trade of this._trades) {
        if (trade.entryTimeSec == null || trade.exitTimeSec == null) continue;

        const x1 = timeScale.timeToCoordinate(trade.entryTimeSec);
        const x2 = timeScale.timeToCoordinate(trade.exitTimeSec);

        if (x1 === null || x2 === null) continue;

        const yEntry = trade.entryPrice ? series.priceToCoordinate(trade.entryPrice) : null;
        const ySl = trade.stopLoss ? series.priceToCoordinate(trade.stopLoss) : null;
        const yTp = trade.takeProfit ? series.priceToCoordinate(trade.takeProfit) : null;

        const w = x2 - x1;

        // Draw TP Zone (Green)
        if (yEntry !== null && yTp !== null) {
          const top = Math.min(yEntry, yTp);
          const bottom = Math.max(yEntry, yTp);
          ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
          ctx.fillRect(x1, top, w, bottom - top);
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x1, top, w, bottom - top);
        }

        // Draw SL Zone (Red)
        if (yEntry !== null && ySl !== null) {
          const top = Math.min(yEntry, ySl);
          const bottom = Math.max(yEntry, ySl);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
          ctx.fillRect(x1, top, w, bottom - top);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x1, top, w, bottom - top);
        }

        // Fallback outline if Entry is missing
        if (yEntry === null) {
          let yTop = ySl !== null ? ySl : null;
          let yBottom = yTp !== null ? yTp : null;
          if (yTop !== null && yBottom !== null) {
             const t = Math.min(yTop, yBottom);
             const b = Math.max(yTop, yBottom);
             ctx.strokeStyle = 'rgba(255,255,255, 0.2)';
             ctx.lineWidth = 1;
             ctx.strokeRect(x1, t, w, b - t);
          }
        }

        // Draw TP Line (Solid Green)
        if (yTp !== null) {
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, yTp);
          ctx.lineTo(x2, yTp);
          ctx.stroke();
        }

        // Draw SL Line (Solid Red)
        if (ySl !== null) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, ySl);
          ctx.lineTo(x2, ySl);
          ctx.stroke();
        }

        // Draw Entry Line (Dashed Amber)
        if (yEntry !== null) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x1, yEntry);
          ctx.lineTo(x2, yEntry);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw Labels
        if (this._showLabels) {
          ctx.font = '11px "IBM Plex Mono", monospace';
          ctx.textBaseline = 'middle';

          function drawPill(text, x, y, bg, color) {
            const padding = 4;
            const textW = ctx.measureText(text).width;
            const pw = textW + padding * 2;
            const ph = 16;

            ctx.fillStyle = bg;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(x, y - ph / 2, pw, ph, 4);
            } else {
              ctx.rect(x, y - ph / 2, pw, ph);
            }
            ctx.fill();

            ctx.fillStyle = color;
            ctx.textAlign = 'left';
            ctx.fillText(text, x + padding, y);
          }

          if (trade.takeProfit && yTp !== null) {
            drawPill(`TP ${Number(trade.takeProfit).toFixed(2)}`, x1 + 6, yTp - 12, '#22c55e', '#0D1117');
          }

          if (trade.stopLoss && ySl !== null) {
            drawPill(`SL ${Number(trade.stopLoss).toFixed(2)}`, x1 + 6, ySl + 12, '#ef4444', '#0D1117');
          }

          if (trade.entryPrice && yEntry !== null) {
            drawPill(`Entry ${Number(trade.entryPrice).toFixed(2)}`, x1 + 6, yEntry - 12, '#f59e0b', '#0D1117');
          }
        }
      }
    });
  }
}

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
  trades = [],
  showLabels = false,
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
    } catch (err) {
      console.warn('[chart] markers update failed:', err);
    }
  }, [markers]);

  // ---- Trade Boxes primitive ----
  useEffect(() => {
    const candle = candleRef.current;
    const chart = chartRef.current;
    if (!candle || !chart) return;

    const primitive = new TradeBoxesPrimitive(trades, candle, chart, showLabels);
    candle.attachPrimitive(primitive);

    return () => {
      if (candleRef.current) {
        try { candleRef.current.detachPrimitive(primitive); } catch (e) { }
      }
    };
  }, [trades, showLabels]);

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