// apps/web/src/features/charts/MarketChartPage.jsx
//
// /backtester/chart - full-page TradingView advanced chart.
//
// Deliberately minimal:
//   - No custom symbol or timeframe chips. The widget's own toolbar
//     (top of the chart) already handles every control a user needs.
//   - No URL state. The widget manages its own state internally.
//   - Only chrome: page title + fullscreen toggle.
//
// The entire file's job is to give the TradingView iframe a DEFINITE
// height that follows the viewport. The widget's `autosize: true` flag
// reads its parent's computed height at mount; if the parent is only
// `min-height` sized, autosize falls back to ~200 px. So:
//
//   .chart-root   -> height: calc(100dvh - --chart-chrome)   [DEFINITE]
//   .chart-shell  -> flex: 1 1 auto; min-height: 0           [fills rest]
//   host div      -> height: 100%                             [resolves]
//   iframe        -> autosize reads definite parent           [fills]

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

import TradingViewChart from './components/TradingViewChart';
import {
  DEFAULT_SYMBOL,
  DEFAULT_INTERVAL,
  DEFAULT_STYLE,
} from './lib/chartConfig';

import '@/shared/ui/page-header.css';

/* ------------------------------------------------------------------ */
/*  Page CSS.                                                          */
/*                                                                     */
/*  --chart-chrome = total pixels of chrome ABOVE the chart shell:     */
/*    AppLayout header   (64)                                          */
/*    main padding top   (24)                                          */
/*    .ph eyebrow+title+sub (~90)                                      */
/*    gap between .ph and .chart-shell (18)                            */
/*    main padding bottom (24)                                         */
/*                                                                     */
/*  Tune it in ONE place if the chart over- or under-flows:            */
/*    increase the value -> shorter chart                              */
/*    decrease the value -> taller chart                               */
/* ------------------------------------------------------------------ */

const CSS = `
  .chart-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;

    --chart-chrome: 220px;

    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 18px;

    /* Definite height. 100dvh handles mobile browser chrome; 100vh is a
       fallback for engines without dvh support. min-height is a floor so
       short viewports scroll instead of squishing the chart. */
    height: calc(100vh  - var(--chart-chrome));
    height: calc(100dvh - var(--chart-chrome));
    min-height: 520px;

    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* ---------- Fullscreen toggle ---------- */
  .chart-fs-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.035);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    white-space: nowrap;
    transition:
      color .22s cubic-bezier(.2,.8,.25,1),
      background-color .22s cubic-bezier(.2,.8,.25,1),
      border-color .22s cubic-bezier(.2,.8,.25,1),
      box-shadow .22s ease,
      transform .15s ease;
  }
  .chart-fs-btn:hover {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.06);
    box-shadow: 0 0 20px -6px rgba(245,158,11,.4);
    transform: translateY(-1px);
  }
  .chart-fs-btn:active { transform: translateY(0) scale(.98); }
  .chart-fs-btn:focus-visible {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.18);
  }
  .chart-fs-btn svg { flex-shrink: 0; }

  /* ---------- Chart shell ---------- */
  .chart-shell {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    box-shadow:
      0 20px 50px -30px rgba(0,0,0,.9),
      inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
  }

  /* Belt-and-braces: force the wrapper's direct child to fill the shell
     even if its inline style is ever removed. */
  .chart-shell > * {
    height: 100%;
    min-height: 0;
  }

  /* ---------- Fullscreen ---------- */
  .chart-shell:fullscreen,
  .chart-shell:-webkit-full-screen {
    border-radius: 0;
    border: none;
    min-height: 100dvh;
    background: #07090D;
    box-shadow: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .chart-fs-btn { transition: none !important; }
  }
`;

export default function MarketChartPage() {
  const shellRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ---------- Fullscreen wiring ----------
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
      } else if (shell.requestFullscreen) {
        await shell.requestFullscreen();
      } else if (shell.webkitRequestFullscreen) {
        shell.webkitRequestFullscreen();
      }
    } catch (err) {
      console.warn('[chart] fullscreen rejected:', err);
    }
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div className="chart-root">

        {/* ---------- Header ---------- */}
        <div className="ph">
          <div className="ph-row">
            <div className="ph-left">
              <span className="ph-eyebrow">Backtester</span>
              <h1 className="ph-title">Market Chart</h1>
              <p className="ph-sub">
                Live TradingView feed - use the chart's own toolbar for
                symbol, interval, indicators, and drawings
              </p>
            </div>

            <div className="ph-right">
              <button
                type="button"
                className="chart-fs-btn"
                onClick={toggleFullscreen}
                aria-pressed={isFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ---------- Chart ---------- */}
        <div className="chart-shell" ref={shellRef}>
          <TradingViewChart
            symbol={DEFAULT_SYMBOL}
            interval={DEFAULT_INTERVAL}
            style={DEFAULT_STYLE}
          />
        </div>
      </div>
    </>
  );
}
