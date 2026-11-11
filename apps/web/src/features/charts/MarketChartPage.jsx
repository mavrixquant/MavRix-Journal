import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, RotateCw, X } from 'lucide-react';

import { useMarketCatalog, useMarketBars } from '@/shared/api/marketData';
import { queryClient } from '@/shared/api/queryClient';
import { useJournalTrades } from '@/shared/api/journalTrades';
import { getTimezoneOffsetSeconds, toDisplaySeconds, tradeTimeToUtcSeconds } from '@/shared/trading/tradeTime';
import { resolveTimezone } from '@/shared/format/datetime';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

import CandlestickChart from './components/CandlestickChart';
import QuoteHeader from './components/QuoteHeader';
import ChartToolbar from './components/ChartToolbar';
import DrawingToolbar from './components/DrawingToolbar';
import SidePanel from './components/SidePanel';
import SymbolPalette from './components/SymbolPalette';
import StatusBar from './components/StatusBar';
import { CSS } from './lib/chartStyles';
import { pricePrecision } from './lib/chartTheme';
import { DRAW_COLORS } from './lib/drawings';

const DEFAULT_SYMBOL = 'NQ';
const DEFAULT_INTERVAL = '1m';
const INTERVAL_KEYS = { 1: '1m', 2: '5m', 3: '15m', 4: '1h', 5: '4h', 6: '1d' };
const TOOL_KEYS = { h: 'hline', l: 'trend', y: 'ray', b: 'rect', g: 'fib', p: 'rr', m: 'measure' };
const DAY = 86400000;
const EMPTY = [];
const PRESETS = [
  { id: 'default', label: 'Live', days: null },
  { id: '1d', label: '1D', days: 1 },
  { id: '5d', label: '5D', days: 5 },
  { id: '1m', label: '1M', days: 30 },
  { id: '3m', label: '3M', days: 90 },
  { id: '6m', label: '6M', days: 180 },
  { id: 'ytd', label: 'YTD', ytd: true },
];
const SHORTCUTS = [
  ['1 – 6', 'Switch timeframe'],
  ['/  or  Ctrl K', 'Search symbols'],
  ['[', 'Show or hide side panel'],
  ['F', 'Fullscreen'],
  ['R', 'Refresh data'],
  ['I', 'Indicators'],
  ['J', 'Show or hide journal trades'],
  ['H', 'Horizontal line'],
  ['L', 'Trend line'],
  ['Y', 'Ray'],
  ['B', 'Rectangle'],
  ['G', 'Fib retracement'],
  ['P', 'Risk / reward position'],
  ['M', 'Measure'],
  ['Q', 'Magnet (snap to OHLC)'],
  ['Drag', 'Move a drawing, or drag its handles to resize'],
  ['Del', 'Delete selected drawing'],
  ['Ctrl Z', 'Undo drawing change'],
  ['Esc', 'Cancel tool, deselect, close'],
];

/* -------------------------------- storage -------------------------------- */
const PREF_KEY = 'mavrix:chart:prefs:v2';
const OLD_PREF_KEY = 'mavrix:chart:prefs';
const drawKey = (s) => `mavrix:chart:drawings:${s}`;
const oldLinesKey = (s) => `mavrix:chart:lines:${s}`;

function readJson(key, fallback) {
  try { const r = window.localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}
function writeJson(key, value) { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } }

function loadPrefs() {
  const p = readJson(PREF_KEY, null);
  if (p) return p;
  const old = readJson(OLD_PREF_KEY, {});
  return {
    chartType: old.ha ? 'ha' : 'candles',
    volume: old.volume !== false,
    log: !!old.log,
    indicators: Array.isArray(old.indicators) ? old.indicators.filter((i) => ['ema20', 'ema50', 'sma200', 'vwap', 'bb', 'rsi'].includes(i)) : ['ema20'],
  };
}

function loadDrawings(symbol) {
  const saved = readJson(drawKey(symbol), null);
  if (Array.isArray(saved)) return saved;
  // Migrate horizontal lines saved by the previous chart version.
  const old = readJson(oldLinesKey(symbol), []);
  if (Array.isArray(old) && old.length) {
    const t = Math.floor(Date.now() / 1000);
    return old.filter((p) => Number.isFinite(p)).map((p, i) => ({ id: `legacy${i}`, type: 'hline', color: '#F5B544', pts: [{ t, p }] }));
  }
  return [];
}

// Latest bar index with time <= t (bars sorted ascending).
function snapToBar(bars, t) {
  let lo = 0, hi = bars.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid].time <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

function formatChartTime(t, interval, tz) {
  if (t == null) return null;
  const z = tz || undefined;
  if (interval === '1d') {
    const d = new Date(`${t}T00:00:00`);
    return Number.isNaN(d.getTime()) ? String(t) : d.toLocaleDateString('en-US', { timeZone: z, month: 'short', day: 'numeric', year: 'numeric' });
  }
  const d = new Date(Number(t) * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString('en-US', { timeZone: z, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function MarketChartPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();
  const { accountId } = useDashboardAccount();
  const chartRef = useRef(null);

  const symbol = (searchParams.get('symbol') || DEFAULT_SYMBOL).toUpperCase();
  const interval = searchParams.get('interval') || DEFAULT_INTERVAL;
  const fromParam = searchParams.get('from') || null;
  const toParam = searchParams.get('to') || null;
  const presetParam = searchParams.get('range') || null;

  /* ------------------------------ persisted prefs ------------------------------ */
  const prefs = useRef(loadPrefs()).current;
  const [chartType, setChartType] = useState(prefs.chartType || 'candles');
  const [showVolume, setShowVolume] = useState(prefs.volume !== false);
  const [logScale, setLogScale] = useState(!!prefs.log);
  const [magnet, setMagnet] = useState(!!prefs.magnet);
  const [indicators, setIndicators] = useState(Array.isArray(prefs.indicators) ? prefs.indicators : ['ema20']);
  const [panelOpen, setPanelOpen] = useState(prefs.panelOpen !== false);
  const [panelTab, setPanelTab] = useState(prefs.panelTab || 'watch');
  const [drawColor, setDrawColor] = useState(prefs.drawColor || DRAW_COLORS[0]);
  const [showTrades, setShowTrades] = useState(prefs.showTrades !== false);
  const [showLabels, setShowLabels] = useState(!!prefs.showLabels);
  useEffect(() => {
    writeJson(PREF_KEY, { chartType, volume: showVolume, log: logScale, magnet, indicators, panelOpen, panelTab, drawColor, showTrades, showLabels });
  }, [chartType, showVolume, logScale, magnet, indicators, panelOpen, panelTab, drawColor, showTrades, showLabels]);

  /* ----------------------------------- UI state ----------------------------------- */
  const [drawer, setDrawer] = useState(false);
  const [full, setFull] = useState(false);
  const [help, setHelp] = useState(false);
  const [palette, setPalette] = useState(false);
  const [indOpen, setIndOpen] = useState(false);
  const [tool, setTool] = useState('cursor');
  const [selectedId, setSelectedId] = useState(null);
  const [hideDrawings, setHideDrawings] = useState(false);
  const [focus, setFocus] = useState(null);
  const [activeTradeId, setActiveTradeId] = useState(null);
  const fullRef = useRef(false);
  fullRef.current = full;

  /* ----------------------------------- drawings ----------------------------------- */
  const [drawings, setDrawingsState] = useState(() => loadDrawings(symbol));
  const historyRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const symbolRef = useRef(symbol);
  const drawingsRef = useRef(drawings);
  drawingsRef.current = drawings;

  useEffect(() => {
    symbolRef.current = symbol;
    setDrawingsState(loadDrawings(symbol));
    historyRef.current = [];
    setCanUndo(false);
    setSelectedId(null);
    setTool('cursor');
    setFocus(null);
    setActiveTradeId(null);
  }, [symbol]);

  const setDrawings = useCallback((next) => {
    historyRef.current = [...historyRef.current.slice(-39), drawingsRef.current];
    setCanUndo(true);
    setDrawingsState(next);
    writeJson(drawKey(symbolRef.current), next);
  }, []);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setCanUndo(historyRef.current.length > 0);
    setDrawingsState(prev);
    writeJson(drawKey(symbolRef.current), prev);
    setSelectedId(null);
  }, []);

  const removeDrawing = useCallback((id) => {
    setDrawings(drawingsRef.current.filter((d) => d.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, [setDrawings]);

  const clearDrawings = useCallback(() => { if (drawingsRef.current.length) setDrawings([]); setSelectedId(null); }, [setDrawings]);

  /* --------------------------------- URL params --------------------------------- */
  const setSymbol = useCallback((next) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('symbol', next);
    sp.delete('from'); sp.delete('to'); sp.delete('range');
    setSearchParams(sp, { replace: true });
    setDrawer(false);
  }, [searchParams, setSearchParams]);

  const setIntervalParam = useCallback((next) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('interval', next);
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  const setRange = useCallback((fromDate, toDate, presetId = null) => {
    const sp = new URLSearchParams(searchParams);
    if (fromDate && toDate) {
      sp.set('from', fromDate.toISOString());
      sp.set('to', toDate.toISOString());
      if (presetId) sp.set('range', presetId); else sp.delete('range');
    } else {
      sp.delete('from'); sp.delete('to'); sp.delete('range');
    }
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  /* ------------------------------------- data ------------------------------------- */
  const displayTz = useMemo(() => resolveTimezone(settings?.preferences?.timezone || 'auto'), [settings]);
  const { data: catalog } = useMarketCatalog();
  const barsQuery = useMarketBars({ symbol, interval, from: fromParam, to: toParam, enabled: !!catalog });

  const bars = useMemo(() => {
    if (!barsQuery.data) return [];
    const pages = [...barsQuery.data.pages];
    if (!fromParam) pages.reverse();
    const flat = pages.flatMap((p) => p.bars || []);
    const seen = new Map();
    for (const b of flat) {
      const isFlat = b.open === b.high && b.high === b.low && b.low === b.close;
      if (isFlat && (!b.volume || Number(b.volume) === 0)) continue;
      seen.set(b.time, b);
    }
    const out = [...seen.values()];
    out.sort((a, b) => {
      const at = typeof a.time === 'number' ? a.time : new Date(a.time).getTime();
      const bt = typeof b.time === 'number' ? b.time : new Date(b.time).getTime();
      return at - bt;
    });
    return out;
  }, [barsQuery.data, fromParam]);

  const filling = barsQuery.data?.pages?.[0]?.filling;
  const hasMoreOlder = barsQuery.data?.pages?.[barsQuery.data.pages.length - 1]?.hasMoreOlder;

  const displayOffset = useMemo(() => {
    if (interval === '1d') return 0;
    const ref = bars.length > 0 ? bars[Math.floor(bars.length / 2)].time : Math.floor(Date.now() / 1000);
    return getTimezoneOffsetSeconds(displayTz, ref);
  }, [bars, interval, displayTz]);

  // Shift to the display timezone. Drop any bar whose shifted time would not be strictly
  // increasing (can happen around DST changes) because the chart library throws on duplicates.
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

  const lastBarTime = bars.length > 0 ? bars[bars.length - 1].time : null;
  const fitKey = `${symbol}-${interval}-${fromParam}-${toParam}`;
  const symInfo = catalog?.symbols?.find((s) => s.code === symbol);
  const precision = pricePrecision(symInfo, symbol);

  /* ------------------------ journal trades -> boxes, markers, list ------------------------ */
  const journalResult = useJournalTrades({ accountId });
  const journal = journalResult?.trades || EMPTY;
  const { chartTrades, chartMarkers, tradeRows, journalTotal } = useMemo(() => {
    const symTrades = journal.filter((t) => {
      const s = String(t.symbol || t.instrument || '').toUpperCase();
      return !s || s === symbol;
    });
    if (interval === '1d' || displayBars.length === 0) return { chartTrades: [], chartMarkers: [], tradeRows: [], journalTotal: symTrades.length };
    const first = displayBars[0].time;
    const last = displayBars[displayBars.length - 1].time;
    const boxes = [], marks = [], rows = [];
    for (const t of symTrades) {
      const entryUtc = tradeTimeToUtcSeconds(t.date, t.entryTime, displayTz);
      if (entryUtc == null) continue;
      const entry = toDisplaySeconds(entryUtc, displayTz);
      if (entry < first || entry > last) continue;
      const exitUtc = t.exitTime ? tradeTimeToUtcSeconds(t.exitDate || t.date, t.exitTime, displayTz) : null;
      const exit = exitUtc != null ? toDisplaySeconds(exitUtc, displayTz) : null;
      const long = /long|buy/i.test(String(t.side || t.direction || ''));
      const pnl = Number(t.pnl ?? t.netPnl);
      const win = Number.isFinite(pnl) ? pnl >= 0 : null;
      const idx = snapToBar(displayBars, entry);
      if (idx < 0) continue;
      const label = Number.isFinite(pnl) ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}` : '';
      marks.push({
        time: displayBars[idx].time,
        position: long ? 'belowBar' : 'aboveBar',
        shape: long ? 'arrowUp' : 'arrowDown',
        color: win === false ? '#FF5C5C' : win ? '#35C4A1' : '#F5B544',
        text: label,
      });
      rows.push({
        id: t.id || `${t.date}-${t.entryTime}`, date: t.date, time: t.entryTime, long,
        net: (Number(t.pnl) || 0) - (Number(t.commission) || 0), displayTs: displayBars[idx].time,
      });
      if (exit != null) {
        const exitIdx = snapToBar(displayBars, exit);
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
    rows.sort((a, b) => b.displayTs - a.displayTs);
    return { chartTrades: boxes, chartMarkers: marks, tradeRows: rows, journalTotal: symTrades.length };
  }, [journal, displayBars, interval, symbol, displayTz]);

  const rangeStats = useMemo(() => {
    if (bars.length === 0) return null;
    let hi = -Infinity, lo = Infinity;
    for (const b of bars) {
      const h = Number(b.high), l = Number(b.low);
      if (h > hi) hi = h;
      if (l < lo) lo = l;
    }
    const first = Number(bars[0].open), last = Number(bars[bars.length - 1].close);
    if (!Number.isFinite(hi) || !Number.isFinite(lo)) return null;
    return { hi, lo, pct: first ? ((last - first) / first) * 100 : 0 };
  }, [bars]);

  /* ----------------------------------- ranges ----------------------------------- */
  const activePreset = !fromParam ? 'default' : PRESETS.some((p) => p.id === presetParam) ? presetParam : 'custom';
  const applyPreset = useCallback((p) => {
    if (p.id === 'default') return setRange(null, null);
    const to = new Date(); to.setHours(23, 59, 59, 999);
    const from = new Date();
    if (p.ytd) from.setMonth(0, 1);
    else from.setTime(from.getTime() - p.days * DAY);
    from.setHours(0, 0, 0, 0);
    return setRange(from, to, p.id);
  }, [setRange]);
  const handleRangeChange = useCallback((f, t) => setRange(f, t, null), [setRange]);

  const handleLoadOlder = useCallback(() => {
    if (barsQuery.hasNextPage && !barsQuery.isFetchingNextPage) return barsQuery.fetchNextPage();
    return undefined;
  }, [barsQuery]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['market-data', 'bars'] });
    queryClient.invalidateQueries({ queryKey: ['market-data', 'quote'] });
    queryClient.invalidateQueries({ queryKey: ['market-data', 'quotes'] });
  }, []);

  // Fullscreen the whole document so portaled popovers stay visible.
  const toggleFull = useCallback(() => {
    const next = !fullRef.current;
    setFull(next);
    try {
      if (next) document.documentElement.requestFullscreen?.()?.catch?.(() => {});
      else if (document.fullscreenElement) document.exitFullscreen?.()?.catch?.(() => {});
    } catch { /* overlay mode still works */ }
  }, []);
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setFull(false); };
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      if (document.fullscreenElement) document.exitFullscreen?.()?.catch?.(() => {});
    };
  }, []);

  usePageHeader({ title: 'Chart', subtitle: `${symbol} · ${interval.toUpperCase()} · ${displayTz}` });

  /* ---------------------------------- handlers ---------------------------------- */
  const toggleIndicator = useCallback((id) => setIndicators((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])), []);
  const focusTrade = useCallback((row) => {
    setActiveTradeId(row.id);
    setFocus({ time: row.displayTs, nonce: Date.now() });
    setDrawer(false);
  }, []);
  const openPanel = useCallback((tab) => {
    if (tab) setPanelTab(tab);
    setPanelOpen(true);
    if (window.matchMedia('(max-width: 1100px)').matches) setDrawer(true);
  }, []);

  /* ------------------------------ keyboard shortcuts ------------------------------ */
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable;
      const k = e.key;
      if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); return; }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && k.toLowerCase() === 'z' && !typing) { e.preventDefault(); undo(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (k === 'Escape') {
        if (help) setHelp(false);
        else if (tool !== 'cursor') setTool('cursor');
        else if (selectedId) setSelectedId(null);
        else if (drawer) setDrawer(false);
        else if (fullRef.current) toggleFull();
        return;
      }
      if (typing || palette) return;
      const lower = k.length === 1 ? k.toLowerCase() : k;
      if (INTERVAL_KEYS[k]) setIntervalParam(INTERVAL_KEYS[k]);
      else if (k === '/') { e.preventDefault(); setPalette(true); }
      else if (k === '?') setHelp((v) => !v);
      else if (k === '[') setPanelOpen((v) => !v);
      else if (lower === 'f') toggleFull();
      else if (lower === 'r') handleRefresh();
      else if (lower === 'i') setIndOpen((v) => !v);
      else if (lower === 'j') setShowTrades((v) => !v);
      else if (lower === 'q') setMagnet((v) => !v);
      else if (TOOL_KEYS[lower]) setTool((cur) => (cur === TOOL_KEYS[lower] ? 'cursor' : TOOL_KEYS[lower]));
      else if ((k === 'Delete' || k === 'Backspace') && selectedId) { e.preventDefault(); removeDrawing(selectedId); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [help, tool, selectedId, drawer, palette, undo, setIntervalParam, handleRefresh, toggleFull, removeDrawing]);

  /* ------------------------------------ render ------------------------------------ */
  const isLive = !fromParam;
  const panelProps = {
    tab: panelTab, onTab: setPanelTab, onClose: () => { setDrawer(false); setPanelOpen(false); },
    catalog: catalog?.symbols ?? EMPTY, activeSymbol: symbol, onSymbol: setSymbol,
    tradeRows, tradeCount: tradeRows.length, journalTotal, activeTradeId, onFocusTrade: focusTrade,
    showTrades, onToggleTrades: setShowTrades, showLabels, onToggleLabels: setShowLabels,
    drawings, selectedId, onSelect: (id) => { setSelectedId(id); setTool('cursor'); }, onRemoveDrawing: removeDrawing, onClearDrawings: clearDrawings,
    precision, enabledIndicators: indicators, onToggleIndicator: toggleIndicator,
  };

  return (
    <>
      <style>{CSS}</style>
      <div className={`mk-root${full ? ' is-full' : ' page-fade-in'}${panelOpen ? '' : ' is-panel-closed'}${drawer ? ' is-drawer' : ''}`}>
        <div className="mk-shell">
          <QuoteHeader symbol={symbol} symInfo={symInfo} precision={precision} onOpenSymbols={() => setPalette(true)} onOpenDrawer={() => openPanel()} />

          <ChartToolbar
            interval={interval} onIntervalChange={setIntervalParam}
            chartType={chartType} onChartType={setChartType}
            enabledIndicators={indicators} onToggleIndicator={toggleIndicator} onClearIndicators={() => setIndicators([])}
            indicatorsOpen={indOpen} onIndicatorsOpenChange={setIndOpen}
            showVolume={showVolume} onToggleVolume={() => setShowVolume((v) => !v)} logScale={logScale} onToggleLog={() => setLogScale((v) => !v)}
            from={fromParam} to={toParam} presets={PRESETS} activePreset={activePreset} onPreset={applyPreset} onRangeChange={handleRangeChange}
            canUndo={canUndo} onUndo={undo} onScreenshot={() => chartRef.current?.screenshot()}
            onRefresh={handleRefresh} isRefreshing={barsQuery.isFetching && !barsQuery.isFetchingNextPage}
            onToggleFullscreen={toggleFull} isFullscreen={full} onHelp={() => setHelp(true)}
            panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((v) => !v)}
          />

          <div className="mk-body">
            <DrawingToolbar
              tool={tool} onTool={setTool} magnet={magnet} onMagnet={() => setMagnet((v) => !v)}
              color={drawColor} onColor={setDrawColor} hidden={hideDrawings} onToggleHidden={() => setHideDrawings((v) => !v)}
              count={drawings.length} onClear={clearDrawings}
            />

            <div className="mk-stage">
              {(filling || barsQuery.isFetchingNextPage) && <div className="mk-bar"><i /></div>}
              <CandlestickChart
                ref={chartRef}
                bars={displayBars} interval={interval} symbol={symbol} precision={precision}
                chartType={chartType} enabledIndicators={indicators} onToggleIndicator={toggleIndicator}
                showVolume={showVolume} logScale={logScale} magnet={magnet}
                tool={tool} onToolChange={setTool}
                drawings={hideDrawings ? EMPTY : drawings} onDrawingsChange={setDrawings}
                selectedId={selectedId} onSelect={setSelectedId} drawColor={drawColor}
                markers={chartMarkers} trades={chartTrades} showTrades={showTrades} showTradeLabels={showLabels}
                focus={focus} fitKey={fitKey} fitMode={fromParam ? 'all' : 'recent'}
                hasMoreOlder={hasMoreOlder} onRequestOlder={handleLoadOlder} displayOffset={displayOffset}
              />
              {barsQuery.isLoading && bars.length === 0 && <div className="mk-skel" aria-hidden />}
              {barsQuery.isError && bars.length === 0 && (
                <div className="mk-state" role="alert">
                  <AlertTriangle size={22} color="#F5B544" />
                  <b>Couldn’t load {symbol} {interval.toUpperCase()} data</b>
                  <p>The market data service didn’t respond. Check your connection and try again.</p>
                  <button type="button" className="mk-retry" onClick={() => barsQuery.refetch()}><RotateCw size={12} /> Retry</button>
                </div>
              )}
            </div>

            {drawer && <div className="mk-scrim" onClick={() => setDrawer(false)} />}
            <SidePanel {...panelProps} />
          </div>

          <StatusBar
            barCount={bars.length} rangeStats={rangeStats} precision={precision} tz={displayTz}
            lastCandle={formatChartTime(lastBarTime, interval, displayTz)} isLive={isLive}
            loadingOlder={barsQuery.isFetchingNextPage} filling={!!filling}
          />
        </div>

        <SymbolPalette open={palette} onClose={() => setPalette(false)} catalog={catalog?.symbols ?? EMPTY} value={symbol} onPick={setSymbol} />

        {help && (
          <div className="mk-help-scrim" onClick={() => setHelp(false)}>
            <div className="mk-help" role="dialog" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
              <div className="mk-help-head">Keyboard shortcuts <button type="button" onClick={() => setHelp(false)} aria-label="Close"><X size={13} /></button></div>
              <ul>{SHORTCUTS.map(([k, d]) => (<li key={k}><span>{d}</span><span className="mk-kbd">{k}</span></li>))}</ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
