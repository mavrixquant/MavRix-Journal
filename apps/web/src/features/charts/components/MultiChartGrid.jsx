import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { AlertTriangle, Eye, EyeOff, Magnet, Maximize2, Minimize2, RotateCw } from 'lucide-react';

import { useMarketBars, useMarketCatalog } from '@/shared/api/marketData';
import { useGexDay, useGexDays } from '@/shared/api/gex';
import { GEX_SYMBOLS, parseGexString } from '@mavrix/shared';
import { getTimezoneOffsetSeconds, toDisplaySeconds, tradeTimeToUtcSeconds } from '@/shared/trading/tradeTime';
import { pricePrecision } from '../lib/chartTheme';
import { TOOL_BY_ID, DRAW_COLORS } from '../lib/drawings';
import { indicatorStore, resolveIndicator } from '../lib/indicators';
import { ToolIcon, CHART_TYPES, TypeIcon } from './ChartIcons';
import { ColorPopover } from './settings/ColorPalette';
import IndicatorMenu from './IndicatorMenu';
import CandlestickChart from './CandlestickChart';

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];
const DRAW_TOOLS = ['hline', 'trend', 'ray', 'rect', 'fib', 'rr', 'measure'];
const STORAGE_KEY = 'mavrix:chart:multi-panes:v1';
const DRAWING_KEY = (id) => `mavrix:chart:multi-drawings:${id}`;

const PANE_DEFAULTS = {
  p1: { symbol: 'NQ', interval: '1m', chartType: 'candles', logScale: false, indicators: ['ema20', 'volume'] },
  p2: { symbol: 'ES', interval: '5m', chartType: 'candles', logScale: false, indicators: ['ema20', 'volume'] },
  p3: { symbol: 'NQ', interval: '15m', chartType: 'candles', logScale: false, indicators: ['ema20', 'volume'] },
  p4: { symbol: 'ES', interval: '1h', chartType: 'candles', logScale: false, indicators: ['ema20', 'volume'] },
};

const DEFAULT_MODES = {
  '1x1': ['p1'],
  '1x2': ['p1', 'p2'],
  '2x1': ['p1', 'p2'],
  '2x2': ['p1', 'p2', 'p3', 'p4'],
};

function readJson(key, fallback) {
  try { const r = window.localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}
function writeJson(key, value) { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } }

function buildDefaultPanes(mode) {
  return (DEFAULT_MODES[mode] || DEFAULT_MODES['1x1']).map((id) => ({ id, ...PANE_DEFAULTS[id] }));
}

// Precompute journal-trade overlay data for one pane (local display seconds).
function buildTradeOverlay(journal, symbol, displayBars, interval, displayTz) {
  if (interval === '1d' || displayBars.length === 0) return { trades: [], markers: [] };
  const first = displayBars[0].time;
  const last = displayBars[displayBars.length - 1].time;
  const snapIdx = (t) => {
    let lo = 0, hi = displayBars.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (displayBars[mid].time <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans;
  };
  const boxes = [], marks = [];
  for (const t of journal) {
    const s = String(t.symbol || t.instrument || '').toUpperCase();
    if (s && s !== symbol) continue;
    const entryUtc = tradeTimeToUtcSeconds(t.date, t.entryTime, displayTz);
    if (entryUtc == null) continue;
    const entry = toDisplaySeconds(entryUtc, displayTz);
    if (entry < first || entry > last) continue;
    const idx = snapIdx(entry);
    if (idx < 0) continue;
    const exitUtc = t.exitTime ? tradeTimeToUtcSeconds(t.exitDate || t.date, t.exitTime, displayTz) : null;
    const exit = exitUtc != null ? toDisplaySeconds(exitUtc, displayTz) : null;
    const long = /long|buy/i.test(String(t.side || t.direction || ''));
    const pnl = Number(t.pnl ?? t.netPnl);
    const win = Number.isFinite(pnl) ? pnl >= 0 : null;
    const label = Number.isFinite(pnl) ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}` : '';
    marks.push({
      time: displayBars[idx].time,
      position: long ? 'belowBar' : 'aboveBar',
      shape: long ? 'arrowUp' : 'arrowDown',
      color: win === false ? '#FF5C5C' : win ? '#35C4A1' : '#F5B544',
      text: label,
    });
    if (exit != null) {
      const exitIdx = snapIdx(exit);
      boxes.push({
        entryTimeSec: displayBars[idx].time,
        exitTimeSec: displayBars[Math.max(exitIdx, idx)].time,
        entryPrice: Number(t.entryPrice) || null,
        stopLoss: Number(t.stopLoss) || null,
        takeProfit: Number(t.takeProfit) || null,
        label, win,
      });
    }
  }
  marks.sort((a, b) => a.time - b.time);
  return { trades: boxes, markers: marks };
}

export const MULTI_CSS = `
  .mc-grid { display: grid; width: 100%; height: 100%; min-width: 0; min-height: 0; gap: 6px; padding: 6px; background: rgba(10,13,19,.4); }
  .mc-grid.mode-1x1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
  .mc-grid.mode-1x2 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr; }
  .mc-grid.mode-2x1 { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
  .mc-grid.mode-2x2 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
  .mc-pane { position: relative; display: flex; flex-direction: row; width: 100%; height: 100%; border-radius: 10px; border: 1px solid rgba(255,255,255,.08); background: rgba(15,18,26,.85); overflow: hidden; min-width: 0; min-height: 0; transition: border-color .15s, box-shadow .15s; }
  .mc-pane.is-focused { border-color: color-mix(in srgb, var(--mk-accent, #5ea8ff) 60%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--mk-accent, #5ea8ff) 45%, transparent); }
  .mc-rail { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 3px; width: 34px; border-right: 1px solid rgba(255,255,255,.06); background: rgba(0,0,0,.18); overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
  .mc-rail::-webkit-scrollbar { display: none; }
  .mc-rail-sep { width: 18px; height: 1px; flex: 0 0 auto; background: rgba(255,255,255,.08); margin: 3px 0; }
  .mc-rail-grow { flex: 1 1 auto; min-height: 4px; }
  .mc-rail-btn { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 26px; height: 26px; border: 0; border-radius: 6px; background: transparent; color: #8892A3; cursor: pointer; transition: background .12s, color .12s; }
  .mc-rail-btn:hover { color: #fff; background: rgba(255,255,255,.1); }
  .mc-rail-btn.is-on { color: var(--mk-accent, #5ea8ff); background: rgba(94,168,255,.16); }
  .mc-pane-main { position: relative; flex: 1 1 auto; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .mc-pane-head { position: absolute; top: 8px; left: 12px; z-index: 12; display: flex; align-items: center; gap: 6px; padding: 3px 6px 3px 9px; border-radius: 8px; background: rgba(12,16,23,.92); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,.1); font: 700 11px 'IBM Plex Mono', monospace; color: #E7E9EE; pointer-events: auto; }
  .mc-pane-head select { background: transparent; border: 0; color: inherit; font: inherit; outline: none; cursor: pointer; max-width: 90px; }
  .mc-pane-head select option { background: #11151F; color: #E7E9EE; }
  .mc-pane-head .mc-dot-sep { color: #4A5364; }
  .mc-pane-actions { display: flex; gap: 1px; margin-left: 2px; }
  .mc-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border: 0; border-radius: 5px; background: transparent; color: #8892A3; cursor: pointer; transition: background .12s, color .12s; }
  .mc-icon-btn:hover { color: #fff; background: rgba(255,255,255,.12); }
  .mc-icon-btn.is-on { color: var(--mk-accent, #5ea8ff); background: rgba(94,168,255,.14); }
  .mc-toolbar { position: absolute; top: 6px; right: 8px; z-index: 12; display: flex; flex-wrap: nowrap; align-items: center; justify-content: flex-end; gap: 3px; padding: 3px 5px; border-radius: 9px; background: rgba(12,16,23,.9); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,.1); opacity: 0; transform: translateY(-3px); transition: opacity .14s, transform .14s; pointer-events: none; }
  .mc-pane:hover .mc-toolbar, .mc-pane:focus-within .mc-toolbar, .mc-pane.is-focused .mc-toolbar { opacity: 1; transform: none; pointer-events: auto; }
  .mc-toolbar .mk-btn, .mc-toolbar .mk-btn.sq { height: 24px; min-width: 24px; padding: 0 6px; font-size: 10.5px; }
  .mc-toolbar .mk-vsep { height: 16px; margin: 0 1px; }
  .mc-type-seg { display: inline-flex; gap: 1px; }
  .mc-type-seg button { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 5px; background: transparent; color: #8892A3; cursor: pointer; }
  .mc-type-seg button:hover { color: #fff; background: rgba(255,255,255,.1); }
  .mc-type-seg button.is-on { color: var(--mk-accent, #5ea8ff); background: rgba(94,168,255,.16); }
  .mc-pane-body { flex: 1; min-width: 0; min-height: 0; position: relative; }
  .mc-overlay { position: absolute; inset: 0; z-index: 8; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 18px; background: rgba(10,13,19,.9); color: #8892A3; font: 500 12px 'IBM Plex Mono', monospace; }
  .mc-overlay b { color: #E7E9EE; font-size: 13px; }
  .mc-overlay p { margin: 0; max-width: 280px; color: #6B7587; line-height: 1.5; }
  .mc-retry { display: inline-flex; align-items: center; gap: 5px; margin-top: 2px; padding: 6px 12px; border-radius: 7px; border: 1px solid color-mix(in srgb, var(--mk-accent, #5ea8ff) 45%, transparent); background: color-mix(in srgb, var(--mk-accent, #5ea8ff) 14%, transparent); color: var(--mk-accent, #5ea8ff); font: 700 11px 'IBM Plex Mono', monospace; cursor: pointer; }
  .mc-retry:hover { background: color-mix(in srgb, var(--mk-accent, #5ea8ff) 26%, transparent); }
  .mc-fill-bar { position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 9; overflow: hidden; background: rgba(94,168,255,.15); }
  .mc-fill-bar i { display: block; width: 40%; height: 100%; background: var(--mk-accent, #5ea8ff); animation: mc-slide 1.1s ease-in-out infinite; }
  @keyframes mc-slide { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }
  .mc-sync-bar { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); z-index: 15; display: flex; align-items: center; gap: 2px; padding: 3px 6px; border-radius: 9px; background: rgba(12,16,23,.92); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,.1); box-shadow: 0 6px 24px -8px rgba(0,0,0,.7); }
  .mc-sync-bar .mc-icon-btn { width: 26px; height: 26px; }
  @media (prefers-reduced-motion: reduce) { .mc-fill-bar i { animation: none; } .mc-toolbar, .mc-pane { transition: none; } }
`;

/**
 * Multi-chart grid. Every pane is a fully featured CandlestickChart with its own drawings,
 * indicators, chart type, volume / log toggles, journal trades, GEX levels and infinite scroll.
 * A sync bar links panes together (crosshair always; symbol / timeframe / style optionally).
 */
export function MultiChartGrid({
  mode = '1x1',
  displayTz,
  journal = [],
  showTrades = true,
  showTradeLabels = false,
  sync = {},
}) {
  const [panes, setPanes] = useState(() => {
    const saved = readJson(STORAGE_KEY, null);
    if (saved && Array.isArray(saved[mode]) && saved[mode].length) return saved[mode];
    return buildDefaultPanes(mode);
  });
  const [maximizedId, setMaximizedId] = useState(null);
  const [focusedId, setFocusedId] = useState(null);
  const [tools, setTools] = useState({});
  const chartRefs = useRef({});
  const catalogQ = useMarketCatalog();
  const catalog = catalogQ.data;

  // Keep the pane list in sync with the requested grid mode.
  useEffect(() => {
    setPanes((prev) => {
      const want = DEFAULT_MODES[mode] || DEFAULT_MODES['1x1'];
      if (prev.length >= want.length && want.every((id, i) => prev[i]?.id === id)) return prev;
      return want.map((id, i) => prev[i] && prev[i].id === id ? prev[i] : { id, ...PANE_DEFAULTS[id] });
    });
    setMaximizedId(null);
  }, [mode]);

  useEffect(() => {
    const saved = readJson(STORAGE_KEY, {});
    writeJson(STORAGE_KEY, { ...saved, [mode]: panes });
  }, [panes, mode]);

  const activePanes = useMemo(() => {
    if (maximizedId) return panes.filter((p) => p.id === maximizedId);
    return panes;
  }, [panes, maximizedId]);

  const updatePane = useCallback((id, patch) => {
    setPanes((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      // Mirror the change onto peers when a sync toggle is on.
      const keys = Object.keys(patch);
      return next.map((p) => {
        if (p.id === id) return p;
        const merged = { ...p };
        for (const k of keys) if (sync[k]) merged[k] = patch[k];
        return merged;
      });
    });
  }, [sync]);

  const toolOf = (id) => tools[id] || 'cursor';
  const setToolOf = useCallback((id, tool) => {
    setTools((prev) => ({ ...prev, [id]: tool === prev[id] ? 'cursor' : tool }));
  }, []);

  // When symbol sync is turned on, immediately align all panes to the focused or first pane's symbol.
  useEffect(() => {
    if (!sync.symbol) return;
    setPanes((prev) => {
      const source = prev.find((p) => p.id === focusedId) || prev[0];
      if (!source) return prev;
      const allSame = prev.every((p) => p.symbol === source.symbol);
      if (allSame) return prev;
      return prev.map((p) => (p.symbol === source.symbol ? p : { ...p, symbol: source.symbol }));
    });
  }, [sync.symbol, focusedId]);

  // When timeframe sync is turned on, immediately align all panes to the focused or first pane's timeframe.
  useEffect(() => {
    if (!sync.interval) return;
    setPanes((prev) => {
      const source = prev.find((p) => p.id === focusedId) || prev[0];
      if (!source) return prev;
      const allSame = prev.every((p) => p.interval === source.interval);
      if (allSame) return prev;
      return prev.map((p) => (p.interval === source.interval ? p : { ...p, interval: source.interval }));
    });
  }, [sync.interval, focusedId]);

  const [chartsReady, setChartsReady] = useState(0);

  // Poll until all active panes have their charts ready on mount/mode change.
  useEffect(() => {
    if (sync.crosshair === false) return undefined;
    let timer;
    const checkReady = () => {
      let ready = true;
      activePanes.forEach((pane) => {
        if (!chartRefs.current[pane.id]?.chart?.()) ready = false;
      });
      if (ready) {
        setChartsReady((v) => v + 1);
      } else {
        timer = setTimeout(checkReady, 50);
      }
    };
    checkReady();
    return () => clearTimeout(timer);
  }, [activePanes, sync.crosshair]);

  // Synchronized crosshair hover across active panes (both vertical time line and horizontal price line).
  useEffect(() => {
    if (sync.crosshair === false || chartsReady === 0) return undefined;
    const unsubs = [];
    activePanes.forEach((paneA) => {
      const handleA = chartRefs.current[paneA.id];
      const chartA = handleA?.chart?.();
      const mainA = handleA?.main?.();
      if (!chartA) return;

      const handler = (param) => {
        if (!param || !param.time) {
          activePanes.forEach((paneB) => {
            if (paneB.id !== paneA.id) {
              chartRefs.current[paneB.id]?.chart?.clearCrosshairPosition?.();
            }
          });
          return;
        }

        let priceA = null;
        if (param.point && mainA) {
          priceA = mainA.coordinateToPrice(param.point.y);
        }
        if (priceA == null && param.seriesData && mainA) {
          const d = param.seriesData.get(mainA);
          if (d) priceA = d.close ?? d.value;
        }

        activePanes.forEach((paneB) => {
          if (paneB.id === paneA.id) return;
          // Re-read live refs: the series can be mid-swap during a symbol / timeframe / chartType change.
          const handleB = chartRefs.current[paneB.id];
          const chartB = handleB?.chart?.();
          const mainB = handleB?.main?.();
          if (!chartB || !mainB) return;

          let targetPrice = 0;
          if (priceA != null) {
            if (paneB.symbol === paneA.symbol) {
              targetPrice = priceA;
            } else {
              try {
                const rangeA = chartA.priceScale('right').getVisiblePriceRange();
                const rangeB = chartB.priceScale('right').getVisiblePriceRange();
                if (rangeA && rangeB && rangeA.to !== rangeA.from && rangeB.to !== rangeB.from) {
                  const pct = (priceA - rangeA.from) / (rangeA.to - rangeA.from);
                  targetPrice = rangeB.from + pct * (rangeB.to - rangeB.from);
                } else {
                  targetPrice = priceA;
                }
              } catch {
                targetPrice = priceA;
              }
            }
          }

          // lightweight-charts throws "Value is null" if the price isn't finite or the series
          // was just removed/recreated. Never retry with the same series inside the catch — clear instead.
          if (!Number.isFinite(targetPrice)) {
            try { chartB.clearCrosshairPosition?.(); } catch { /* series gone */ }
            return;
          }
          try {
            chartB.setCrosshairPosition(targetPrice, param.time, mainB);
          } catch {
            try { chartB.clearCrosshairPosition?.(); } catch { /* series gone */ }
          }
        });
      };

      chartA.subscribeCrosshairMove(handler);
      unsubs.push(() => { try { chartA.unsubscribeCrosshairMove(handler); } catch { /* gone */ } });
    });

    return () => unsubs.forEach((fn) => fn());
  }, [activePanes, sync.crosshair, chartsReady]);

  return (
    <>
      <style>{MULTI_CSS}</style>
      <div className={`mc-grid mode-${maximizedId ? '1x1' : mode}`}>
        {activePanes.map((pane) => (
          <ChartPane
            key={pane.id}
            pane={pane}
            catalog={catalog}
            displayTz={displayTz}
            journal={journal}
            showTrades={showTrades}
            showTradeLabels={showTradeLabels}
            isFocused={focusedId === pane.id}
            isMaximized={maximizedId === pane.id}
            tool={toolOf(pane.id)}
            onTool={(t) => setToolOf(pane.id, t)}
            onToggleMax={() => setMaximizedId((cur) => (cur === pane.id ? null : pane.id))}
            onFocus={() => setFocusedId(pane.id)}
            onUpdate={(patch) => updatePane(pane.id, patch)}
            ref={(el) => { if (el) chartRefs.current[pane.id] = el; else delete chartRefs.current[pane.id]; }}
          />
        ))}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/*  Pane                                                                                          */
/* ---------------------------------------------------------------------------------------------- */

const ChartPane = forwardRef(function ChartPane({
  pane, catalog, displayTz, journal, showTrades, showTradeLabels,
  isFocused, isMaximized, tool, onTool, onToggleMax, onFocus, onUpdate,
}, ref) {
  const { id, symbol, interval, chartType, showVolume, logScale, indicators } = pane;

  const symInfo = catalog?.symbols?.find((s) => s.code === symbol);
  const precision = pricePrecision(symInfo, symbol);

  const barsQ = useMarketBars({ symbol, interval, enabled: !!catalog });

  const bars = useMemo(() => {
    if (!barsQ.data?.pages) return [];
    const pages = [...barsQ.data.pages].reverse();
    const flat = pages.flatMap((p) => p.bars || []);
    const seen = new Map();
    for (const b of flat) {
      const isFlat = b.open === b.high && b.high === b.low && b.low === b.close;
      if (isFlat && (!b.volume || Number(b.volume) === 0)) continue;
      seen.set(b.time, b);
    }
    const out = [...seen.values()];
    out.sort((a, b) => (typeof a.time === 'number' ? a.time : new Date(a.time).getTime()) - (typeof b.time === 'number' ? b.time : new Date(b.time).getTime()));
    return out;
  }, [barsQ.data]);

  const [currentTime] = useState(() => Math.floor(Date.now() / 1000));

  const displayOffset = useMemo(() => {
    if (interval === '1d') return 0;
    const refTime = bars.length > 0 ? bars[Math.floor(bars.length / 2)].time : currentTime;
    return getTimezoneOffsetSeconds(displayTz, refTime);
  }, [bars, interval, displayTz, currentTime]);

  const displayBars = useMemo(() => {
    if (displayOffset === 0 || interval === '1d') return bars;
    const out = [];
    let prev = -Infinity;
    for (const b of bars) {
      const t = b.time + displayOffset;
      if (t <= prev) continue;
      out.push({ ...b, time: t });
      prev = t;
    }
    return out;
  }, [bars, displayOffset, interval]);

  /* ----- journal trades + markers ----- */
  const { chartTrades, chartMarkers } = useMemo(
    () => buildTradeOverlay(journal, symbol, displayBars, interval, displayTz),
    [journal, symbol, displayBars, interval, displayTz],
  );

  /* ----- GEX levels ----- */
  const isGexSymbol = GEX_SYMBOLS.includes(symbol);
  const { data: gexDays } = useGexDays(isGexSymbol ? symbol : null);
  const latestGexDate = gexDays?.[0]?.date ?? null;
  const { data: gexDay } = useGexDay(latestGexDate, symbol);
  const gexLevels = useMemo(() => {
    if (!gexDay) return [];
    const parsed = parseGexString(gexDay.converted);
    if (parsed.levels.length) return parsed.levels;
    const raw = typeof gexDay.levels === 'string' ? (() => { try { return JSON.parse(gexDay.levels); } catch { return []; } })() : gexDay.levels;
    return Array.isArray(raw) ? raw.map((l) => ({ type: String(l?.type || '').toUpperCase(), price: Number(l?.price), label: String(l?.label || '') })).filter((l) => Number.isFinite(l.price)) : [];
  }, [gexDay]);

  /* ----- per-pane drawing state (persisted per pane) ----- */
  const [drawings, setDrawingsState] = useState(() => {
    const saved = readJson(DRAWING_KEY(id), null);
    return Array.isArray(saved) ? saved : [];
  });
  const [selectedId, setSelectedId] = useState(null);
  const [magnet, setMagnet] = useState(false);
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [hideDrawings, setHideDrawings] = useState(false);
  const historyRef = useRef([]);
  const drawingsRef = useRef(drawings);
  drawingsRef.current = drawings;

  const commitDrawings = useCallback((next) => {
    historyRef.current = [...historyRef.current.slice(-39), drawingsRef.current];
    setDrawingsState(next);
    writeJson(DRAWING_KEY(id), next);
  }, [id]);

  const toggleIndicator = useCallback((iid) => {
    onUpdate({ indicators: indicators.includes(iid) ? indicators.filter((x) => x !== iid) : [...indicators, iid] });
  }, [indicators, onUpdate]);

  /* ----- imperative handle for crosshair sync ----- */
  const chartHandle = useRef(null);
  useImperativeHandle(ref, () => ({
    chart: () => chartHandle.current?.chart ?? null,
    main: () => chartHandle.current?.main ?? null,
    fit: () => chartHandle.current?.fit?.(),
    screenshot: () => chartHandle.current?.screenshot?.(),
  }), []);

  const loading = barsQ.isLoading && bars.length === 0;
  const filling = barsQ.data?.pages?.[0]?.filling;
  const hasMoreOlder = barsQ.data?.pages?.[barsQ.data.pages.length - 1]?.hasMoreOlder;
  const loadOlder = useCallback(() => {
    if (barsQ.hasNextPage && !barsQ.isFetchingNextPage) return barsQ.fetchNextPage();
    return undefined;
  }, [barsQ]);
  const error = barsQ.isError && bars.length === 0;

  const activeInds = indicators.map(resolveIndicator).filter(Boolean);

  return (
    <div className={`mc-pane${isFocused ? ' is-focused' : ''}`} onMouseEnter={onFocus}>
      {/* Left drawing rail */}
      <aside className="mc-rail" role="toolbar" aria-label="Drawing tools" aria-orientation="vertical">
        {DRAW_TOOLS.map((tid) => (
          <button key={tid} type="button" className={`mc-rail-btn${tool === tid ? ' is-on' : ''}`} onClick={() => onTool(tid)} aria-pressed={tool === tid} title={TOOL_BY_ID[tid]?.label || tid} aria-label={TOOL_BY_ID[tid]?.label || tid}>
            <ToolIcon id={tid} />
          </button>
        ))}
        <span className="mc-rail-sep" />
        <button type="button" className={`mc-rail-btn${magnet ? ' is-on' : ''}`} onClick={() => setMagnet((v) => !v)} title="Magnet (snap to OHLC)" aria-pressed={magnet} aria-label="Magnet"><Magnet size={14} /></button>
        <ColorPopover
          value={drawColor} onChange={setDrawColor} placement="right" label="Drawing colour"
          renderTrigger={({ ref: cRef, onClick, open }) => (
            <button ref={cRef} type="button" className={`mc-rail-btn${open ? ' is-on' : ''}`} onClick={onClick} aria-label="Drawing colour" title="Drawing colour"><i className="mk-color-dot" style={{ background: drawColor }} /></button>
          )}
        />
        <button type="button" className={`mc-rail-btn${hideDrawings ? ' is-on' : ''}`} onClick={() => setHideDrawings((v) => !v)} title={hideDrawings ? 'Show drawings' : 'Hide drawings'} aria-pressed={hideDrawings} aria-label="Toggle drawings">{hideDrawings ? <EyeOff size={14} /> : <Eye size={14} />}</button>
      </aside>

      <div className="mc-pane-main">
        {/* Header: symbol / timeframe / maximize */}
        <div className="mc-pane-head">
          <select value={symbol} onChange={(e) => onUpdate({ symbol: e.target.value })} aria-label="Select symbol">
            {(catalog?.symbols || [{ code: symbol }]).map((s) => (<option key={s.code} value={s.code}>{s.code}</option>))}
          </select>
          <span className="mc-dot-sep">·</span>
          <select value={interval} onChange={(e) => onUpdate({ interval: e.target.value })} aria-label="Select timeframe">
            {INTERVALS.map((tf) => (<option key={tf} value={tf}>{tf.toUpperCase()}</option>))}
          </select>
          <span className="mc-pane-actions">
            <button type="button" className="mc-icon-btn" onClick={onToggleMax} title={isMaximized ? 'Restore grid' : 'Maximize pane'} aria-label={isMaximized ? 'Restore grid' : 'Maximize pane'}>
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </span>
        </div>

        {/* Per-pane toolbar: indicators / chart type */}
        <div className="mc-toolbar" role="toolbar" aria-label="Pane tools">
          <CascadingIndicators enabledIndicators={indicators} onToggleIndicator={toggleIndicator} onClearIndicators={() => onUpdate({ indicators: [] })} interval={interval} />
          <span className="mk-vsep" />
          <div className="mc-type-seg" role="group" aria-label="Chart type">
            {CHART_TYPES.map((t) => (
              <button key={t.id} type="button" className={chartType === t.id ? 'is-on' : ''} onClick={() => onUpdate({ chartType: t.id })} aria-pressed={chartType === t.id} title={t.label} aria-label={t.label}>
                <TypeIcon id={t.id} />
              </button>
            ))}
          </div>
        </div>

        {/* Chart area */}
        <div className="mc-pane-body">
        {(filling || barsQ.isFetchingNextPage) && <div className="mc-fill-bar" aria-hidden><i /></div>}

        <CandlestickChart
          ref={chartHandle}
          bars={displayBars}
          interval={interval}
          symbol={symbol}
          precision={precision}
          chartType={chartType}
          enabledIndicators={indicators}
          onToggleIndicator={toggleIndicator}
          showVolume={showVolume}
          logScale={logScale}
          magnet={magnet}
          tool={tool}
          onToolChange={onTool}
          drawings={hideDrawings ? [] : drawings}
          onDrawingsChange={commitDrawings}
          selectedId={selectedId}
          onSelect={setSelectedId}
          drawColor={drawColor}
          markers={chartMarkers}
          trades={chartTrades}
          showTrades={showTrades}
          showTradeLabels={showTradeLabels}
          displayOffset={displayOffset}
          loading={loading}
          gexLevels={gexLevels}
          hasMoreOlder={hasMoreOlder}
          onRequestOlder={loadOlder}
          fitKey={`${id}-${symbol}-${interval}`}
          fitMode="recent"
        />

        {loading && bars.length === 0 && (
          <div className="mc-overlay"><b>Loading {symbol} {interval.toUpperCase()}…</b></div>
        )}
        {error && (
          <div className="mc-overlay" role="alert">
            <AlertTriangle size={22} color="#F5B544" />
            <b>Couldn’t load {symbol} {interval.toUpperCase()}</b>
            <p>The market data service didn’t respond. Check your connection and try again.</p>
            <button type="button" className="mc-retry" onClick={() => barsQ.refetch()}><RotateCw size={12} /> Retry</button>
          </div>
        )}

        {/* Indicator legend */}
        {!loading && !error && activeInds.length > 0 && (
          <div className="mk-cv-top" style={{ pointerEvents: 'none' }}>
            <div className="mk-inds">
              {activeInds.map((ind) => (
                <span key={ind.id} className="mk-ind" style={ind.hidden ? { opacity: 0.55 } : undefined}>
                  <i className="mk-dot" style={{ background: ind.lines.find((l) => l.k === ind.primary)?.color || ind.lines[0].color }} />{ind.label}
                  <button type="button" style={{ pointerEvents: 'auto' }} onClick={() => indicatorStore.patch(ind.id, (o) => ({ ...o, hidden: !o.hidden }))} aria-label={ind.hidden ? `Show ${ind.label}` : `Hide ${ind.label}`} title={ind.hidden ? 'Show' : 'Hide'}>{ind.hidden ? <EyeOff size={10} /> : <Eye size={10} />}</button>
                </span>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
});

/* Indicator menu wrapper so the pane toolbar reuses the real IndicatorMenu component. */
function CascadingIndicators({ enabledIndicators, onToggleIndicator, onClearIndicators, interval }) {
  const [open, setOpen] = useState(false);
  return (
    <IndicatorMenu
      enabledIndicators={enabledIndicators}
      onToggleIndicator={onToggleIndicator}
      onClearIndicators={onClearIndicators}
      interval={interval}
      open={open}
      onOpenChange={setOpen}
    />
  );
}

export default MultiChartGrid;
