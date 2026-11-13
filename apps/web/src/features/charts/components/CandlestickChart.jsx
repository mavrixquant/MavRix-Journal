import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ArrowRightToLine, BarChart3, Minus, Plus, Trash2, X } from 'lucide-react';
import {
  createChart, createSeriesMarkers,
  CandlestickSeries, BarSeries, LineSeries, AreaSeries, HistogramSeries,
  CrosshairMode, ColorType, LineStyle, PriceScaleMode,
} from 'lightweight-charts';

import EmptyState from '@/shared/components/EmptyState';
import { chartTheme, alpha } from '../lib/chartTheme';
import { INDICATORS, heikinAshi } from '../lib/indicators';
import {
  DrawingsPrimitive, TradesPrimitive, TOOL_BY_ID, TOOL_HINTS, DRAW_COLORS, buildIndex, newId,
} from '../lib/drawings';

const num = (v) => Number(v);
const fmtPrice = (n, d = 2) => (n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: Math.max(d, 4) }));
const fmtVol = (n) => (n == null || !Number(n) ? null : Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(Number(n)));

function addMainSeries(chart, type, precision) {
  const priceFormat = { type: 'price', precision, minMove: 1 / 10 ** precision };
  const common = { priceFormat, priceLineVisible: true, lastValueVisible: true };
  const accent = chartTheme.accent;
  switch (type) {
    case 'line':
      return chart.addSeries(LineSeries, { ...common, color: accent, lineWidth: 2 });
    case 'area':
      return chart.addSeries(AreaSeries, {
        ...common, lineColor: accent, lineWidth: 2,
        topColor: alpha(accent, 0.32), bottomColor: alpha(accent, 0.02),
      });
    case 'bars':
      return chart.addSeries(BarSeries, { ...common, upColor: chartTheme.up, downColor: chartTheme.down, thinBars: false });
    case 'hollow':
      return chart.addSeries(CandlestickSeries, {
        ...common, upColor: 'rgba(0,0,0,0)', downColor: chartTheme.down, borderVisible: true,
        borderUpColor: chartTheme.up, borderDownColor: chartTheme.down,
        wickUpColor: chartTheme.upWick, wickDownColor: chartTheme.downWick,
      });
    default:
      return chart.addSeries(CandlestickSeries, {
        ...common, upColor: chartTheme.up, downColor: chartTheme.down, borderVisible: false,
        wickUpColor: chartTheme.upWick, wickDownColor: chartTheme.downWick,
      });
  }
}

function OhlcLegend({ ohlc, interval, chartType, symbol, precision }) {
  if (!ohlc) return null;
  const o = Number(ohlc.open), c = Number(ohlc.close);
  const up = c >= o;
  const cls = up ? 'is-up' : 'is-down';
  const chg = c - o;
  const pct = o ? (chg / o) * 100 : 0;
  const vol = fmtVol(ohlc.volume);
  return (
    <div className="mk-ohlc" aria-hidden>
      <span className="mk-ohlc-sym">{symbol}</span>
      {interval && <span className="mk-ohlc-tf">{interval.toUpperCase()}{chartType === 'ha' ? ' · HA' : ''}</span>}
      {['open', 'high', 'low', 'close'].map((k) => (
        <span key={k} className="mk-ohlc-item"><em>{k[0].toUpperCase()}</em><b className={cls}>{fmtPrice(ohlc[k], precision)}</b></span>
      ))}
      <span className={`mk-ohlc-chg ${cls}`}>{chg >= 0 ? '+' : ''}{fmtPrice(chg, precision)} ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)</span>
      {vol && <span className="mk-ohlc-item"><em>Vol</em><b>{vol}</b></span>}
    </div>
  );
}

const CandlestickChart = forwardRef(function CandlestickChart({
  bars, interval, symbol, precision = 2,
  chartType = 'candles', enabledIndicators = [], onToggleIndicator,
  showVolume = true, logScale = false, magnet = false,
  tool = 'cursor', onToolChange,
  drawings = [], onDrawingsChange, selectedId = null, onSelect, drawColor = '#F5B544',
  markers = [], trades = [], showTrades = true, showTradeLabels = false,
  focus = null, fitKey = null, fitMode = 'recent',
  hasMoreOlder = false, onRequestOlder, displayOffset = 0, onAtEdgeChange,
  loading = false,
}, ref) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const mainRef = useRef(null);
  const volRef = useRef(null);
  const markersRef = useRef(null);
  const indRef = useRef({});
  const indLastRef = useRef({});
  const structRef = useRef('');
  const ohlcRef = useRef([]);
  const indexRef = useRef({ length: 0 });
  const draftRef = useRef(null);
  const dragRef = useRef(null);
  const firstTimeRef = useRef(null);
  const lastFitKeyRef = useRef(undefined);
  const lastLegendTimeRef = useRef(null);

  const propsRef = useRef({});
  propsRef.current = {
    tool, magnet, drawings, selectedId, drawColor, displayOffset, precision, trades, showTrades, showTradeLabels,
    onToolChange, onDrawingsChange, onSelect, onAtEdgeChange, interval,
  };

  const drawPrimRef = useRef(null);
  if (drawPrimRef.current === null) {
    drawPrimRef.current = new DrawingsPrimitive(() => ({
      index: indexRef.current,
      offset: propsRef.current.displayOffset,
      // While dragging, preview the moved points without touching app state.
      drawings: dragRef.current
        ? propsRef.current.drawings.map((d) => (d.id === dragRef.current.id ? { ...d, pts: dragRef.current.pts } : d))
        : propsRef.current.drawings,
      draft: draftRef.current,
      selectedId: propsRef.current.selectedId,
      precision: propsRef.current.precision,
    }));
  }
  const tradePrimRef = useRef(null);
  if (tradePrimRef.current === null) {
    tradePrimRef.current = new TradesPrimitive(() => ({
      trades: propsRef.current.trades,
      show: propsRef.current.showTrades,
      labels: propsRef.current.showTradeLabels,
    }));
  }

  const [ohlc, setOhlc] = useState(null);
  const [indVals, setIndVals] = useState({});
  const [atEdge, setAtEdge] = useState(true);

  const lastLegend = () => {
    const d = ohlcRef.current;
    const l = d[d.length - 1];
    return l ? { open: l.open, high: l.high, low: l.low, close: l.close, volume: bars?.[bars.length - 1]?.volume } : null;
  };

  /* ----- create chart once ----- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' }, textColor: chartTheme.text,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, attributionLogo: false,
        panes: { separatorColor: chartTheme.border, separatorHoverColor: 'rgba(255,255,255,.12)' },
      },
      grid: { vertLines: { color: chartTheme.grid }, horzLines: { color: chartTheme.grid } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: chartTheme.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: chartTheme.accent },
        horzLine: { color: chartTheme.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: chartTheme.accent },
      },
      rightPriceScale: { borderColor: chartTheme.border, scaleMargins: { top: 0.08, bottom: 0.2 } },
      timeScale: { borderColor: chartTheme.border, timeVisible: true, secondsVisible: false, rightOffset: 8, barSpacing: 8, minBarSpacing: 0.4 },
      handleScroll: true, handleScale: true, autoSize: true,
    });
    chartRef.current = chart;

    const resolvePoint = (pt) => {
      const s = mainRef.current;
      const idx = indexRef.current;
      if (!s || !idx.length) return null;
      let logical = chart.timeScale().coordinateToLogical(pt.x);
      if (logical == null) return null;
      let price = s.coordinateToPrice(pt.y);
      if (price == null) return null;
      if (propsRef.current.magnet) {
        const data = ohlcRef.current;
        const i = Math.round(logical);
        if (i >= 0 && i < data.length) {
          logical = i;
          const b = data[i];
          let best = null, bd = 18;
          for (const v of [b.open, b.high, b.low, b.close]) {
            const y = s.priceToCoordinate(v);
            if (y != null && Math.abs(y - pt.y) < bd) { bd = Math.abs(y - pt.y); best = v; }
          }
          if (best != null) price = best;
        }
      }
      return { t: Math.round(idx.toSec(logical) - propsRef.current.displayOffset), p: price };
    };

    const paneSize = () => {
      try { const s = chart.paneSize(0); if (s?.width) return s; } catch { /* older build */ }
      return { width: Math.max(0, (el.clientWidth || 0) - 70), height: el.clientHeight || 0 };
    };

    const onMove = (p) => {
      const main = mainRef.current;
      if (!p.time || !p.point || !main) {
        if (lastLegendTimeRef.current !== null) { lastLegendTimeRef.current = null; setOhlc(lastLegend()); setIndVals({ ...indLastRef.current }); }
      } else if (lastLegendTimeRef.current !== p.time) {
        lastLegendTimeRef.current = p.time;
        const d = p.seriesData.get(main);
        const raw = ohlcRef.current;
        if (d) {
          const o = d.open != null ? d : (() => { const hit = raw.find((x) => x.time === p.time); return hit || null; })();
          if (o) setOhlc({ open: o.open, high: o.high, low: o.low, close: o.close, volume: propsRef.current.volumeByTime?.get(p.time) });
        }
        const vals = {};
        for (const [id, group] of Object.entries(indRef.current)) {
          vals[id] = {};
          for (const [k, s] of Object.entries(group)) { const v = p.seriesData.get(s)?.value; if (v != null) vals[id][k] = v; }
        }
        setIndVals(vals);
      }
      const draft = draftRef.current;
      if (draft && !draft.frozen && p.point) {
        const pt = resolvePoint(p.point);
        if (pt) { draft.cursor = pt; drawPrimRef.current.redraw(); }
      }
    };

    const onClick = (p) => {
      if (!p.point) return;
      const { tool: tl, drawings: list, drawColor: color } = propsRef.current;
      if (tl === 'cursor') {
        const id = drawPrimRef.current.hit(p.point.x, p.point.y, paneSize());
        propsRef.current.onSelect?.(id);
        return;
      }
      const pt = resolvePoint(p.point);
      if (!pt) return;
      if (tl === 'measure') {
        const dr = draftRef.current;
        if (!dr || dr.frozen) draftRef.current = { id: 'draft', type: 'measure', pts: [pt], cursor: pt, frozen: false };
        else draftRef.current = { id: 'draft', type: 'measure', pts: [dr.pts[0], pt], cursor: null, frozen: true };
        drawPrimRef.current.redraw();
        return;
      }
      const need = TOOL_BY_ID[tl]?.pts || 0;
      if (!need) return;
      const dr = draftRef.current && draftRef.current.type === tl ? draftRef.current : { id: 'draft', type: tl, pts: [], color };
      const pts = [...dr.pts, pt];
      if (pts.length >= need) {
        const d = { id: newId(), type: tl, color, pts };
        draftRef.current = null;
        propsRef.current.onDrawingsChange?.([...list, d]);
        propsRef.current.onSelect?.(d.id);
        propsRef.current.onToolChange?.('cursor');
        drawPrimRef.current.redraw();
      } else {
        draftRef.current = { ...dr, color, pts, cursor: pt };
        drawPrimRef.current.redraw();
      }
    };

    const onRange = (r) => {
      if (!r) return;
      const edge = r.to >= ohlcRef.current.length - 5;
      setAtEdge((prev) => (prev === edge ? prev : edge));
    };

    /* ----- dragging drawings (move whole drawing, or drag an anchor handle) ----- */
    const local = (e) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const inPane = (p) => { const s = paneSize(); return p.x >= 0 && p.y >= 0 && p.x <= s.width && p.y <= s.height; };
    const setCur = (c) => { if (c) el.dataset.cur = c; else delete el.dataset.cur; };

    const onDragMove = (e) => {
      const dr = dragRef.current;
      if (!dr) return;
      const p = local(e);
      if (!dr.moved && Math.hypot(p.x - dr.startX, p.y - dr.startY) < 3) return;
      dr.moved = true;
      const s = mainRef.current;
      if (!s) return;
      if (dr.mode === 'anchor') {
        const pt = resolvePoint(p);
        if (!pt) return;
        dr.pts = dr.orig.map((q, i) => (i === dr.index ? pt : { t: q.t, p: q.p }));
      } else {
        const logical = chart.timeScale().coordinateToLogical(p.x);
        const price = s.coordinateToPrice(p.y);
        if (logical == null || price == null || dr.logical0 == null || dr.price0 == null) return;
        const dL = logical - dr.logical0, dP = price - dr.price0;
        const off = propsRef.current.displayOffset;
        dr.pts = dr.orig.map((q) => ({ t: Math.round(indexRef.current.toSec(q.idx + dL) - off), p: q.p + dP }));
      }
      drawPrimRef.current.redraw();
    };

    const onDragEnd = () => {
      const dr = dragRef.current;
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onDragEnd);
      window.removeEventListener('pointercancel', onDragEnd);
      chart.applyOptions({ handleScroll: true, handleScale: true });
      setCur('');
      if (dr?.moved) {
        const { drawings: list, onDrawingsChange } = propsRef.current;
        onDrawingsChange?.(list.map((v) => (v.id === dr.id ? { ...v, pts: dr.pts } : v)));
      }
      // Keep the preview until React has committed the new points, then drop it.
      requestAnimationFrame(() => { dragRef.current = null; drawPrimRef.current.redraw(); });
    };

    const onDown = (e) => {
      if (e.button !== 0 || propsRef.current.tool !== 'cursor' || dragRef.current) return;
      const p = local(e);
      if (!inPane(p)) return;
      const size = paneSize();
      const prim = drawPrimRef.current;
      let id = null, mode = 'move', index = 0;
      const hh = prim.hitHandle(p.x, p.y, size);
      if (hh) { id = hh.id; mode = 'anchor'; index = hh.index; } else id = prim.hit(p.x, p.y, size);
      if (!id) return;
      const d = propsRef.current.drawings.find((v) => v.id === id);
      const s = mainRef.current;
      if (!d || !s) return;
      e.preventDefault();
      e.stopPropagation();
      propsRef.current.onSelect?.(id);
      const off = propsRef.current.displayOffset;
      dragRef.current = {
        id, mode, index, startX: p.x, startY: p.y, moved: false,
        logical0: chart.timeScale().coordinateToLogical(p.x), price0: s.coordinateToPrice(p.y),
        orig: d.pts.map((q) => ({ idx: indexRef.current.toIdx(q.t + off), t: q.t, p: q.p })),
        pts: d.pts,
      };
      chart.applyOptions({ handleScroll: false, handleScale: false });
      setCur('grabbing');
      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', onDragEnd);
      window.addEventListener('pointercancel', onDragEnd);
    };

    const onHover = (e) => {
      if (dragRef.current) return;
      if (propsRef.current.tool !== 'cursor') { setCur(''); return; }
      const p = local(e);
      if (!inPane(p)) { setCur(''); return; }
      const size = paneSize();
      const prim = drawPrimRef.current;
      setCur(prim.hitHandle(p.x, p.y, size) ? 'grab' : prim.hit(p.x, p.y, size) ? 'move' : '');
    };
    // Legacy mouse/touch events fired after a handled pointerdown must not reach the chart.
    const swallow = (e) => { if (dragRef.current) e.stopPropagation(); };

    el.addEventListener('pointerdown', onDown, true);
    el.addEventListener('mousedown', swallow, true);
    el.addEventListener('touchstart', swallow, true);
    el.addEventListener('pointermove', onHover);

    chart.subscribeCrosshairMove(onMove);
    chart.subscribeClick(onClick);
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);

    return () => {
      el.removeEventListener('pointerdown', onDown, true);
      el.removeEventListener('mousedown', swallow, true);
      el.removeEventListener('touchstart', swallow, true);
      el.removeEventListener('pointermove', onHover);
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onDragEnd);
      window.removeEventListener('pointercancel', onDragEnd);
      dragRef.current = null;
      try {
        chart.unsubscribeCrosshairMove(onMove); chart.unsubscribeClick(onClick);
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
        chart.remove();
      } catch { /* already gone */ }
      chartRef.current = mainRef.current = volRef.current = markersRef.current = null;
      indRef.current = {}; indLastRef.current = {}; structRef.current = ''; draftRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- main series (recreated when the chart type or precision changes) ----- */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return undefined;
    const s = addMainSeries(chart, chartType, precision);
    mainRef.current = s;
    let plugin = null;
    try { plugin = createSeriesMarkers(s, []); } catch { /* optional */ }
    markersRef.current = plugin;
    s.attachPrimitive(tradePrimRef.current);
    s.attachPrimitive(drawPrimRef.current);
    return () => {
      try { plugin?.detach?.(); } catch { /* */ }
      try { s.detachPrimitive(drawPrimRef.current); s.detachPrimitive(tradePrimRef.current); } catch { /* */ }
      try { chart.removeSeries(s); } catch { /* chart already removed */ }
      if (mainRef.current === s) mainRef.current = null;
      markersRef.current = null;
    };
  }, [chartType, precision]);

  useEffect(() => { chartRef.current?.timeScale().applyOptions({ timeVisible: interval !== '1d' }); }, [interval]);

  /* ----- candles / line data, fit, keep view when older history is prepended ----- */
  useEffect(() => {
    const s = mainRef.current, chart = chartRef.current;
    if (!s || !chart) return;
    const safe = Array.isArray(bars) ? bars : [];
    const base = safe.map((b) => ({ time: b.time, open: num(b.open), high: num(b.high), low: num(b.low), close: num(b.close) }));
    const ohlcData = chartType === 'ha' ? heikinAshi(safe) : base;
    ohlcRef.current = ohlcData;
    indexRef.current = buildIndex(safe, interval);
    propsRef.current.volumeByTime = new Map(safe.map((b) => [b.time, b.volume]));
    const data = chartType === 'line' || chartType === 'area' ? ohlcData.map((d) => ({ time: d.time, value: d.close })) : ohlcData;

    const ts = chart.timeScale();
    const prevRange = ts.getVisibleLogicalRange();
    const prevFirst = firstTimeRef.current;
    s.setData(data);

    if (data.length === 0) { firstTimeRef.current = null; setOhlc(null); drawPrimRef.current.redraw(); return; }

    if (prevRange && prevFirst != null && data[0].time !== prevFirst) {
      const shift = data.findIndex((d) => d.time === prevFirst);
      if (shift > 0) ts.setVisibleLogicalRange({ from: prevRange.from + shift, to: prevRange.to + shift });
    }
    firstTimeRef.current = data[0].time;

    if (fitKey !== null && fitKey !== lastFitKeyRef.current) {
      lastFitKeyRef.current = fitKey;
      if (fitMode === 'recent' && data.length > 150) ts.setVisibleLogicalRange({ from: data.length - 150, to: data.length + 10 });
      else ts.fitContent();
    }
    const last = ohlcData[ohlcData.length - 1];
    setOhlc({ open: last.open, high: last.high, low: last.low, close: last.close, volume: safe[safe.length - 1]?.volume });
    drawPrimRef.current.redraw();
  }, [bars, chartType, precision, fitKey, fitMode, interval]);

  /* ----- volume ----- */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const safe = Array.isArray(bars) ? bars : [];
    const has = showVolume && safe.some((b) => Number(b.volume) > 0);
    if (has && !volRef.current) {
      volRef.current = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '', lastValueVisible: false, priceLineVisible: false });
      volRef.current.priceScale().applyOptions({ scaleMargins: { top: 0.86, bottom: 0 } });
    } else if (!has && volRef.current) {
      try { chart.removeSeries(volRef.current); } catch { /* */ }
      volRef.current = null;
    }
    if (volRef.current) {
      volRef.current.setData(safe.map((b) => ({ time: b.time, value: Number(b.volume) || 0, color: Number(b.close) >= Number(b.open) ? chartTheme.volumeUp : chartTheme.volumeDown })));
    }
    chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.08, bottom: has ? 0.2 : 0.08 } });
  }, [bars, showVolume]);

  /* ----- indicators (always computed on raw bars) ----- */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const safe = Array.isArray(bars) ? bars : [];
    const active = INDICATORS.filter((i) => enabledIndicators.includes(i.id) && !(i.intradayOnly && interval === '1d'));
    const key = `${precision}|${active.map((i) => i.id).join(',')}`;

    if (structRef.current !== key) {
      for (const group of Object.values(indRef.current)) {
        Object.values(group).forEach((s) => { try { chart.removeSeries(s); } catch { /* */ } });
      }
      indRef.current = {}; indLastRef.current = {};
      let pane = 0;
      for (const ind of active) {
        const paneIdx = ind.overlay ? 0 : ++pane;
        const prec = ind.overlay ? precision : ind.id === 'rsi' ? 2 : Math.min(6, precision + 1);
        const priceFormat = { type: 'price', precision: prec, minMove: 1 / 10 ** prec };
        const group = {};
        for (const ln of ind.lines) {
          if (ln.type === 'hist') {
            group[ln.k] = chart.addSeries(HistogramSeries, { priceFormat, priceLineVisible: false, lastValueVisible: false }, paneIdx);
          } else {
            const opts = {
              color: ln.color, lineWidth: ln.width || 2, priceFormat, priceLineVisible: false,
              lastValueVisible: !ind.overlay, crosshairMarkerVisible: false,
              lineStyle: ln.dash ? LineStyle.Dashed : LineStyle.Solid,
            };
            if (ind.range) opts.autoscaleInfoProvider = () => ({ priceRange: { minValue: ind.range[0], maxValue: ind.range[1] } });
            group[ln.k] = chart.addSeries(LineSeries, opts, paneIdx);
          }
        }
        if (ind.levels) {
          ind.levels.forEach((price) => group[ind.primary].createPriceLine({ price, color: 'rgba(255,255,255,.18)', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' }));
        }
        indRef.current[ind.id] = group;
      }
      structRef.current = key;
      requestAnimationFrame(() => {
        try {
          const panes = chart.panes();
          active.filter((i) => !i.overlay).forEach((ind, j) => panes[j + 1]?.setHeight(ind.height || 110));
        } catch { /* older build */ }
      });
    }

    for (const ind of active) {
      const group = indRef.current[ind.id];
      if (!group) continue;
      const res = safe.length > 1 ? ind.calc(safe) : {};
      const last = {};
      for (const ln of ind.lines) {
        const arr = res[ln.k] || [];
        group[ln.k].setData(arr);
        if (arr.length) last[ln.k] = arr[arr.length - 1].value;
      }
      indLastRef.current[ind.id] = last;
    }
    setIndVals({ ...indLastRef.current });
  }, [bars, enabledIndicators, interval, precision]);

  /* ----- scale mode, markers, redraw triggers, focus ----- */
  useEffect(() => { chartRef.current?.priceScale('right').applyOptions({ mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal }); }, [logScale]);
  useEffect(() => {
    try { markersRef.current?.setMarkers(showTrades && Array.isArray(markers) && bars?.length ? markers : []); } catch { /* */ }
  }, [markers, showTrades, bars, chartType, precision]);
  useEffect(() => { drawPrimRef.current.redraw(); }, [drawings, selectedId, displayOffset, chartType, precision]);
  useEffect(() => { tradePrimRef.current.redraw(); }, [trades, showTrades, showTradeLabels, chartType, precision]);
  useEffect(() => { draftRef.current = null; drawPrimRef.current.redraw(); }, [tool]);
  useEffect(() => { draftRef.current = null; }, [symbol]);

  useEffect(() => {
    if (!focus || typeof focus.time !== 'number' || !chartRef.current) return;
    requestAnimationFrame(() => {
      try {
        const i = indexRef.current.toIdx(focus.time);
        chartRef.current.timeScale().setVisibleLogicalRange({ from: i - 45, to: i + 70 });
      } catch { /* */ }
    });
  }, [focus]);

  /* ----- infinite scroll to older history ----- */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !hasMoreOlder || !onRequestOlder) return undefined;
    let busy = false;
    const h = (r) => {
      if (!r || busy || r.from >= 10) return;
      busy = true;
      Promise.resolve(onRequestOlder()).finally(() => { busy = false; });
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(h);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(h);
  }, [hasMoreOlder, onRequestOlder]);

  useEffect(() => { onAtEdgeChange?.(atEdge); }, [atEdge, onAtEdgeChange]);

  /* ----- imperative API ----- */
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

  const zoomBy = useCallback((factor) => {
    const ts = chartRef.current?.timeScale();
    if (!ts) return;
    ts.applyOptions({ barSpacing: Math.min(60, Math.max(0.4, ts.options().barSpacing * factor)) });
  }, []);

  useImperativeHandle(ref, () => ({
    screenshot,
    fit: () => chartRef.current?.timeScale().fitContent(),
    toRealtime: () => chartRef.current?.timeScale().scrollToRealTime(),
    resetScale: () => chartRef.current?.priceScale('right').applyOptions({ autoScale: true }),
    zoom: zoomBy,
  }), [screenshot, zoomBy]);

  const empty = !bars || bars.length === 0;
  const showEmptyState = empty && !loading;
  const selected = drawings.find((d) => d.id === selectedId) || null;
  const activeInds = INDICATORS.filter((i) => enabledIndicators.includes(i.id) && !(i.intradayOnly && interval === '1d'));
  const hint = TOOL_HINTS[tool];

  const recolor = (color) => onDrawingsChange?.(drawings.map((d) => (d.id === selectedId ? { ...d, color } : d)));
  const removeSelected = () => { onDrawingsChange?.(drawings.filter((d) => d.id !== selectedId)); onSelect?.(null); };

  return (
    <div className="mk-cv">
      <div ref={containerRef} className={`mk-cv-canvas${tool !== 'cursor' ? ' is-tool' : ''}`} />

      {!empty && (
        <div className="mk-cv-top">
          <OhlcLegend ohlc={ohlc} interval={interval} chartType={chartType} symbol={symbol} precision={precision} />
          {activeInds.length > 0 && (
            <div className="mk-inds">
              {activeInds.map((ind) => {
                const v = indVals[ind.id]?.[ind.primary];
                return (
                  <span key={ind.id} className="mk-ind">
                    <i className="mk-dot" style={{ background: ind.lines.find((l) => l.k === ind.primary)?.color || ind.lines[0].color }} />{ind.label}
                    {v != null && <b>{fmtPrice(v, ind.overlay ? precision : 2)}</b>}
                    <button type="button" onClick={() => onToggleIndicator?.(ind.id)} aria-label={`Remove ${ind.label}`}><X size={10} /></button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {hint && <div className="mk-cv-hint">{hint} <span>Esc to cancel</span></div>}

      {selected && tool === 'cursor' && (
        <div className="mk-sel" role="toolbar" aria-label="Selected drawing">
          {DRAW_COLORS.map((c) => (
            <button key={c} type="button" className={`mk-swatch${selected.color === c ? ' is-on' : ''}`} style={{ background: c }} onClick={() => recolor(c)} aria-label={`Color ${c}`} />
          ))}
          <span className="mk-sel-sep" />
          <button type="button" className="mk-sel-del" onClick={removeSelected} aria-label="Delete drawing" title="Delete (Del)"><Trash2 size={13} /></button>
        </div>
      )}

      {!empty && (
        <div className="mk-zoom" role="group" aria-label="Zoom">
          <button type="button" onClick={() => zoomBy(0.8)} aria-label="Zoom out" title="Zoom out"><Minus size={13} /></button>
          <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in" title="Zoom in"><Plus size={13} /></button>
          <button type="button" className="txt" onClick={() => { chartRef.current?.timeScale().fitContent(); }} title="Fit all loaded data">Fit</button>
          <button type="button" className="txt" onClick={() => chartRef.current?.priceScale('right').applyOptions({ autoScale: true })} title="Reset price scale">Auto</button>
          {!atEdge && <button type="button" className="go" onClick={() => chartRef.current?.timeScale().scrollToRealTime()} title="Go to current price" aria-label="Go to current price"><ArrowRightToLine size={14} /></button>}
        </div>
      )}

      {showEmptyState && (
        <div className="mk-cv-empty">
          <EmptyState
            size="lg" icon={BarChart3} eyebrow="Coming Soon"
            title={`No chart data for ${symbol || 'this symbol'}`}
            description={`${interval ? interval.toUpperCase() + ' history' : 'History'} hasn't been imported yet. An admin can load it from Admin → Market Data.`}
          />
        </div>
      )}
    </div>
  );
});

export default CandlestickChart;
