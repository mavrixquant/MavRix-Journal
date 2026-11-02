import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3, ArrowRightToLine, Activity, Camera, MousePointer2, Minus, Ruler, Trash2, Check, CandlestickChart as CandleIcon, X,
} from 'lucide-react';
import {
  createChart, CandlestickSeries, HistogramSeries, LineSeries, createSeriesMarkers,
  CrosshairMode, ColorType, LineStyle, PriceScaleMode,
} from 'lightweight-charts';

import EmptyState from '@/shared/components/EmptyState';
import { chartTheme } from '../lib/chartTheme';

/* ------------------------------ trade boxes ------------------------------ */
class TradeBoxesPrimitive {
  constructor(trades, series, chart) {
    this._trades = trades; this._series = series; this._chart = chart;
    this._paneViews = [{ zOrder: () => 'bottom', renderer: () => this }];
  }
  paneViews() { return this._paneViews; }
  updateAllViews() {}
  draw(target) {
    if (!this._trades?.length) return;
    const ts = this._chart.timeScale();
    const s = this._series;
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      for (const t of this._trades) {
        if (t.entryTimeSec == null || t.exitTimeSec == null) continue;
        const x1 = ts.timeToCoordinate(t.entryTimeSec);
        const x2 = ts.timeToCoordinate(t.exitTimeSec);
        if (x1 === null || x2 === null) continue;
        const yE = t.entryPrice ? s.priceToCoordinate(t.entryPrice) : null;
        const yS = t.stopLoss ? s.priceToCoordinate(t.stopLoss) : null;
        const yT = t.takeProfit ? s.priceToCoordinate(t.takeProfit) : null;
        const left = Math.min(x1, x2);
        const w = Math.max(Math.abs(x2 - x1), 2);
        const box = (y, fill, stroke) => {
          const top = Math.min(yE, y), h = Math.abs(yE - y);
          ctx.fillStyle = fill; ctx.fillRect(left, top, w, h);
          ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(left, top, w, h);
        };
        const line = (y, color, width, dash) => {
          ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
          ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + w, y); ctx.stroke(); ctx.setLineDash([]);
        };
        if (yE !== null && yT !== null) box(yT, 'rgba(53,196,161,.14)', 'rgba(53,196,161,.4)');
        if (yE !== null && yS !== null) box(yS, 'rgba(255,92,92,.14)', 'rgba(255,92,92,.4)');
        if (yT !== null) line(yT, '#35C4A1', 2);
        if (yS !== null) line(yS, '#FF5C5C', 2);
        if (yE !== null) line(yE, '#F5B544', 1, [4, 4]);
      }
    });
  }
}

/* ------------------------------- indicators ------------------------------ */
const num = (v) => Number(v);

function sma(bars, n) {
  const out = []; let sum = 0;
  bars.forEach((b, i) => {
    sum += num(b.close);
    if (i >= n) sum -= num(bars[i - n].close);
    if (i >= n - 1) out.push({ time: b.time, value: sum / n });
  });
  return out;
}
// EMA seeded with an SMA of the first n closes (matches most charting platforms).
function ema(bars, n) {
  const k = 2 / (n + 1); const out = []; let prev = null; let sum = 0;
  bars.forEach((b, i) => {
    const c = num(b.close);
    if (i < n - 1) { sum += c; return; }
    if (i === n - 1) { sum += c; prev = sum / n; } else prev = c * k + prev * (1 - k);
    out.push({ time: b.time, value: prev });
  });
  return out;
}
function vwap(bars) {
  const out = []; let day = null, pv = 0, vol = 0;
  for (const b of bars) {
    const d = Math.floor(b.time / 86400);
    if (d !== day) { day = d; pv = 0; vol = 0; }
    const v = num(b.volume) || 0;
    pv += ((num(b.high) + num(b.low) + num(b.close)) / 3) * v; vol += v;
    if (vol > 0) out.push({ time: b.time, value: pv / vol });
  }
  return out;
}
function bollinger(bars, n = 20, k = 2) {
  const u = [], m = [], l = [];
  for (let i = n - 1; i < bars.length; i++) {
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += num(bars[j].close);
    const mean = s / n; let v = 0;
    for (let j = i - n + 1; j <= i; j++) v += (num(bars[j].close) - mean) ** 2;
    const sd = Math.sqrt(v / n); const time = bars[i].time;
    u.push({ time, value: mean + k * sd }); m.push({ time, value: mean }); l.push({ time, value: mean - k * sd });
  }
  return { u, m, l };
}
// Wilder's RSI
function rsi(bars, n = 14) {
  const out = []; let g = 0, l = 0;
  for (let i = 1; i < bars.length; i++) {
    const d = num(bars[i].close) - num(bars[i - 1].close);
    const up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= n) {
      g += up; l += dn;
      if (i === n) { g /= n; l /= n; out.push({ time: bars[i].time, value: l === 0 ? 100 : 100 - 100 / (1 + g / l) }); }
    } else {
      g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n;
      out.push({ time: bars[i].time, value: l === 0 ? 100 : 100 - 100 / (1 + g / l) });
    }
  }
  return out;
}
function heikinAshi(bars) {
  let pO = null, pC = null;
  return bars.map((b) => {
    const o = num(b.open), h = num(b.high), l = num(b.low), c0 = num(b.close);
    const c = (o + h + l + c0) / 4;
    const ho = pO == null ? (o + c0) / 2 : (pO + pC) / 2;
    pO = ho; pC = c;
    return { time: b.time, open: ho, high: Math.max(h, ho, c), low: Math.min(l, ho, c), close: c };
  });
}

const INDICATORS = [
  { id: 'ema20', label: 'EMA 20', group: 'Overlays', primary: 'v', lines: [{ k: 'v', color: '#F5B544' }], calc: (b) => ({ v: ema(b, 20) }) },
  { id: 'ema50', label: 'EMA 50', group: 'Overlays', primary: 'v', lines: [{ k: 'v', color: '#5EA8FF' }], calc: (b) => ({ v: ema(b, 50) }) },
  { id: 'sma200', label: 'SMA 200', group: 'Overlays', primary: 'v', lines: [{ k: 'v', color: '#B58CFF' }], calc: (b) => ({ v: sma(b, 200) }) },
  { id: 'vwap', label: 'VWAP (daily)', group: 'Overlays', primary: 'v', intradayOnly: true, lines: [{ k: 'v', color: '#FF8AD8' }], calc: (b) => ({ v: vwap(b) }) },
  {
    id: 'bb', label: 'Bollinger 20, 2', group: 'Overlays', primary: 'm',
    lines: [{ k: 'u', color: 'rgba(94,168,255,.75)', width: 1 }, { k: 'm', color: 'rgba(94,168,255,.45)', width: 1, dash: true }, { k: 'l', color: 'rgba(94,168,255,.75)', width: 1 }],
    calc: (b) => bollinger(b, 20, 2),
  },
  { id: 'rsi', label: 'RSI 14', group: 'Oscillators', primary: 'v', pane: 1, lines: [{ k: 'v', color: '#B58CFF', width: 1.5 }], calc: (b) => ({ v: rsi(b, 14) }) },
];

/* -------------------------------- storage -------------------------------- */
const PREF_KEY = 'mavrix:chart:prefs';
const linesKey = (s) => `mavrix:chart:lines:${s}`;
function readJson(key, fallback) {
  try { const r = window.localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}
function writeJson(key, value) { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } }

const fmtPrice = (n) => (n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
const fmtVol = (n) => (n == null || !Number(n) ? null : Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(Number(n)));
function fmtDur(sec) {
  if (!sec) return '0m';
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return [d && `${d}d`, h && `${h}h`, (m || (!d && !h)) && `${m}m`].filter(Boolean).join(' ');
}

function OhlcLegend({ ohlc, interval, ha }) {
  if (!ohlc) return null;
  const o = Number(ohlc.open), c = Number(ohlc.close);
  const up = c >= o;
  const cls = up ? 'is-up' : 'is-down';
  const chg = c - o;
  const pct = o ? (chg / o) * 100 : 0;
  const vol = fmtVol(ohlc.volume);
  return (
    <div className="cl-ohlc" aria-hidden>
      {interval && <span className="cl-ohlc-tf">{interval.toUpperCase()}{ha ? ' · HA' : ''}</span>}
      {['open', 'high', 'low', 'close'].map((k) => (
        <span key={k} className="cl-ohlc-item"><em>{k[0].toUpperCase()}</em><b className={cls}>{fmtPrice(ohlc[k])}</b></span>
      ))}
      <span className={`cl-ohlc-chg ${cls}`}>{chg >= 0 ? '+' : ''}{fmtPrice(chg)} ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)</span>
      {vol && <span className="cl-ohlc-item"><em>Vol</em><b>{vol}</b></span>}
    </div>
  );
}

const CSS = `
  .cl-root { --cl-glass: rgba(12,16,23,.82); --cl-line: rgba(255,255,255,.08); position: relative; width: 100%; height: 100%; }
  .cl-canvas { width: 100%; height: 100%; }
  .cl-canvas.is-tool { cursor: crosshair; }

  .cl-top { position: absolute; top: 12px; left: 16px; z-index: 3; display: flex; flex-direction: column; gap: 6px; max-width: calc(100% - 210px); pointer-events: none; }
  .cl-ohlc { display: inline-flex; flex-wrap: wrap; align-items: center; align-self: flex-start; gap: 6px 14px; padding: 6px 12px; border-radius: 8px; background: rgba(12,16,23,.72); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,.06); font: 11px 'IBM Plex Mono', ui-monospace, monospace; letter-spacing: .02em; }
  .cl-ohlc-item { display: inline-flex; gap: 5px; align-items: center; }
  .cl-ohlc-item em { font-style: normal; color: #545E6E; font-weight: 700; font-size: 10px; }
  .cl-ohlc-item b { font-weight: 700; font-variant-numeric: tabular-nums; color: #C9CFDA; }
  .cl-ohlc b.is-up, .cl-ohlc-chg.is-up { color: #35C4A1; }
  .cl-ohlc b.is-down, .cl-ohlc-chg.is-down { color: #FF5C5C; }
  .cl-ohlc-chg { font-weight: 700; font-variant-numeric: tabular-nums; }
  .cl-ohlc-tf { padding: 1px 7px; border-radius: 4px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); color: #8892A3; font-size: 10px; font-weight: 700; letter-spacing: .04em; }

  .cl-inds { display: flex; flex-wrap: wrap; gap: 4px 6px; pointer-events: auto; }
  .cl-ind { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 4px 0 8px; border-radius: 6px; background: rgba(12,16,23,.66); border: 1px solid rgba(255,255,255,.05); font: 600 10.5px 'IBM Plex Mono', monospace; color: #8892A3; }
  .cl-ind b { color: #C9CFDA; font-weight: 700; font-variant-numeric: tabular-nums; }
  .cl-ind button { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; padding: 0; border: none; border-radius: 4px; background: transparent; color: #545E6E; cursor: pointer; }
  .cl-ind button:hover { color: #E7E9EE; background: rgba(255,255,255,.08); }

  .cl-tools { position: absolute; top: 12px; right: 74px; z-index: 5; display: flex; gap: 2px; padding: 3px; border-radius: 10px; background: var(--cl-glass); border: 1px solid var(--cl-line); backdrop-filter: blur(10px); }
  .cl-tool { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: 7px; background: transparent; color: #8892A3; cursor: pointer; transition: color .15s, background-color .15s, border-color .15s; }
  .cl-tool:hover:not(:disabled) { color: #E7E9EE; background: rgba(255,255,255,.06); }
  .cl-tool.is-on { color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
  .cl-tool:disabled { opacity: .3; cursor: not-allowed; }
  .cl-tool:focus-visible, .cl-pill:focus-visible, .cl-menu-item:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .cl-sep { width: 1px; margin: 4px 3px; background: rgba(255,255,255,.08); }

  .cl-bar { position: absolute; bottom: 38px; left: 14px; z-index: 5; display: flex; gap: 6px; }
  .cl-pill { position: relative; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,.1); background: var(--cl-glass); backdrop-filter: blur(10px); color: #8892A3; font: 700 10.5px 'IBM Plex Mono', monospace; cursor: pointer; transition: color .15s, border-color .15s, background-color .15s; }
  .cl-pill:hover { color: #E7E9EE; border-color: rgba(255,255,255,.2); }
  .cl-pill.is-on { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 38%, transparent); background: color-mix(in srgb, var(--accent) 9%, rgba(12,16,23,.85)); }
  .cl-menu { position: absolute; bottom: 36px; left: 0; min-width: 210px; padding: 5px; border-radius: 10px; background: #11151F; border: 1px solid #212836; box-shadow: 0 18px 40px -12px rgba(0,0,0,.9); animation: clFadeIn .15s ease; }
  .cl-menu-head { padding: 6px 9px 4px; font: 600 10px 'IBM Plex Mono', monospace; color: #545E6E; }
  .cl-menu-item { width: 100%; display: flex; align-items: center; gap: 9px; padding: 7px 9px; border: none; border-radius: 7px; background: transparent; color: #C9CFDA; font: 600 11px 'IBM Plex Mono', monospace; text-align: left; cursor: pointer; }
  .cl-menu-item:hover:not(:disabled) { background: rgba(255,255,255,.05); }
  .cl-menu-item:disabled { opacity: .35; cursor: not-allowed; }
  .cl-swatch { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .cl-check { margin-left: auto; color: var(--accent); }

  .cl-hint, .cl-measure { position: absolute; top: 56px; left: 50%; transform: translateX(-50%); z-index: 6; padding: 6px 12px; border-radius: 8px; background: rgba(12,16,23,.92); border: 1px solid rgba(255,255,255,.1); font: 600 11px 'IBM Plex Mono', monospace; color: #8892A3; pointer-events: none; white-space: nowrap; animation: clFadeInC .15s ease; }
  .cl-measure { display: flex; gap: 12px; font-variant-numeric: tabular-nums; }
  .cl-measure.is-up { color: #35C4A1; border-color: rgba(53,196,161,.35); }
  .cl-measure.is-down { color: #FF5C5C; border-color: rgba(255,92,92,.35); }

  .cl-scroll-btn { position: absolute; bottom: 38px; right: 82px; z-index: 5; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(12,16,23,.85); border: 1px solid rgba(255,255,255,.1); color: #8892A3; cursor: pointer; transition: all .2s ease; backdrop-filter: blur(8px); box-shadow: 0 4px 12px rgba(0,0,0,.5); animation: clFadeIn .2s ease; }
  .cl-scroll-btn:hover { color: var(--accent); border-color: var(--accent-soft2); transform: translateY(-2px); }
  .cl-empty-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  @keyframes clFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  @keyframes clFadeInC { from { opacity: 0; } to { opacity: 1; } }

  @media (max-width: 760px) {
    .cl-top { max-width: calc(100% - 24px); }
    .cl-tools { top: auto; bottom: 74px; right: 12px; }
    .cl-bar { left: 12px; bottom: 38px; }
    .cl-scroll-btn { right: 12px; bottom: 116px; }
    .cl-hint, .cl-measure { top: auto; bottom: 120px; }
  }
  @media (prefers-reduced-motion: reduce) { .cl-menu, .cl-hint, .cl-measure, .cl-scroll-btn { animation: none; } }
`;

export default function CandlestickChart({
  bars, interval, symbol, markers = [], trades = [], focusTime = null, onReady,
  fitContentKey = null, hasMoreOlder = false, onRequestOlder,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const volRef = useRef(null);
  const indRef = useRef({});          // id -> { lineKey: series }
  const indLastRef = useRef({});      // id -> { lineKey: last value }
  const markersPluginRef = useRef(null);
  const linesRef = useRef([]);
  const barsRef = useRef(bars);
  const plotRef = useRef([]);         // what the candle series is actually showing (raw or Heikin Ashi)
  const toolRef = useRef('cursor');
  const symbolRef = useRef(symbol);
  const anchorRef = useRef(null);
  const anchorLineRef = useRef(null);
  const frozenRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const lastFitKeyRef = useRef(undefined);
  const firstTimeRef = useRef(null);
  const lineObjs = useRef([]);

  const prefs = useRef(readJson(PREF_KEY, {})).current;
  const [ohlc, setOhlc] = useState(null);
  const [indVals, setIndVals] = useState({});
  const [atEdge, setAtEdge] = useState(true);
  const [tool, setTool] = useState('cursor');
  const [lines, setLines] = useState([]);
  const [measure, setMeasure] = useState(null);
  const [showVol, setShowVol] = useState(prefs.volume !== false);
  const [logScale, setLogScale] = useState(!!prefs.log);
  const [ha, setHa] = useState(!!prefs.ha);
  const [enabled, setEnabled] = useState(Array.isArray(prefs.indicators) ? prefs.indicators : ['ema20']);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  barsRef.current = bars;
  toolRef.current = tool;
  symbolRef.current = symbol;
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { writeJson(PREF_KEY, { volume: showVol, log: logScale, ha, indicators: enabled }); }, [showVol, logScale, ha, enabled]);

  const isActive = useCallback((ind) => enabled.includes(ind.id) && !(ind.intradayOnly && interval === '1d'), [enabled, interval]);

  function resetMeasure() {
    anchorRef.current = null; frozenRef.current = false; setMeasure(null);
    if (anchorLineRef.current && candleRef.current) { try { candleRef.current.removePriceLine(anchorLineRef.current); } catch { /* gone */ } }
    anchorLineRef.current = null;
  }

  /* ----- create chart once ----- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const chart = createChart(el, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: chartTheme.text, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, attributionLogo: false, panes: { separatorColor: chartTheme.border } },
      grid: { vertLines: { color: chartTheme.grid }, horzLines: { color: chartTheme.grid } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: chartTheme.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: chartTheme.accent }, horzLine: { color: chartTheme.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: chartTheme.accent } },
      rightPriceScale: { borderColor: chartTheme.border, scaleMargins: { top: 0.08, bottom: 0.2 } },
      timeScale: { borderColor: chartTheme.border, timeVisible: true, secondsVisible: false, rightOffset: 6, barSpacing: 8, minBarSpacing: 0.5 },
      handleScroll: true, handleScale: true, autoSize: true,
    });
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: chartTheme.up, downColor: chartTheme.down, borderVisible: false,
      wickUpColor: chartTheme.upWick, wickDownColor: chartTheme.downWick, priceLineVisible: true, lastValueVisible: true,
    });
    let plugin = null;
    try { plugin = createSeriesMarkers(candle, []); } catch { /* optional */ }
    chartRef.current = chart; candleRef.current = candle; markersPluginRef.current = plugin;

    const rawByTime = (t) => { const b = barsRef.current; for (let i = b.length - 1; i >= 0; i--) if (b[i].time === t) return b[i]; return null; };
    const lastLegend = () => {
      const p = plotRef.current; const l = p[p.length - 1];
      return l ? { open: l.open, high: l.high, low: l.low, close: l.close, volume: barsRef.current[barsRef.current.length - 1]?.volume } : null;
    };

    const onMove = (p) => {
      if (!p.time || !p.point) {
        setOhlc(lastLegend());
        setIndVals({ ...indLastRef.current });
      } else {
        const d = p.seriesData.get(candle);
        if (d?.open != null) setOhlc({ ...d, volume: rawByTime(p.time)?.volume });
        const vals = {};
        for (const [id, group] of Object.entries(indRef.current)) {
          vals[id] = {};
          for (const [k, s] of Object.entries(group)) { const v = p.seriesData.get(s)?.value; if (v != null) vals[id][k] = v; }
        }
        setIndVals(vals);
      }
      if (toolRef.current === 'measure' && anchorRef.current && !frozenRef.current && p.point && p.time) {
        const price = candle.coordinateToPrice(p.point.y);
        if (price != null) setMeasure({ a: anchorRef.current, b: { price, time: p.time, logical: p.logical } });
      }
    };
    const onClick = (p) => {
      if (!p.point) return;
      const price = candle.coordinateToPrice(p.point.y);
      if (price == null) return;
      if (toolRef.current === 'hline') {
        const next = [...linesRef.current, Number(price.toFixed(4))];
        linesRef.current = next; setLines(next);
        writeJson(linesKey(symbolRef.current || ''), next);
        setTool('cursor');
      } else if (toolRef.current === 'measure' && p.time) {
        const pt = { price, time: p.time, logical: p.logical };
        if (!anchorRef.current || frozenRef.current) {
          if (anchorLineRef.current) { try { candle.removePriceLine(anchorLineRef.current); } catch { /* gone */ } anchorLineRef.current = null; }
          anchorRef.current = pt; frozenRef.current = false; setMeasure({ a: pt, b: pt });
          anchorLineRef.current = candle.createPriceLine({ price, color: '#8892A3', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: '' });
        } else { frozenRef.current = true; setMeasure({ a: anchorRef.current, b: pt }); }
      }
    };
    const onRange = (r) => { if (r) setAtEdge(r.to >= plotRef.current.length - 5); };
    chart.subscribeCrosshairMove(onMove);
    chart.subscribeClick(onClick);
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);

    return () => {
      chart.unsubscribeCrosshairMove(onMove); chart.unsubscribeClick(onClick);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
      chart.remove();
      chartRef.current = candleRef.current = volRef.current = markersPluginRef.current = null;
      indRef.current = {}; indLastRef.current = {}; linesRef.current = []; lineObjs.current = []; anchorLineRef.current = null;
    };
  }, []);

  useEffect(() => { chartRef.current?.timeScale().applyOptions({ timeVisible: interval !== '1d' }); }, [interval]);

  /* ----- restore saved lines + clear measure when the symbol changes ----- */
  useEffect(() => {
    const saved = readJson(linesKey(symbol || ''), []);
    linesRef.current = Array.isArray(saved) ? saved : [];
    setLines(linesRef.current);
    resetMeasure();
  }, [symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- sync horizontal price lines ----- */
  useEffect(() => {
    const candle = candleRef.current;
    if (!candle) return;
    lineObjs.current.forEach((l) => { try { candle.removePriceLine(l); } catch { /* gone */ } });
    lineObjs.current = lines.map((price) => candle.createPriceLine({ price, color: '#F5B544', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '' }));
  }, [lines]);

  /* ----- candles (raw or Heikin Ashi), fit, keep view when older history is prepended ----- */
  useEffect(() => {
    const candle = candleRef.current, chart = chartRef.current;
    if (!candle || !chart) return;
    const safe = Array.isArray(bars) ? bars : [];
    const data = ha ? heikinAshi(safe) : safe.map((b) => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close }));
    const ts = chart.timeScale();
    const prevRange = ts.getVisibleLogicalRange();
    const prevFirst = firstTimeRef.current;

    candle.setData(data);
    plotRef.current = data;

    if (data.length === 0) { firstTimeRef.current = null; setOhlc(null); return; }

    if (prevRange && prevFirst != null && data[0].time !== prevFirst) {
      const shift = data.findIndex((d) => d.time === prevFirst);
      if (shift > 0) ts.setVisibleLogicalRange({ from: prevRange.from + shift, to: prevRange.to + shift });
    }
    firstTimeRef.current = data[0].time;

    if (fitContentKey !== null && fitContentKey !== lastFitKeyRef.current) {
      lastFitKeyRef.current = fitContentKey;
      ts.fitContent();
    }
    const last = data[data.length - 1];
    setOhlc({ open: last.open, high: last.high, low: last.low, close: last.close, volume: safe[safe.length - 1]?.volume });
    requestAnimationFrame(() => requestAnimationFrame(() => onReadyRef.current?.()));
  }, [bars, ha, fitContentKey]);

  /* ----- volume ----- */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const safe = Array.isArray(bars) ? bars : [];
    const has = showVol && safe.some((b) => Number(b.volume) > 0);
    if (has && !volRef.current) {
      volRef.current = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '', lastValueVisible: false, priceLineVisible: false });
      volRef.current.priceScale().applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
    } else if (!has && volRef.current) { chart.removeSeries(volRef.current); volRef.current = null; }
    if (volRef.current) {
      volRef.current.setData(safe.map((b) => ({ time: b.time, value: Number(b.volume) || 0, color: Number(b.close) >= Number(b.open) ? 'rgba(53,196,161,.32)' : 'rgba(255,92,92,.32)' })));
    }
    chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.08, bottom: has ? 0.2 : 0.08 } });
  }, [bars, showVol]);

  /* ----- indicators (always computed on raw bars) ----- */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const safe = Array.isArray(bars) ? bars : [];
    for (const ind of INDICATORS) {
      const active = isActive(ind) && safe.length > 1;
      let group = indRef.current[ind.id];
      if (active && !group) {
        group = {};
        for (const ln of ind.lines) {
          const opts = {
            color: ln.color, lineWidth: ln.width || 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
            lineStyle: ln.dash ? LineStyle.Dashed : LineStyle.Solid,
          };
          if (ind.id === 'rsi') opts.autoscaleInfoProvider = () => ({ priceRange: { minValue: 0, maxValue: 100 } });
          group[ln.k] = chart.addSeries(LineSeries, opts, ind.pane || 0);
        }
        if (ind.id === 'rsi') {
          const s = group.v;
          [30, 70].forEach((price) => s.createPriceLine({ price, color: 'rgba(255,255,255,.18)', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' }));
          try { chart.panes()[1]?.setHeight(120); } catch { /* older build */ }
        }
        indRef.current[ind.id] = group;
      } else if (!active && group) {
        Object.values(group).forEach((s) => { try { chart.removeSeries(s); } catch { /* gone */ } });
        delete indRef.current[ind.id]; delete indLastRef.current[ind.id];
        continue;
      }
      if (active) {
        const res = ind.calc(safe);
        const last = {};
        for (const ln of ind.lines) {
          const arr = res[ln.k] || [];
          group[ln.k].setData(arr);
          if (arr.length) last[ln.k] = arr[arr.length - 1].value;
        }
        indLastRef.current[ind.id] = last;
      }
    }
    setIndVals({ ...indLastRef.current });
  }, [bars, isActive]);

  /* ----- scale mode, markers, trades, focus ----- */
  useEffect(() => { chartRef.current?.priceScale('right').applyOptions({ mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal }); }, [logScale]);
  useEffect(() => { try { markersPluginRef.current?.setMarkers(Array.isArray(markers) && bars?.length ? markers : []); } catch { /* */ } }, [markers, bars]);
  useEffect(() => {
    const candle = candleRef.current, chart = chartRef.current;
    if (!candle || !chart) return undefined;
    const prim = new TradeBoxesPrimitive(trades, candle, chart);
    candle.attachPrimitive(prim);
    return () => { try { candleRef.current?.detachPrimitive(prim); } catch { /* */ } };
  }, [trades]);
  useEffect(() => {
    if (typeof focusTime !== 'number' || !chartRef.current) return;
    requestAnimationFrame(() => { try { chartRef.current.timeScale().setVisibleRange({ from: focusTime - 21600, to: focusTime + 21600 }); } catch { /* */ } });
  }, [focusTime]);

  /* ----- infinite scroll to older history ----- */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !hasMoreOlder || !onRequestOlder) return undefined;
    let busy = false;
    const h = (r) => {
      if (!r || busy || r.from >= 10) return;
      busy = true; Promise.resolve(onRequestOlder()).finally(() => { busy = false; });
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(h);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(h);
  }, [hasMoreOlder, onRequestOlder]);

  /* ----- tool shortcuts + menu dismiss ----- */
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (e.metaKey || e.ctrlKey || e.altKey || t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return;
      if (e.key === 'h' || e.key === 'H') setTool((v) => (v === 'hline' ? 'cursor' : 'hline'));
      else if (e.key === 'm' || e.key === 'M') setTool((v) => (v === 'measure' ? 'cursor' : 'measure'));
      else if (e.key === 'i' || e.key === 'I') setMenuOpen((v) => !v);
      else if (e.key === 'Escape') { setTool('cursor'); setMenuOpen(false); }
    };
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    window.addEventListener('keydown', onKey); window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, []);
  useEffect(() => { if (tool !== 'measure') resetMeasure(); }, [tool]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearLines = useCallback(() => { linesRef.current = []; setLines([]); writeJson(linesKey(symbol || ''), []); }, [symbol]);
  const toggleInd = (id) => setEnabled((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const screenshot = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      const src = chart.takeScreenshot();
      const out = document.createElement('canvas');
      out.width = src.width; out.height = src.height;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#0A0D13'; ctx.fillRect(0, 0, out.width, out.height); ctx.drawImage(src, 0, 0);
      out.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${symbol}-${interval}.png`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    } catch { /* unsupported */ }
  }, [symbol, interval]);

  const empty = !bars || bars.length === 0;
  const m = measure && measure.a && measure.b ? (() => {
    const d = measure.b.price - measure.a.price;
    const secs = typeof measure.a.time === 'number' && typeof measure.b.time === 'number' ? Math.abs(measure.b.time - measure.a.time) : 0;
    return { d, pct: measure.a.price ? (d / measure.a.price) * 100 : 0, n: Math.abs(Math.round((measure.b.logical ?? 0) - (measure.a.logical ?? 0))), secs };
  })() : null;

  const activeInds = INDICATORS.filter(isActive);
  const groups = [...new Set(INDICATORS.map((i) => i.group))];

  return (
    <>
      <style>{CSS}</style>
      <div className="cl-root">
        <div ref={containerRef} className={`cl-canvas${tool !== 'cursor' ? ' is-tool' : ''}`} />

        {!empty && (
          <div className="cl-top">
            <OhlcLegend ohlc={ohlc} interval={interval} ha={ha} />
            {activeInds.length > 0 && (
              <div className="cl-inds">
                {activeInds.map((ind) => {
                  const v = indVals[ind.id]?.[ind.primary];
                  return (
                    <span key={ind.id} className="cl-ind">
                      <i className="cl-swatch" style={{ background: ind.lines[0].color }} />{ind.label}
                      {v != null && <b>{fmtPrice(v)}</b>}
                      <button type="button" onClick={() => toggleInd(ind.id)} aria-label={`Remove ${ind.label}`}><X size={10} /></button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!empty && (
          <>
            <div className="cl-tools" role="toolbar" aria-label="Chart tools">
              <button type="button" className={`cl-tool${tool === 'cursor' ? ' is-on' : ''}`} onClick={() => setTool('cursor')} title="Cursor (Esc)" aria-label="Cursor"><MousePointer2 size={15} /></button>
              <button type="button" className={`cl-tool${tool === 'hline' ? ' is-on' : ''}`} onClick={() => setTool('hline')} title="Horizontal line (H)" aria-label="Horizontal line"><Minus size={15} /></button>
              <button type="button" className={`cl-tool${tool === 'measure' ? ' is-on' : ''}`} onClick={() => setTool('measure')} title="Measure (M)" aria-label="Measure"><Ruler size={15} /></button>
              <div className="cl-sep" />
              <button type="button" className="cl-tool" onClick={clearLines} disabled={lines.length === 0} title={`Remove all lines (${lines.length})`} aria-label="Remove all lines"><Trash2 size={15} /></button>
              <button type="button" className="cl-tool" onClick={screenshot} title="Save as image" aria-label="Save as image"><Camera size={15} /></button>
            </div>

            <div className="cl-bar">
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button type="button" className={`cl-pill${activeInds.length ? ' is-on' : ''}`} onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-haspopup="menu" title="Indicators (I)">
                  <Activity size={12} /> Indicators{activeInds.length ? ` · ${activeInds.length}` : ''}
                </button>
                {menuOpen && (
                  <div className="cl-menu" role="menu">
                    {groups.map((g) => (
                      <div key={g}>
                        <div className="cl-menu-head">{g}</div>
                        {INDICATORS.filter((i) => i.group === g).map((ind) => {
                          const off = ind.intradayOnly && interval === '1d';
                          return (
                            <button key={ind.id} type="button" role="menuitemcheckbox" aria-checked={enabled.includes(ind.id)} className="cl-menu-item" disabled={off} onClick={() => toggleInd(ind.id)} title={off ? 'Intraday timeframes only' : undefined}>
                              <i className="cl-swatch" style={{ background: ind.lines[0].color }} />{ind.label}
                              {enabled.includes(ind.id) && !off && <Check size={12} className="cl-check" />}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" className={`cl-pill${ha ? ' is-on' : ''}`} onClick={() => setHa((v) => !v)} aria-pressed={ha} title="Heikin Ashi candles"><CandleIcon size={12} /> Heikin Ashi</button>
              <button type="button" className={`cl-pill${showVol ? ' is-on' : ''}`} onClick={() => setShowVol((v) => !v)} aria-pressed={showVol}><BarChart3 size={12} /> Volume</button>
              <button type="button" className={`cl-pill${logScale ? ' is-on' : ''}`} onClick={() => setLogScale((v) => !v)} aria-pressed={logScale} title="Logarithmic scale">Log</button>
            </div>
          </>
        )}

        {tool === 'hline' && <div className="cl-hint">Click a price level to place a line. Esc cancels.</div>}
        {tool === 'measure' && !m && <div className="cl-hint">Click a start point, move, then click to finish.</div>}
        {m && (
          <div className={`cl-measure ${m.d >= 0 ? 'is-up' : 'is-down'}`}>
            <span>{m.d >= 0 ? '+' : ''}{fmtPrice(m.d)}</span>
            <span>{m.pct >= 0 ? '+' : ''}{m.pct.toFixed(2)}%</span>
            <span>{m.n} bars</span>
            {m.secs > 0 && <span>{fmtDur(m.secs)}</span>}
          </div>
        )}

        {!empty && !atEdge && (
          <button type="button" className="cl-scroll-btn" onClick={() => chartRef.current?.timeScale().scrollToRealTime()} title="Go to current price" aria-label="Go to current price">
            <ArrowRightToLine size={16} />
          </button>
        )}
        {empty && (
          <div className="cl-empty-overlay">
            <EmptyState
              size="lg" icon={BarChart3} eyebrow="Coming Soon"
              title={`No chart data for ${symbol || 'this symbol'}`}
              description={`${interval ? interval.toUpperCase() + ' history' : 'History'} hasn't been imported yet. An admin can load it from Admin → Market Data.`}
            />
          </div>
        )}
      </div>
    </>
  );
}