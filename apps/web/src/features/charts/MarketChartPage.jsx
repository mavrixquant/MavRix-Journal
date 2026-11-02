import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Menu, X, Briefcase, AlertTriangle, RotateCw, Keyboard, Loader2 } from 'lucide-react';

import { useMarketCatalog, useMarketBars } from '@/shared/api/marketData';
import { queryClient } from '@/shared/api/queryClient';
import { useJournalTrades } from '@/shared/api/journalTrades';
import { getTimezoneOffsetSeconds, toDisplaySeconds, tradeTimeToUtcSeconds } from '@/shared/trading/tradeTime';
import { resolveTimezone } from '@/shared/format/datetime';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

import CandlestickChart from './components/CandlestickChart';
import QuoteHeader from './components/QuoteHeader';
import WatchlistSidebar from './components/WatchlistSidebar';
import ChartLoadingOverlay from './components/ChartLoadingOverlay';

const DEFAULT_SYMBOL = 'NQ';
const DEFAULT_INTERVAL = '5m';
const INTERVAL_KEYS = { 1: '1m', 2: '5m', 3: '15m', 4: '1h', 5: '4h', 6: '1d' };
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
  ['/', 'Search symbols'],
  ['[', 'Show or hide watchlist'],
  ['F', 'Fullscreen'],
  ['T', 'Show or hide journal trades'],
  ['R', 'Refresh data'],
  ['H', 'Horizontal line'],
  ['M', 'Measure'],
  ['I', 'Indicators'],
  ['Esc', 'Cancel tool or close panel'],
];

const CSS = `
  .mc-root { --mc-h: calc(100dvh - 150px); width: 100%; display: grid; grid-template-columns: 264px minmax(0,1fr); gap: 14px; align-items: stretch; height: max(580px, var(--mc-h)); transition: grid-template-columns .25s cubic-bezier(.2,.8,.25,1); }
  .mc-root.is-rail-closed { grid-template-columns: 0 minmax(0,1fr); gap: 0; }
  .mc-rail { min-width: 0; overflow: hidden; display: flex; }
  .mc-rail > aside { position: static !important; max-height: none !important; width: 264px; flex: 1; }
  .mc-root.is-rail-closed .mc-rail { visibility: hidden; }
  .mc-stage { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 10px; }

  .mc-panel { position: relative; flex: 1; min-height: 0; border-radius: 16px; border: 1px solid rgba(255,255,255,.08); background: linear-gradient(180deg, rgba(15,18,25,.78), rgba(10,13,19,.6)); overflow: hidden; }
  .mc-bar { position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 20; overflow: hidden; }
  .mc-bar i { display: block; height: 100%; width: 30%; background: linear-gradient(90deg, transparent, var(--accent), transparent); animation: mcSlide 1.3s ease infinite; }
  @keyframes mcSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }

  .mc-foot { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; flex-shrink: 0; padding: 0 2px; font: 600 11px 'IBM Plex Mono', monospace; color: #545E6E; }
  .mc-btn { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,.08); background: transparent; color: #8892A3; font: inherit; font-weight: 700; cursor: pointer; transition: color .15s, border-color .15s, background-color .15s; }
  .mc-btn:hover { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 30%, transparent); }
  .mc-btn.is-on { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 40%, transparent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .mc-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .mc-btn-n { padding: 0 6px; border-radius: 4px; background: rgba(255,255,255,.07); font-size: 10px; line-height: 16px; }
  .mc-menu { display: none; }
  .mc-stats { display: inline-flex; align-items: center; gap: 16px; padding: 0 4px; }
  .mc-stats span { display: inline-flex; gap: 6px; }
  .mc-stats b { color: #C9CFDA; font-weight: 600; font-variant-numeric: tabular-nums; }
  .mc-stats b.is-up { color: #35C4A1; } .mc-stats b.is-down { color: #FF5C5C; }
  .mc-grow { flex: 1; min-width: 0; }
  .mc-live { display: inline-flex; align-items: center; gap: 7px; }
  .mc-dot { width: 6px; height: 6px; border-radius: 50%; background: #35C4A1; box-shadow: 0 0 0 3px rgba(53,196,161,.18); }
  .mc-dot.is-hist { background: #545E6E; box-shadow: none; }
  .mc-spin { animation: mcSpin .8s linear infinite; }
  @keyframes mcSpin { to { transform: rotate(360deg); } }

  .mc-state { position: absolute; inset: 0; z-index: 8; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; padding: 24px; background: rgba(10,13,19,.82); color: #C9CFDA; font-size: 13px; }
  .mc-state b { font: 700 14px Inter, sans-serif; color: #E7E9EE; }
  .mc-state p { margin: 0; max-width: 360px; color: #8892A3; line-height: 1.5; }
  .mc-retry { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 14px; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent); font: 700 11px 'IBM Plex Mono', monospace; cursor: pointer; }
  .mc-skel { position: absolute; inset: 0; z-index: 7; pointer-events: none; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.045) 50%, transparent 70%) 0 0 / 250% 100%, repeating-linear-gradient(90deg, rgba(255,255,255,.025) 0 10px, transparent 10px 22px); animation: mcShimmer 1.4s linear infinite; }
  @keyframes mcShimmer { from { background-position: 150% 0, 0 0; } to { background-position: -100% 0, 0 0; } }

  .mc-root.is-full { position: fixed; inset: 0; z-index: 2000; height: 100dvh; padding: 14px; background: #0A0D13; }

  .mc-scrim { display: none; }
  .mc-drawer-x { display: none; position: absolute; top: 18px; right: 18px; z-index: 3; width: 26px; height: 26px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: #8892A3; cursor: pointer; }

  .mc-help-scrim { position: fixed; inset: 0; z-index: 3500; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); }
  .mc-help { width: min(420px, 100%); padding: 18px 20px; border-radius: 14px; background: #11151F; border: 1px solid #212836; box-shadow: 0 24px 60px -20px rgba(0,0,0,.95); color: #C9CFDA; font-family: Inter, sans-serif; }
  .mc-help-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-weight: 700; font-size: 14px; color: #E7E9EE; }
  .mc-help-head button { display: inline-flex; width: 26px; height: 26px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid rgba(255,255,255,.1); background: transparent; color: #8892A3; cursor: pointer; }
  .mc-help ul { list-style: none; margin: 0; padding: 0; }
  .mc-help li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px solid rgba(255,255,255,.05); font-size: 12.5px; }
  .mc-help li:first-child { border-top: 0; }
  .mc-kbd { padding: 2px 7px; border-radius: 5px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); color: #E7E9EE; font: 600 11px 'IBM Plex Mono', monospace; }

  @media (max-width: 1100px) {
    .mc-root, .mc-root.is-rail-closed { grid-template-columns: minmax(0,1fr); gap: 0; height: max(540px, calc(100dvh - 130px)); }
    .mc-desk { display: none; }
    .mc-menu { display: inline-flex; }
    .mc-rail { position: fixed; inset: 0 auto 0 0; z-index: 2500; width: min(300px, 86vw); padding: 12px; background: #0A0D13; border-right: 1px solid rgba(255,255,255,.08); transform: translateX(-102%); transition: transform .25s cubic-bezier(.2,.8,.25,1); visibility: visible !important; }
    .mc-rail > aside { display: flex !important; width: 100%; }
    .mc-root.is-drawer .mc-rail { transform: none; }
    .mc-scrim { display: block; position: fixed; inset: 0; z-index: 2400; background: rgba(0,0,0,.55); }
    .mc-drawer-x { display: inline-flex; }
  }
  @media (max-width: 760px) { .mc-stats { display: none; } }
  @media (prefers-reduced-motion: reduce) { .mc-root, .mc-rail, .mc-bar i, .mc-skel, .mc-spin { transition: none; animation: none; } }
`;

// Latest bar index with time <= t (bars sorted ascending).
function snapToBar(bars, t) {
  let lo = 0, hi = bars.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid].time <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

const fmtN = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export default function MarketChartPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();

  const symbol = (searchParams.get('symbol') || DEFAULT_SYMBOL).toUpperCase();
  const interval = searchParams.get('interval') || DEFAULT_INTERVAL;
  const fromParam = searchParams.get('from') || null;
  const toParam = searchParams.get('to') || null;
  const presetParam = searchParams.get('range') || null;

  const [railOpen, setRailOpen] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [full, setFull] = useState(false);
  const [showTrades, setShowTrades] = useState(true);
  const [help, setHelp] = useState(false);
  const fullRef = useRef(false);
  fullRef.current = full;

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
  // increasing (can happen around DST changes) — the chart library throws on duplicates.
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
  const fitContentKey = `${symbol}-${interval}-${fromParam}-${toParam}`;

  // ---- Journal trades -> boxes + entry markers (intraday only) ----
  const journalResult = useJournalTrades();
  const journal = journalResult?.trades || EMPTY;
  const { chartTrades, chartMarkers, tradeCount } = useMemo(() => {
    if (interval === '1d' || displayBars.length === 0) return { chartTrades: [], chartMarkers: [], tradeCount: 0 };
    const first = displayBars[0].time;
    const last = displayBars[displayBars.length - 1].time;
    const boxes = [];
    const marks = [];
    for (const t of journal) {
      const tSym = String(t.symbol || t.instrument || '').toUpperCase();
      if (tSym && tSym !== symbol) continue;
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
      marks.push({
        time: displayBars[idx].time,
        position: long ? 'belowBar' : 'aboveBar',
        shape: long ? 'arrowUp' : 'arrowDown',
        color: win === false ? '#FF5C5C' : win ? '#35C4A1' : '#F5B544',
        text: Number.isFinite(pnl) ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}` : '',
      });
      if (exit != null) {
        // Snap both ends to real bar times so the box always has coordinates to draw at.
        const exitIdx = snapToBar(displayBars, exit);
        boxes.push({
          entryTimeSec: displayBars[idx].time,
          exitTimeSec: displayBars[Math.max(exitIdx, idx)].time,
          entryPrice: Number(t.entryPrice) || null,
          stopLoss: Number(t.stopLoss) || null,
          takeProfit: Number(t.takeProfit) || null,
        });
      }
    }
    marks.sort((a, b) => a.time - b.time);
    return { chartTrades: boxes, chartMarkers: marks, tradeCount: marks.length };
  }, [journal, displayBars, interval, symbol, displayTz]);

  // ---- Loaded-range stats ----
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

  // ---- Range presets ----
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
  }, []);

  // Fullscreen the whole document so portaled popovers (date picker) stay visible.
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

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) return;
      if (INTERVAL_KEYS[e.key]) setIntervalParam(INTERVAL_KEYS[e.key]);
      else if (e.key === '/') {
        e.preventDefault();
        setRailOpen(true);
        if (window.matchMedia('(max-width: 1100px)').matches) setDrawer(true);
        setTimeout(() => document.querySelector('.wl-search-input')?.focus(), 60);
      }
      else if (e.key === '?') setHelp((v) => !v);
      else if (e.key === 'f' || e.key === 'F') toggleFull();
      else if (e.key === 't' || e.key === 'T') setShowTrades((v) => !v);
      else if (e.key === '[') setRailOpen((v) => !v);
      else if (e.key === 'r' || e.key === 'R') handleRefresh();
      else if (e.key === 'Escape') { setHelp(false); setDrawer(false); if (fullRef.current) toggleFull(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setIntervalParam, handleRefresh, toggleFull]);

  // ---- One-shot load animation per chart context ----
  const [showLoader, setShowLoader] = useState(false);
  const timerRef = useRef(null);
  const shownRef = useRef(new Set());
  const ctxKey = `${symbol}-${interval}-${fromParam || ''}-${toParam || ''}`;

  useEffect(() => {
    clearTimeout(timerRef.current);
    setShowLoader(false);
    return () => clearTimeout(timerRef.current);
  }, [ctxKey]);

  useEffect(() => {
    if (barsQuery.isLoading || bars.length === 0 || shownRef.current.has(ctxKey)) return;
    shownRef.current.add(ctxKey);
    setShowLoader(true);
    timerRef.current = setTimeout(() => setShowLoader(false), 2200);
  }, [barsQuery.isLoading, bars.length, ctxKey]);

  const symInfo = catalog?.symbols?.find((s) => s.code === symbol);
  const isLive = !fromParam;

  return (
    <>
      <style>{CSS}</style>
      <div className={`mc-root${full ? '' : ' page-fade-in'}${railOpen ? '' : ' is-rail-closed'}${drawer ? ' is-drawer' : ''}${full ? ' is-full' : ''}`}>
        {drawer && <div className="mc-scrim" onClick={() => setDrawer(false)} />}
        <div className="mc-rail">
          <button type="button" className="mc-drawer-x" onClick={() => setDrawer(false)} aria-label="Close watchlist"><X size={13} /></button>
          <WatchlistSidebar catalog={catalog?.symbols ?? []} activeSymbol={symbol} onChange={setSymbol} />
        </div>

        <div className="mc-stage">
          <QuoteHeader
            symbol={symbol} displayName={symInfo?.label || ''} hasData={!!symInfo?.hasData}
            interval={interval} onIntervalChange={setIntervalParam}
            lastBarTime={lastBarTime} displayTz={displayTz}
            onRefresh={handleRefresh} isRefreshing={barsQuery.isFetching && !barsQuery.isFetchingNextPage}
            onToggleFullscreen={toggleFull} isFullscreen={full}
            from={fromParam} to={toParam} onRangeChange={handleRangeChange}
            presets={PRESETS} activePreset={activePreset} onPreset={applyPreset}
            onOpenWatchlist={() => setDrawer(true)}
          />

          <div className="mc-panel">
            {(filling || barsQuery.isFetchingNextPage) && <div className="mc-bar"><i /></div>}
            <CandlestickChart
              bars={displayBars}
              interval={interval}
              symbol={symbol}
              markers={showTrades ? chartMarkers : EMPTY}
              trades={showTrades ? chartTrades : EMPTY}
              fitContentKey={fitContentKey}
              hasMoreOlder={hasMoreOlder}
              onRequestOlder={handleLoadOlder}
            />
            {barsQuery.isLoading && bars.length === 0 && <div className="mc-skel" aria-hidden />}
            {barsQuery.isError && bars.length === 0 && (
              <div className="mc-state" role="alert">
                <AlertTriangle size={22} color="#F5B544" />
                <b>Couldn’t load {symbol} {interval.toUpperCase()} data</b>
                <p>The market data service didn’t respond. Check your connection and try again.</p>
                <button type="button" className="mc-retry" onClick={() => barsQuery.refetch()}><RotateCw size={12} /> Retry</button>
              </div>
            )}
            {showLoader && <ChartLoadingOverlay symbol={symbol} interval={interval} />}
          </div>

          <div className="mc-foot">
            <button type="button" className="mc-btn mc-desk" onClick={() => setRailOpen((v) => !v)} title="Toggle watchlist ([)">
              {railOpen ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />} Watchlist
            </button>
            <button type="button" className="mc-btn mc-menu" onClick={() => setDrawer(true)}><Menu size={13} /> Symbols</button>
            {interval !== '1d' && (
              <button type="button" className={`mc-btn${showTrades ? ' is-on' : ''}`} onClick={() => setShowTrades((v) => !v)} aria-pressed={showTrades} title="Show journal trades on the chart (T)">
                <Briefcase size={12} /> Journal trades <span className="mc-btn-n">{tradeCount}</span>
              </button>
            )}

            <div className="mc-stats">
              <span>Bars <b>{bars.length.toLocaleString()}</b></span>
              {rangeStats && (
                <>
                  <span>High <b>{fmtN(rangeStats.hi)}</b></span>
                  <span>Low <b>{fmtN(rangeStats.lo)}</b></span>
                  <span>Change <b className={rangeStats.pct >= 0 ? 'is-up' : 'is-down'}>{rangeStats.pct >= 0 ? '+' : ''}{rangeStats.pct.toFixed(2)}%</b></span>
                </>
              )}
            </div>

            <span className="mc-grow" />

            {barsQuery.isFetchingNextPage && <span className="mc-live"><Loader2 size={12} className="mc-spin" />Loading older history</span>}
            <button type="button" className="mc-btn" onClick={() => setHelp(true)} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts"><Keyboard size={13} /></button>
            <span className="mc-live"><i className={`mc-dot${isLive ? '' : ' is-hist'}`} />{isLive ? 'Live, refreshes every 60s' : 'Historical range'}</span>
          </div>
        </div>

        {help && (
          <div className="mc-help-scrim" onClick={() => setHelp(false)}>
            <div className="mc-help" role="dialog" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
              <div className="mc-help-head">Keyboard shortcuts <button type="button" onClick={() => setHelp(false)} aria-label="Close"><X size={13} /></button></div>
              <ul>
                {SHORTCUTS.map(([k, d]) => (<li key={k}><span>{d}</span><span className="mc-kbd">{k}</span></li>))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
}