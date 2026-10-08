// apps/web/src/features/charts/MarketChartPage.jsx
//
// /backtester/chart — full-page market chart.
//
// Data source: Yahoo Finance via /api/market-data (server-proxied + cached).
// Rendering:   lightweight-charts v5 (candles + volume, canvas-based, MIT).
//
// Symbol + interval persist in the URL (?symbol=NQ&interval=5m) so the page
// is shareable and the browser back button works as expected.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useMarketCatalog, useMarketBars } from '@/shared/api/marketData';
import { PageSkeleton } from '@/shared/ui/page-skeleton';

import CandlestickChart from './components/CandlestickChart';
import ChartToolbar from './components/ChartToolbar';
import SymbolSearch from './components/SymbolSearch';

import '@/shared/ui/page-header.css';

const DEFAULT_SYMBOL = 'NQ';
const DEFAULT_INTERVAL = '5m';

/* ------------------------------------------------------------------ */
/*  Page CSS                                                          */
/* ------------------------------------------------------------------ */

const CSS = `
  .chart-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;

    width: 100%;
    max-width: 1560px;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 18px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* Title meta — the small label next to the big symbol code. */
  .chart-title-meta {
    margin-left: 10px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-2);
    letter-spacing: 0;
  }

  /* ---------- Chart shell ---------- */
  .chart-shell {
    position: relative;
    width: 100%;
    height: 640px;
    min-height: 420px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .chart-shell:fullscreen,
  .chart-shell:-webkit-full-screen {
    border-radius: 0;
    border: none;
    height: 100vh;
    min-height: 100vh;
    background: #07090D;
  }

  /* ---------- CandlestickChart ---------- */
  .cx-root {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .cx-canvas {
    width: 100%;
    height: 100%;
  }
  .cx-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(7,9,13,.35);
    backdrop-filter: blur(2px);
    pointer-events: none;
  }
  .cx-spinner {
    width: 26px;
    height: 26px;
    border: 2.5px solid var(--line);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: cxSpin .8s linear infinite;
  }
  @keyframes cxSpin { to { transform: rotate(360deg); } }

  .cx-empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    text-align: center;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    line-height: 1.7;
    pointer-events: none;
  }

  /* ---------- ChartToolbar ---------- */
  .ct-root {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(15,18,25,.6);
    border: 1px solid var(--line);
  }
  .ct-intervals {
    display: inline-flex;
    gap: 3px;
    padding: 3px;
    background: rgba(0,0,0,.32);
    border: 1px solid var(--line-soft);
    border-radius: 9px;
  }
  .ct-tf {
    padding: 6px 12px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .04em;
    cursor: pointer;
    transition: all .18s;
    white-space: nowrap;
  }
  .ct-tf:hover { color: var(--ink-1); background: rgba(255,255,255,.04); }
  .ct-tf.is-active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-weight: 700;
    box-shadow: 0 6px 16px -8px rgba(245,158,11,.6);
  }

  .ct-status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    letter-spacing: .04em;
    color: var(--ink-3);
  }
  .ct-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px rgba(245,158,11,.7);
    animation: ctPulse 1.6s ease-in-out infinite;
  }
  @keyframes ctPulse {
    0%,100% { opacity: .35; transform: scale(.8); }
    50%     { opacity: 1;   transform: scale(1.15); }
  }

  .ct-fs {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 13px;
    border-radius: 9px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .2s;
    white-space: nowrap;
  }
  .ct-fs:hover {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.06);
  }

  /* ---------- SymbolSearch ---------- */
  .sym-root {
    position: relative;
    min-width: 240px;
    max-width: 340px;
  }
  .sym-trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-1);
    cursor: pointer;
    text-align: left;
    transition: all .18s;
    font-family: inherit;
  }
  .sym-trigger:hover { border-color: rgba(255,255,255,.22); background: rgba(255,255,255,.05); }
  .sym-trigger.is-open { border-color: var(--accent-soft2); box-shadow: 0 0 0 3px rgba(245,158,11,.12); }
  .sym-trigger-code {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: .02em;
    flex-shrink: 0;
  }
  .sym-trigger-label {
    flex: 1;
    font-size: 12px;
    color: var(--ink-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sym-trigger-chevron {
    flex-shrink: 0;
    color: var(--ink-3);
    transition: transform .2s, color .2s;
  }
  .sym-trigger.is-open .sym-trigger-chevron {
    color: var(--accent);
    transform: rotate(180deg);
  }

  .sym-panel {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 50;
    width: 340px;
    max-height: 420px;
    border-radius: 12px;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    box-shadow:
      0 24px 60px -20px rgba(0,0,0,.95),
      0 0 0 1px rgba(245,158,11,.06);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: symIn .16s cubic-bezier(.2,.8,.25,1);
  }
  @keyframes symIn {
    from { opacity: 0; transform: translateY(-4px) scale(.98); }
    to   { opacity: 1; transform: none; }
  }

  .sym-search {
    position: relative;
    padding: 10px 12px;
    border-bottom: 1px solid var(--line-soft);
    flex-shrink: 0;
  }
  .sym-search-icon {
    position: absolute;
    left: 22px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink-3);
    pointer-events: none;
  }
  .sym-search-input {
    width: 100%;
    padding: 7px 10px 7px 30px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 8px;
    color: var(--ink-1);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    outline: none;
    box-sizing: border-box;
    transition: all .18s;
  }
  .sym-search-input::placeholder { color: var(--ink-3); }
  .sym-search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }

  .sym-list {
    padding: 6px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  .sym-list::-webkit-scrollbar { width: 8px; }
  .sym-list::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  .sym-group { margin-bottom: 4px; }
  .sym-group-head {
    padding: 8px 10px 4px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
  }

  .sym-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border-radius: 7px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
    text-align: left;
    transition: all .14s;
    font-family: inherit;
  }
  .sym-item:hover {
    background: rgba(255,255,255,.04);
    color: var(--ink-1);
  }
  .sym-item.is-active {
    background: rgba(245,158,11,.08);
    border-color: var(--accent-soft2);
    color: var(--accent);
  }
  .sym-item-code {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .02em;
    flex-shrink: 0;
    min-width: 56px;
  }
  .sym-item-label {
    flex: 1;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sym-item-exchange {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--ink-3);
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255,255,255,.04);
    flex-shrink: 0;
  }

  .sym-empty {
    padding: 30px 14px;
    text-align: center;
    color: var(--ink-3);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
  }

  /* ---------- Reduced motion ---------- */
  @media (prefers-reduced-motion: reduce) {
    .cx-spinner, .ct-pulse, .sym-panel { animation: none !important; }
    .ct-tf, .ct-fs, .sym-trigger, .sym-item { transition: none !important; }
  }

  /* ---------- Responsive ---------- */
  @media (max-width: 760px) {
    .chart-shell { height: 480px; }
    .sym-root { min-width: 0; width: 100%; max-width: none; }
    .sym-panel { width: 100%; right: auto; left: 0; }
    .ct-fs span { display: none; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function MarketChartPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const symbol = (searchParams.get('symbol') || DEFAULT_SYMBOL).toUpperCase();
  const interval = searchParams.get('interval') || DEFAULT_INTERVAL;

  const setSymbol = useCallback(
    (next) => {
      const sp = new URLSearchParams(searchParams);
      sp.set('symbol', next);
      setSearchParams(sp, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setInterval = useCallback(
    (next) => {
      const sp = new URLSearchParams(searchParams);
      sp.set('interval', next);
      setSearchParams(sp, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  /* ---------------- Data ---------------- */

  const { data: catalog, isLoading: catalogLoading } = useMarketCatalog();

  const {
    data: barPayload,
    isLoading: barsLoading,
    isFetching: barsFetching,
    dataUpdatedAt,
  } = useMarketBars({
    symbol,
    interval,
    enabled: !!catalog,
  });

  const symbols = catalog?.symbols ?? [];
  const bars = barPayload?.bars ?? [];
  const currentSymbol = symbols.find((s) => s.code === symbol);

  /* ---------------- Fullscreen ---------------- */

  const shellRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
      } else if (shell.requestFullscreen) {
        await shell.requestFullscreen();
      }
    } catch (err) {
      console.warn('[chart] fullscreen rejected:', err);
    }
  }, []);

  /* ---------------- Render ---------------- */

  if (catalogLoading) return <PageSkeleton />;

  return (
    <>
      <style>{CSS}</style>
      <div className="chart-root">
        {/* ---------- Header ---------- */}
        <div className="ph">
          <div className="ph-row">
            <div className="ph-left">
              <span className="ph-eyebrow">Backtester</span>
              <h1 className="ph-title">
                {currentSymbol?.code ?? symbol}
                {currentSymbol?.label && (
                  <span className="chart-title-meta">
                    {currentSymbol.label}
                  </span>
                )}
              </h1>
              <p className="ph-sub">
                Yahoo Finance delayed feed
                {currentSymbol?.category
                  ? ` · ${currentSymbol.category}`
                  : ''}
              </p>
            </div>

            <div className="ph-right">
              <SymbolSearch
                catalog={symbols}
                value={symbol}
                onChange={setSymbol}
              />
            </div>
          </div>
        </div>

        {/* ---------- Toolbar ---------- */}
        <ChartToolbar
          interval={interval}
          onIntervalChange={setInterval}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isLoading={barsFetching && !bars.length}
          lastUpdated={dataUpdatedAt}
        />

        {/* ---------- Chart ---------- */}
        <div className="chart-shell" ref={shellRef}>
          <CandlestickChart
            bars={bars}
            interval={interval}
            isLoading={barsLoading}
          />
        </div>
      </div>
    </>
  );
}