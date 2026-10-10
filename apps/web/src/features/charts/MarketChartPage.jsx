// apps/web/src/features/charts/MarketChartPage.jsx
//
// /backtester/chart — full-page market chart with watchlist, quote header,
// indicators, and drawing tools.
//
// Title + current symbol+interval subtitle are published to the GLOBAL
// header bar via usePageHeader().

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  useMarketCatalog,
  useMarketBars,
} from '@/shared/api/marketData';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

import { PageSkeleton } from '@/shared/ui/page-skeleton';
import { computeIndicators } from './lib/indicators';
import {
  DRAWING_MODES,
  DEFAULT_DRAWING_COLOR,
  makeDrawingId,
  normalizeTrendlinePoints,
  loadDrawings,
  saveDrawings,
} from './lib/drawingTools';

import CandlestickChart from './components/CandlestickChart';
import ChartToolbar from './components/ChartToolbar';
import QuoteHeader from './components/QuoteHeader';
import WatchlistSidebar from './components/WatchlistSidebar';
import IndicatorOverlay from './components/IndicatorOverlay';
import DrawingToolbar from './components/DrawingToolbar';

const DEFAULT_SYMBOL = 'NQ';
const DEFAULT_INTERVAL = '5m';

const CSS = `
  .chart-root {
    --accent: #F59E0B; --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10); --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085); --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    --win: #35C4A1; --loss: #FF5C5C;
    width: 100%; max-width: 1800px; margin: 0 auto; box-sizing: border-box;
    display: flex; flex-direction: column; gap: 16px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .chart-layout {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  @media (max-width: 1100px) { .chart-layout { grid-template-columns: 1fr; } }

  .chart-main { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

  /* ---------- QuoteHeader ---------- */
  .qh-root {
    display: flex; align-items: center; gap: 20px;
    padding: 12px 16px; border-radius: 12px;
    background: rgba(15,18,25,.6); border: 1px solid var(--line);
    flex-wrap: wrap;
  }
  .qh-main { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
  .qh-code {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 14px; font-weight: 700; color: var(--accent);
    letter-spacing: .04em;
  }
  .qh-name { font-size: 12px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
  .qh-price-block { display: flex; align-items: baseline; gap: 12px; }
  .qh-price {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 22px; font-weight: 700; letter-spacing: -.01em;
  }
  .qh-price.is-up { color: var(--win); }
  .qh-price.is-down { color: var(--loss); }
  .qh-change {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px; font-weight: 600;
  }
  .qh-change.is-up { color: var(--win); }
  .qh-change.is-down { color: var(--loss); }
  .qh-stats {
    display: flex; align-items: center; gap: 14px; margin-left: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; color: var(--ink-2); flex-wrap: wrap;
  }
  .qh-stats em { color: var(--ink-3); font-style: normal; margin-right: 3px; }
  .qh-market-state {
    padding: 2px 7px; border-radius: 4px;
    background: rgba(255,255,255,.04); text-transform: uppercase;
    font-size: 9.5px; letter-spacing: .06em; font-weight: 700;
  }
  .qh-delayed {
    padding: 2px 7px; border-radius: 4px;
    background: rgba(245,158,11,.10); color: var(--accent);
    font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase;
    font-weight: 700; border: 1px solid var(--accent-soft2);
  }
  .qh-loading {
    display: flex; align-items: center; gap: 8px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; color: var(--ink-3); margin-left: auto;
  }
  .qh-pulse {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent); box-shadow: 0 0 8px rgba(245,158,11,.7);
    animation: qhPulse 1.6s ease-in-out infinite;
  }
  @keyframes qhPulse {
    0%,100% { opacity: .35; transform: scale(.8); }
    50%     { opacity: 1; transform: scale(1.15); }
  }

  /* ---------- IndicatorOverlay ---------- */
  .ind-root {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 8px; border-radius: 9px;
    background: rgba(0,0,0,.32); border: 1px solid var(--line-soft);
    flex-wrap: wrap;
  }
  .ind-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--ink-3);
    margin-right: 4px;
  }
  .ind-toggle {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 10px; border-radius: 6px;
    border: 1px solid transparent; background: transparent;
    color: var(--ink-2); font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer; transition: all .15s; white-space: nowrap;
  }
  .ind-toggle:hover { color: var(--ink-1); background: rgba(255,255,255,.05); }
  .ind-toggle.is-active {
    background: rgba(255,255,255,.06); color: var(--ink-1);
    border-color: rgba(255,255,255,.14);
  }
  .ind-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .ind-toggle:not(.is-active) .ind-dot { opacity: .35; }

  /* ---------- DrawingToolbar ---------- */
  .dt-root {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 8px; border-radius: 9px;
    background: rgba(0,0,0,.32); border: 1px solid var(--line-soft);
    flex-wrap: wrap;
  }
  .dt-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--ink-3);
    margin-right: 4px;
  }
  .dt-tool {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 10px; border-radius: 6px;
    border: 1px solid transparent; background: transparent;
    color: var(--ink-2); font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer; transition: all .15s; white-space: nowrap;
  }
  .dt-tool:hover { color: var(--ink-1); background: rgba(255,255,255,.05); }
  .dt-tool.is-active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117; border-color: transparent;
    box-shadow: 0 4px 12px -6px rgba(245,158,11,.6);
  }
  .dt-hint {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; color: var(--accent); font-weight: 600;
    padding: 3px 8px; border-radius: 5px;
    background: rgba(245,158,11,.10); border: 1px solid var(--accent-soft2);
    white-space: nowrap;
  }
  .dt-spacer { flex: 1; min-width: 8px; }
  .dt-clear {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 10px; border-radius: 6px;
    border: 1px solid rgba(239,68,68,.28); background: rgba(239,68,68,.05);
    color: #f87171; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; font-weight: 600; cursor: pointer;
    transition: all .15s; white-space: nowrap;
  }
  .dt-clear:hover:not(:disabled) {
    background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.55);
  }
  .dt-clear:disabled { opacity: .35; cursor: not-allowed; }

  .chart-tools-row {
    display: flex; align-items: center; gap: 12px;
    flex-wrap: wrap;
  }

  /* ---------- ChartToolbar ---------- */
  .ct-root {
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
    padding: 10px 14px; border-radius: 12px;
    background: rgba(15,18,25,.6); border: 1px solid var(--line);
  }
  .ct-intervals {
    display: inline-flex; gap: 3px; padding: 3px;
    background: rgba(0,0,0,.32); border: 1px solid var(--line-soft);
    border-radius: 9px;
  }
  .ct-tf {
    padding: 6px 12px; border-radius: 6px; border: none;
    background: transparent; color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 600; letter-spacing: .04em;
    cursor: pointer; transition: all .18s; white-space: nowrap;
  }
  .ct-tf:hover { color: var(--ink-1); background: rgba(255,255,255,.04); }
  .ct-tf.is-active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117; font-weight: 700;
    box-shadow: 0 6px 16px -8px rgba(245,158,11,.6);
  }
  .ct-status {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; letter-spacing: .04em; color: var(--ink-3);
  }
  .ct-pulse {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent); box-shadow: 0 0 8px rgba(245,158,11,.7);
    animation: ctPulse 1.6s ease-in-out infinite;
  }
  @keyframes ctPulse {
    0%,100% { opacity: .35; transform: scale(.8); }
    50%     { opacity: 1; transform: scale(1.15); }
  }
  .ct-fs {
    margin-left: auto; display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 13px; border-radius: 9px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03); color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer; transition: all .2s; white-space: nowrap;
  }
  .ct-fs:hover {
    color: var(--accent); border-color: var(--accent-soft2);
    background: rgba(245,158,11,.06);
  }

  /* ---------- Chart shell ---------- */
  .chart-shell {
    position: relative; width: 100%; height: 640px; min-height: 420px;
    border-radius: 14px; border: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9); overflow: hidden;
  }
  .chart-shell:fullscreen, .chart-shell:-webkit-full-screen {
    border-radius: 0; border: none; height: 100vh; min-height: 100vh;
    background: #07090D;
  }

  /* ---------- CandlestickChart internal ---------- */
  .cx-root { position: relative; width: 100%; height: 100%; }
  .cx-canvas { width: 100%; height: 100%; }
  .cx-overlay {
    position: absolute; inset: 0; display: flex;
    align-items: center; justify-content: center;
    background: rgba(7,9,13,.35); backdrop-filter: blur(2px);
    pointer-events: none;
  }
  .cx-spinner {
    width: 26px; height: 26px;
    border: 2.5px solid var(--line); border-top-color: var(--accent);
    border-radius: 50%; animation: cxSpin .8s linear infinite;
  }
  @keyframes cxSpin { to { transform: rotate(360deg); } }
  .cx-empty {
    position: absolute; inset: 0; display: flex;
    flex-direction: column; align-items: center; justify-content: center;
    gap: 6px; text-align: center; color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px; line-height: 1.7; pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .cx-spinner, .ct-pulse, .qh-pulse { animation: none !important; }
    .ind-toggle, .dt-tool, .dt-clear, .ct-tf, .ct-fs { transition: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function MarketChartPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const symbol = (searchParams.get('symbol') || DEFAULT_SYMBOL).toUpperCase();
  const interval = searchParams.get('interval') || DEFAULT_INTERVAL;

  const setSymbol = useCallback((next) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('symbol', next);
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  const setInterval = useCallback((next) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('interval', next);
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  /* ---------------- Data ---------------- */

  const { data: catalog, isLoading: catalogLoading } = useMarketCatalog();

  const {
    data: barPayload,
    isLoading: barsLoading,
    isFetching: barsFetching,
    dataUpdatedAt,
  } = useMarketBars({ symbol, interval, enabled: !!catalog });

  const symbols = useMemo(() => catalog?.symbols ?? [], [catalog]);
  const bars = useMemo(() => barPayload?.bars ?? [], [barPayload]);

  const currentSymbol = useMemo(
    () => symbols.find((s) => s.code === symbol),
    [symbols, symbol]
  );

  /* ---------------- Indicators ---------------- */

  const [indicators, setIndicators] = useState({
    ema20: false,
    ema50: false,
    vwap: false,
    bb: false,
  });

  const toggleIndicator = useCallback((key) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const indicatorData = useMemo(
    () => computeIndicators(bars, indicators),
    [bars, indicators]
  );

  /* ---------------- Drawings ---------------- */

  const [drawings, setDrawings] = useState([]);
  const [drawingMode, setDrawingMode] = useState(DRAWING_MODES.NONE);
  const [pendingPoint, setPendingPoint] = useState(null);

  useEffect(() => {
    setDrawings(loadDrawings(symbol));
    setPendingPoint(null);
  }, [symbol]);

  useEffect(() => {
    saveDrawings(symbol, drawings);
  }, [symbol, drawings]);

  const handleChartClick = useCallback(
    ({ time, price }) => {
      if (drawingMode === DRAWING_MODES.HLINE) {
        setDrawings((prev) => [
          ...prev,
          {
            id: makeDrawingId(),
            mode: DRAWING_MODES.HLINE,
            color: DEFAULT_DRAWING_COLOR,
            points: [{ time, price }],
          },
        ]);
        setDrawingMode(DRAWING_MODES.NONE);
        setPendingPoint(null);
        return;
      }

      if (drawingMode === DRAWING_MODES.TRENDLINE) {
        if (!pendingPoint) {
          setPendingPoint({ time, price });
          return;
        }

        const sorted = normalizeTrendlinePoints(pendingPoint, { time, price });
        setPendingPoint(null);
        setDrawingMode(DRAWING_MODES.NONE);

        if (!sorted) return;

        setDrawings((prev) => [
          ...prev,
          {
            id: makeDrawingId(),
            mode: DRAWING_MODES.TRENDLINE,
            color: DEFAULT_DRAWING_COLOR,
            points: sorted,
          },
        ]);
      }
    },
    [drawingMode, pendingPoint]
  );

  const handleClearDrawings = useCallback(() => {
    setDrawings([]);
    setPendingPoint(null);
  }, []);

  const handleModeChange = useCallback((mode) => {
    setDrawingMode(mode);
    setPendingPoint(null);
  }, []);

  /* ---------------- Fullscreen ---------------- */

  const shellRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement === shell) await document.exitFullscreen();
      else if (shell.requestFullscreen) await shell.requestFullscreen();
    } catch (err) {
      console.warn('[chart] fullscreen rejected:', err);
    }
  }, []);

  /* ---------------- Publish title to global header ---------------- */

  usePageHeader({
    title: 'Chart',
    subtitle: `${symbol} · ${interval.toUpperCase()}`,
  });

  /* ---------------- Render ---------------- */

  if (catalogLoading) return <PageSkeleton />;

  return (
    <>
      <style>{CSS}</style>
      <div className="chart-root">
        <div className="chart-layout">
          <WatchlistSidebar
            catalog={symbols}
            activeSymbol={symbol}
            onChange={setSymbol}
          />

          <div className="chart-main">
            <QuoteHeader
              symbol={symbol}
              displayName={currentSymbol?.label || ''}
            />

            <ChartToolbar
              interval={interval}
              onIntervalChange={setInterval}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              isLoading={barsFetching && !bars.length}
              lastUpdated={dataUpdatedAt}
            />

            <div className="chart-tools-row">
              <IndicatorOverlay
                indicators={indicators}
                onToggle={toggleIndicator}
              />
              <DrawingToolbar
                mode={drawingMode}
                onModeChange={handleModeChange}
                onClearAll={handleClearDrawings}
                drawingCount={drawings.length}
                pendingFirstPoint={!!pendingPoint}
              />
            </div>

            <div className="chart-shell" ref={shellRef}>
              <CandlestickChart
                bars={bars}
                interval={interval}
                isLoading={barsLoading}
                indicators={indicators}
                indicatorData={indicatorData}
                drawings={drawings}
                drawingMode={drawingMode}
                onChartClick={handleChartClick}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}