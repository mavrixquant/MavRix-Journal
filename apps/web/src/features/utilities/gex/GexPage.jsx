import { useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Layers,
  Clipboard,
  ClipboardCheck,
  CalendarDays,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Search,
  Copy,
  Activity,
  ArrowUpToLine,
  ArrowDownToLine,
  MoveVertical,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';

import { useGexDays, useGexDay, useGexPrefetch } from '@/shared/api/gex';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import EmptyState from '@/shared/components/EmptyState';
import GexLevelChart from './components/GexLevelChart';
import {
  GEX_SYMBOLS,
  GEX_SYMBOL_META,
  DEFAULT_GEX_SYMBOL,
  GEX_TRADINGVIEW_URL,
} from '@mavrix/shared';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLong(iso) {
  if (!iso) return '';
  return parseIso(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function dateParts(iso) {
  const d = parseIso(iso);
  return {
    wd: d.toLocaleDateString('en-US', { weekday: 'short' }),
    day: d.getDate(),
    mon: d.toLocaleDateString('en-US', { month: 'short' }),
    yr: d.getFullYear(),
  };
}

/** TYPE|PRICE|LABEL;TYPE|PRICE|LABEL; ... -> level objects */
function parseConverted(str) {
  if (!str) return [];
  return str
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, i) => {
      const [type = '', price = '', ...rest] = s.split('|');
      return {
        id: i,
        type: type.trim().toUpperCase(),
        priceRaw: price.trim(),
        price: parseFloat(price),
        label: rest.join('|').trim(),
      };
    })
    .filter((l) => !Number.isNaN(l.price));
}

function classify(type) {
  if (type === 'BL') return 'bl';
  if (type.includes('GEX')) return 'gex';
  return 'other';
}

const KIND_META = {
  bl: { label: 'BL', color: 'var(--accent)' },
  gex: { label: 'GEX', color: '#378ADD' },
  other: { label: 'Other', color: '#8892A3' },
};

const fmt = (n) =>
  Number.isFinite(n)
    ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : '—';


/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const CSS = `
  .gxp-root {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --panel: linear-gradient(180deg, rgba(15,18,26,.74), rgba(15,18,26,.55));
    --mono: 'IBM Plex Mono', ui-monospace, monospace;

    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .gxp-root *, .gxp-root *::before, .gxp-root *::after { box-sizing: border-box; }

  .gxp-panel {
    border-radius: 14px;
    background: var(--panel);
    border: 1px solid var(--line);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }

  /* ============ COMMAND BAR ============ */
  .gxp-bar {
    display: flex;
    align-items: stretch;
    gap: 10px;
    flex-wrap: wrap;
  }
  .gxp-symbar {
    flex: 1 1 420px;
    display: flex;
    gap: 8px;
    padding: 6px;
    border-radius: 14px;
    background: rgba(0,0,0,.32);
    border: 1px solid var(--line-soft);
  }
  .gxp-sym {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 16px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink-2);
    font-family: var(--mono);
    cursor: pointer;
    text-align: left;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
  }
  .gxp-sym:hover:not(.is-active) { color: var(--ink-1); background: rgba(255,255,255,.04); }
  .gxp-sym.is-active {
    background: color-mix(in srgb, var(--sym-color) 12%, transparent);
    border-color: color-mix(in srgb, var(--sym-color) 45%, transparent);
    color: #fff;
    box-shadow: 0 0 26px -10px color-mix(in srgb, var(--sym-color) 60%, transparent);
  }
  .gxp-sym-dot {
    width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0;
    background: var(--sym-color);
    box-shadow: 0 0 10px var(--sym-color);
  }
  .gxp-sym-code { font-weight: 700; font-size: 14px; letter-spacing: .04em; }
  .gxp-sym-name { font-size: 11px; font-weight: 500; color: var(--ink-3); }
  .gxp-sym.is-active .gxp-sym-name { color: rgba(255,255,255,.6); }

  .gxp-nav {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px;
    border-radius: 14px;
    background: rgba(0,0,0,.32);
    border: 1px solid var(--line-soft);
  }
  .gxp-nav-btn {
    width: 38px; height: 100%; min-height: 38px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 9px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
    transition: all .16s;
  }
  .gxp-nav-btn:hover:not(:disabled) {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border-color: var(--accent-soft2);
  }
  .gxp-nav-btn:disabled { opacity: .3; cursor: default; }
  .gxp-nav-pos {
    padding: 0 10px;
    min-width: 76px;
    text-align: center;
    font-family: var(--mono);
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--ink-3);
    line-height: 1.5;
  }
  .gxp-nav-pos b { color: var(--ink-1); font-weight: 700; }

  .gxp-tv-link {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 0 18px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: var(--mono);
    font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
    text-decoration: none; white-space: nowrap;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
  }
  .gxp-tv-link:hover {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    box-shadow: 0 0 24px -10px color-mix(in srgb, var(--accent) 50%, transparent);
    transform: translateY(-1px);
  }
  .gxp-tv-link:focus-visible {
    outline: none; border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
  }

  /* ============ DATE STRIP ============ */
  .gxp-strip {
    display: flex;
    gap: 8px;
    padding: 10px;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,.1) transparent;
  }
  .gxp-strip::-webkit-scrollbar { height: 6px; }
  .gxp-strip::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 99px; }
  .gxp-chip {
    position: relative;
    flex: 0 0 auto;
    scroll-snap-align: center;
    width: 112px;
    padding: 10px 12px 11px;
    border-radius: 11px;
    border: 1px solid var(--line-soft);
    background: rgba(255,255,255,.02);
    color: var(--ink-2);
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    display: flex; flex-direction: column; gap: 3px;
    transition: all .16s cubic-bezier(.2,.8,.25,1);
  }
  .gxp-chip:hover { color: var(--ink-1); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.1); }
  .gxp-chip.is-active {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent) 4%, transparent));
    box-shadow: 0 0 22px -10px color-mix(in srgb, var(--accent) 55%, transparent), inset 0 1px 0 rgba(255,255,255,.05);
  }
  .gxp-chip.is-active::after {
    content: ''; position: absolute; left: 12px; right: 12px; bottom: -1px; height: 2px;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 70%, transparent);
  }
  .gxp-chip-wd {
    font-family: var(--mono); font-size: 9.5px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3);
  }
  .gxp-chip.is-active .gxp-chip-wd { color: color-mix(in srgb, var(--accent) 70%, transparent); }
  .gxp-chip-date {
    font-family: var(--mono); font-size: 15px; font-weight: 700; letter-spacing: -.01em; color: var(--ink-1);
  }
  .gxp-chip.is-active .gxp-chip-date { color: var(--accent); }
  .gxp-chip-date small { font-size: 10.5px; font-weight: 600; color: var(--ink-3); margin-left: 4px; }
  .gxp-chip-meta {
    display: flex; align-items: center; gap: 6px;
    font-family: var(--mono); font-size: 9.5px; font-weight: 600; color: var(--ink-3);
  }
  .gxp-chip-bl { color: var(--accent); }
  .gxp-chip-gex { color: #378ADD; }

  /* ============ STATS ============ */
  .gxp-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
  .gxp-stat {
    position: relative;
    padding: 14px 16px 15px;
    display: flex; flex-direction: column; gap: 8px;
    overflow: hidden;
  }
  .gxp-stat::before {
    content: ''; position: absolute; inset: 0 auto 0 0; width: 3px;
    background: var(--stat-color, var(--accent));
    box-shadow: 0 0 14px var(--stat-color, var(--accent));
    opacity: .85;
  }
  .gxp-stat-top {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--mono); font-size: 10px; font-weight: 700;
    letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3);
  }
  .gxp-stat-top svg { color: var(--stat-color, var(--accent)); }
  .gxp-stat-val {
    font-family: var(--mono); font-size: 22px; font-weight: 700;
    letter-spacing: -.02em; color: var(--ink-1); line-height: 1.1;
  }
  .gxp-stat-sub { font-family: var(--mono); font-size: 10.5px; color: var(--ink-3); font-weight: 600; }
  .gxp-mix {
    display: flex; height: 6px; border-radius: 99px; overflow: hidden;
    background: rgba(255,255,255,.05); gap: 2px;
  }
  .gxp-mix > span { display: block; height: 100%; }

  /* ============ MAIN GRID ============ */
  .gxp-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: 16px;
    align-items: start;
  }
  .gxp-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  .gxp-head {
    padding: 14px 18px 12px;
    border-bottom: 1px solid var(--line-soft);
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .gxp-title { font-size: 13px; font-weight: 700; letter-spacing: -.005em; color: var(--ink-1); }
  .gxp-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 2px 9px; border-radius: 99px; border: 1px solid;
    font-family: var(--mono); font-size: 10px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
  }
  .gxp-head-sub {
    margin-left: auto;
    font-family: var(--mono); font-size: 10px; font-weight: 600;
    letter-spacing: .05em; text-transform: uppercase; color: var(--accent); opacity: .9;
  }
  .gxp-body { padding: 12px 14px 16px; }

  /* ---- Ladder (right column) ---- */
  .gxp-ladder { position: sticky; top: 16px; display: flex; flex-direction: column; max-height: calc(100vh - 32px); }
  .gxp-filters {
    padding: 10px 12px;
    display: flex; flex-direction: column; gap: 10px;
    border-bottom: 1px solid var(--line-soft);
  }
  .gxp-search {
    display: flex; align-items: center; gap: 8px;
    padding: 0 10px; height: 34px;
    border-radius: 9px; border: 1px solid var(--line);
    background: rgba(0,0,0,.28); color: var(--ink-3);
    transition: border-color .16s, box-shadow .16s;
  }
  .gxp-search:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--accent);
  }
  .gxp-search input {
    flex: 1; min-width: 0; background: transparent; border: 0; outline: 0;
    color: var(--ink-1); font-family: var(--mono); font-size: 12px;
  }
  .gxp-search input::placeholder { color: var(--ink-3); }
  .gxp-seg { display: flex; gap: 6px; flex-wrap: wrap; }
  .gxp-seg-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 10px; border-radius: 99px;
    border: 1px solid var(--line); background: transparent;
    color: var(--ink-2); cursor: pointer;
    font-family: var(--mono); font-size: 10px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
    transition: all .16s;
  }
  .gxp-seg-btn:hover { color: var(--ink-1); background: rgba(255,255,255,.04); }
  .gxp-seg-btn.is-active {
    color: var(--k, var(--accent));
    border-color: color-mix(in srgb, var(--k, var(--accent)) 50%, transparent);
    background: color-mix(in srgb, var(--k, var(--accent)) 12%, transparent);
  }
  .gxp-seg-btn i { font-style: normal; opacity: .65; }

  .gxp-rows {
    flex: 1 1 auto; min-height: 0; overflow-y: auto;
    padding: 6px; display: flex; flex-direction: column; gap: 2px;
    max-height: 560px;
  }
  .gxp-rows::-webkit-scrollbar { width: 6px; }
  .gxp-rows::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 99px; }
  .gxp-row {
    position: relative;
    display: grid; grid-template-columns: 8px 1fr auto 28px; align-items: center; gap: 10px;
    padding: 8px 8px 8px 10px; border-radius: 8px;
    border: 1px solid transparent;
    transition: background .14s, border-color .14s;
  }
  .gxp-row:hover { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.06); }
  .gxp-row-dot { width: 8px; height: 8px; border-radius: 2px; background: var(--k); box-shadow: 0 0 8px var(--k); }
  .gxp-row-price { font-family: var(--mono); font-size: 13px; font-weight: 700; color: var(--ink-1); letter-spacing: -.01em; }
  .gxp-row-label {
    font-family: var(--mono); font-size: 10.5px; font-weight: 600; color: var(--ink-3);
    max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right;
  }
  .gxp-row-type {
    display: block; font-size: 9px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; color: var(--k); margin-top: 1px;
  }
  .gxp-row-copy {
    width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center;
    border-radius: 7px; border: 1px solid transparent; background: transparent;
    color: var(--ink-3); cursor: pointer; opacity: 0; transition: all .14s;
  }
  .gxp-row:hover .gxp-row-copy, .gxp-row-copy:focus-visible { opacity: 1; }
  .gxp-row-copy:hover { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); border-color: var(--accent-soft2); }
  .gxp-none { padding: 28px 12px; text-align: center; font-family: var(--mono); font-size: 11.5px; color: var(--ink-3); }

  /* ---- String card ---- */
  .gxp-str-actions { margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; }
  .gxp-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 10px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03);
    color: var(--ink-2); cursor: pointer;
    font-family: var(--mono); font-size: 10px; font-weight: 600;
    letter-spacing: .04em; text-transform: uppercase;
    transition: all .18s;
  }
  .gxp-btn:hover { color: var(--accent); border-color: var(--accent-soft2); background: color-mix(in srgb, var(--accent) 7%, transparent); }
  .gxp-btn.is-copied { color: #4ade80; border-color: rgba(34,197,94,.35); background: rgba(34,197,94,.06); }
  .gxp-btn.is-primary {
    color: #0B0E14; font-weight: 700;
    background: linear-gradient(180deg, var(--accent), var(--accent-2));
    border-color: transparent;
    box-shadow: 0 6px 20px -8px color-mix(in srgb, var(--accent) 70%, transparent);
  }
  .gxp-btn.is-primary:hover { color: #0B0E14; filter: brightness(1.08); }
  .gxp-btn.is-primary.is-copied { color: #052e16; background: #4ade80; box-shadow: none; }

  .gxp-code {
    margin: 0; padding: 12px 14px; max-height: 150px; overflow-y: auto;
    border-radius: 10px; border: 1px solid var(--line-soft); background: rgba(10,13,19,.6);
    font-family: var(--mono); font-size: 11.5px; line-height: 1.7; color: var(--ink-1);
    white-space: pre-wrap; word-break: break-all;
  }
  .gxp-code-hint {
    margin-top: 10px; display: flex; align-items: center; gap: 8px;
    font-family: var(--mono); font-size: 10.5px; color: var(--ink-3);
  }
  .gxp-code-hint code { color: var(--ink-2); background: rgba(255,255,255,.05); padding: 1px 6px; border-radius: 5px; }

  .gxp-loading {
    padding: 70px 24px; text-align: center; color: var(--ink-2);
    font-family: var(--mono); font-size: 12.5px;
  }
  .gxp-kbd {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 4px; border-radius: 5px;
    border: 1px solid var(--line); background: rgba(255,255,255,.04);
    font-family: var(--mono); font-size: 10px; color: var(--ink-2);
  }

  /* ============ RESPONSIVE ============ */
  @media (max-width: 1180px) {
    .gxp-grid { grid-template-columns: 1fr; }
    .gxp-ladder { position: static; max-height: none; }
    .gxp-rows { max-height: 380px; }
  }
  @media (max-width: 820px) {
    .gxp-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .gxp-sym-name { display: none; }
  }
  @media (max-width: 560px) {
    .gxp-tv-link span { display: none; }
    .gxp-tv-link { padding: 0 14px; min-height: 44px; }
    .gxp-nav { flex: 1; justify-content: space-between; }
    .gxp-stat-val { font-size: 18px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .gxp-root * { transition: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function GexPage() {
  const [symbol, setSymbol] = useState(DEFAULT_GEX_SYMBOL);
  const [selectedDate, setSelectedDate] = useState(null);
  const [copied, setCopied] = useState(null); // 'all' | 'filtered' | null
  const [kind, setKind] = useState('all');
  const [query, setQuery] = useState('');
  const activeChipRef = useRef(null);

  // Deep-link from the notification sidebar:
  //   /utilities/gex?symbol=ES&date=2026-12-10
  // useLayoutEffect runs BEFORE the auto-select effect so the URL-supplied
  // date is committed before days is evaluated on first paint.
  const [searchParams] = useSearchParams();
  useLayoutEffect(() => {
    const s = searchParams.get('symbol');
    const d = searchParams.get('date');
    if (s && GEX_SYMBOLS.includes(s)) setSymbol(s);
    if (d) setSelectedDate(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warm NQ + ES so switching symbols is instant.
  useGexPrefetch();

  const { data: days = [], isLoading: daysLoading } = useGexDays(symbol);
  const { data: day, isLoading: dayLoading } = useGexDay(selectedDate, symbol);

  const meta = useMemo(
    () => GEX_SYMBOL_META[symbol] || GEX_SYMBOL_META.NQ,
    [symbol]
  );


  // Keep a valid selected date (auto-pick newest).
  useEffect(() => {
    if (days.length === 0) {
      if (selectedDate !== null) setSelectedDate(null);
      return;
    }
    const stillValid = selectedDate && days.some((d) => d.date === selectedDate);
    if (!stillValid) setSelectedDate(days[0].date);
  }, [days, selectedDate]);

  // Scroll the active date chip into view.
  useEffect(() => {
    activeChipRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [selectedDate, symbol]);

  const handleSymbolChange = useCallback(
    (next) => {
      if (next === symbol) return;
      setSymbol(next);
      setSelectedDate(null);
      setCopied(null);
      setKind('all');
      setQuery('');
    },
    [symbol]
  );

  /* ---- day navigation (days are newest-first) ---- */
  const idx = days.findIndex((d) => d.date === selectedDate);
  const hasNewer = idx > 0;
  const hasOlder = idx >= 0 && idx < days.length - 1;
  const goNewer = useCallback(() => hasNewer && setSelectedDate(days[idx - 1].date), [hasNewer, days, idx]);
  const goOlder = useCallback(() => hasOlder && setSelectedDate(days[idx + 1].date), [hasOlder, days, idx]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft') goNewer();
      if (e.key === 'ArrowRight') goOlder();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goOlder, goNewer]);

  /* ---- parsed levels ---- */
  const levels = useMemo(
    () => parseConverted(day?.converted).map((l) => ({ ...l, kind: classify(l.type) })),
    [day]
  );

  const counts = useMemo(() => {
    const c = { all: levels.length, bl: 0, gex: 0, other: 0 };
    levels.forEach((l) => { c[l.kind] += 1; });
    return c;
  }, [levels]);

  const stats = useMemo(() => {
    if (levels.length === 0) return null;
    const prices = levels.map((l) => l.price);
    const hi = Math.max(...prices);
    const lo = Math.min(...prices);
    return { hi, lo, span: hi - lo };
  }, [levels]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return levels
      .filter((l) => kind === 'all' || l.kind === kind)
      .filter(
        (l) =>
          !q ||
          l.priceRaw.toLowerCase().includes(q) ||
          l.label.toLowerCase().includes(q) ||
          l.type.toLowerCase().includes(q)
      )
      .sort((a, b) => b.price - a.price);
  }, [levels, kind, query]);

  const isFiltered = kind !== 'all' || query.trim() !== '';

  /* ---- copy ---- */
  const flash = useCallback((key) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }, []);

  const copyText = useCallback(async (text, key, msg) => {
    try {
      await navigator.clipboard.writeText(text);
      if (key) flash(key);
      toast.success(msg);
    } catch {
      toast.error('Copy failed');
    }
  }, [flash]);

  const handleCopyAll = useCallback(() => {
    if (!day?.converted) return;
    copyText(day.converted, 'all', 'TradingView string copied');
  }, [day, copyText]);

  const handleCopyFiltered = useCallback(() => {
    if (filtered.length === 0) return;
    const str = filtered.map((l) => `${l.type}|${l.priceRaw}|${l.label}`).join(';') + ';';
    copyText(str, 'filtered', `${filtered.length} levels copied`);
  }, [filtered, copyText]);

  const totalLevels = useMemo(
    () => days.reduce((sum, d) => sum + d.levelCount, 0),
    [days]
  );

  usePageHeader({
    title: 'GEX Levels',
    subtitle:
      days.length === 0
        ? `No ${symbol} GEX data uploaded yet`
        : `${days.length} ${days.length === 1 ? 'day' : 'days'} · ${totalLevels} levels · ${meta.fullName}`,
  });

  if (daysLoading) return <PageSkeleton />;

  const symPill = {
    color: meta.color,
    borderColor: `${meta.color}55`,
    background: `${meta.color}15`,
  };

  const total = Math.max(counts.all, 1);

  return (
    <>
      <style>{CSS}</style>
      <div className="gxp-root page-fade-in">
        {/* ============ COMMAND BAR ============ */}
        <div className="gxp-bar">
          <div className="gxp-symbar" role="tablist" aria-label="Select symbol">
            {GEX_SYMBOLS.map((sym) => {
              const m = GEX_SYMBOL_META[sym];
              const active = symbol === sym;
              return (
                <button
                  key={sym}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`gxp-sym${active ? ' is-active' : ''}`}
                  style={{ '--sym-color': m.color }}
                  onClick={() => handleSymbolChange(sym)}
                >
                  <span className="gxp-sym-dot" aria-hidden />
                  <span className="gxp-sym-code">{m.label}</span>
                  <span className="gxp-sym-name">{m.fullName}</span>
                </button>
              );
            })}
          </div>

          {days.length > 0 && (
            <div className="gxp-nav" aria-label="Day navigation">
              <button
                type="button"
                className="gxp-nav-btn"
                onClick={goNewer}
                disabled={!hasNewer}
                aria-label="Newer day"
                title="Newer day (←)"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="gxp-nav-pos">
                <b>{idx >= 0 ? idx + 1 : '–'}</b> / {days.length}
                <br />
                {idx === 0 ? 'Latest' : 'Archive'}
              </div>
              <button
                type="button"
                className="gxp-nav-btn"
                onClick={goOlder}
                disabled={!hasOlder}
                aria-label="Older day"
                title="Older day (→)"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <a
            href={GEX_TRADINGVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="gxp-tv-link"
            title="Open the MavRix GEX indicator on TradingView in a new tab"
            aria-label="Open MavRix GEX indicator on TradingView"
          >
            <ExternalLink size={13} />
            <span>TradingView</span>
          </a>
        </div>

        {/* ============ EMPTY ============ */}
        {days.length === 0 && (
          <EmptyState
            size="lg"
            icon={CalendarDays}
            eyebrow={`No ${symbol} data`}
            title={`No ${meta.fullName} GEX levels available`}
            description={`Daily ${symbol} gamma-exposure levels will appear here once an admin uploads them. Try switching to the other symbol, or check back later.`}
          />
        )}

        {days.length > 0 && (
          <>
            {/* ============ DATE STRIP ============ */}
            <div className="gxp-panel">
              <div className="gxp-strip" role="listbox" aria-label="Uploaded days">
                {days.map((d) => {
                  const active = d.date === selectedDate;
                  const p = dateParts(d.date);
                  return (
                    <button
                      key={`${d.symbol}:${d.date}`}
                      ref={active ? activeChipRef : null}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`gxp-chip${active ? ' is-active' : ''}`}
                      onClick={() => setSelectedDate(d.date)}
                    >
                      <span className="gxp-chip-wd">{p.wd}</span>
                      <span className="gxp-chip-date">
                        {p.mon} {p.day}
                        <small>{String(p.yr).slice(2)}</small>
                      </span>
                      <span className="gxp-chip-meta">
                        <span className="gxp-chip-bl">{d.blCount} BL</span>
                        <span>·</span>
                        <span className="gxp-chip-gex">{d.gexCount} GEX</span>
                      </span>

                    </button>
                  );
                })}
              </div>
            </div>

            {dayLoading || !day ? (
              <div className="gxp-panel gxp-loading">Loading {symbol} day…</div>
            ) : (
              <>
                {/* ============ STATS ============ */}
                <div className="gxp-stats">
                  <div className="gxp-panel gxp-stat" style={{ '--stat-color': meta.color }}>
                    <div className="gxp-stat-top"><Activity size={13} /> Levels</div>
                    <div className="gxp-stat-val">{day.levelCount}</div>
                    <div className="gxp-mix" aria-hidden>
                      <span style={{ width: `${(counts.bl / total) * 100}%`, background: 'var(--accent)' }} />
                      <span style={{ width: `${(counts.gex / total) * 100}%`, background: '#378ADD' }} />
                      <span style={{ width: `${(counts.other / total) * 100}%`, background: '#8892A3' }} />
                    </div>
                    <div className="gxp-stat-sub">
                      {day.blCount} BL · {day.gexCount} GEX{day.otherCount > 0 ? ` · ${day.otherCount} other` : ''}
                    </div>
                  </div>

                  <div className="gxp-panel gxp-stat" style={{ '--stat-color': '#4ade80' }}>
                    <div className="gxp-stat-top"><ArrowUpToLine size={13} /> Highest</div>
                    <div className="gxp-stat-val">{stats ? fmt(stats.hi) : '—'}</div>
                    <div className="gxp-stat-sub">Top of the ladder</div>
                  </div>

                  <div className="gxp-panel gxp-stat" style={{ '--stat-color': '#f87171' }}>
                    <div className="gxp-stat-top"><ArrowDownToLine size={13} /> Lowest</div>
                    <div className="gxp-stat-val">{stats ? fmt(stats.lo) : '—'}</div>
                    <div className="gxp-stat-sub">Bottom of the ladder</div>
                  </div>

                  <div className="gxp-panel gxp-stat" style={{ '--stat-color': '#378ADD' }}>
                    <div className="gxp-stat-top"><MoveVertical size={13} /> Range</div>
                    <div className="gxp-stat-val">{stats ? fmt(stats.span) : '—'}</div>
                    <div className="gxp-stat-sub">points, high to low</div>
                  </div>
                </div>

                {/* ============ MAIN GRID ============ */}
                <div className="gxp-grid">
                  <div className="gxp-col">
                    
                    {/* TradingView string */}
                    <section className="gxp-panel">
                      <div className="gxp-head">
                        <Terminal size={14} style={{ color: 'var(--accent)' }} />
                        <span className="gxp-title">TradingView String</span>
                        <div className="gxp-str-actions">
                          {isFiltered && filtered.length > 0 && (
                            <button
                              type="button"
                              className={`gxp-btn${copied === 'filtered' ? ' is-copied' : ''}`}
                              onClick={handleCopyFiltered}
                            >
                              {copied === 'filtered'
                                ? <><ClipboardCheck size={11} /> Copied</>
                                : <><Copy size={11} /> Copy filtered ({filtered.length})</>}
                            </button>
                          )}
                          <button
                            type="button"
                            className={`gxp-btn is-primary${copied === 'all' ? ' is-copied' : ''}`}
                            onClick={handleCopyAll}
                          >
                            {copied === 'all'
                              ? <><ClipboardCheck size={11} /> Copied</>
                              : <><Clipboard size={11} /> Copy all</>}
                          </button>
                        </div>
                      </div>
                      <div className="gxp-body">
                        <pre className="gxp-code">{day.converted}</pre>
                        <div className="gxp-code-hint">
                          <code>TYPE|PRICE|LABEL;</code>
                          <span>Paste into the indicator's input in TradingView.</span>
                        </div>
                      </div>
                    </section>

                    {/* Chart */}
                    <section className="gxp-panel">
                      <div className="gxp-head">
                        <Layers size={14} style={{ color: 'var(--accent)' }} />
                        <span className="gxp-title">{formatDateLong(day.date)}</span>
                        <span className="gxp-pill" style={symPill}>{meta.label}</span>
                        <span className="gxp-head-sub">
                          {day.levelCount} {day.levelCount === 1 ? 'level' : 'levels'}
                        </span>
                      </div>
                      <div className="gxp-body">
                        <GexLevelChart levels={day.levels} />
                      </div>
                    </section>


                  </div>

                  {/* Level ladder */}
                  <aside className="gxp-panel gxp-ladder">
                    <div className="gxp-head">
                      <span className="gxp-title">Level Ladder</span>
                      <span className="gxp-pill" style={symPill}>{meta.label}</span>
                      <span className="gxp-head-sub">
                        {filtered.length}/{levels.length}
                      </span>
                    </div>

                    <div className="gxp-filters">
                      <label className="gxp-search">
                        <Search size={13} />
                        <input
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search price or label…"
                          aria-label="Search levels"
                        />
                      </label>
                      <div className="gxp-seg" role="group" aria-label="Filter by type">
                        {[
                          ['all', 'All', 'var(--accent)'],
                          ['bl', 'BL', KIND_META.bl.color],
                          ['gex', 'GEX', KIND_META.gex.color],
                          ...(counts.other > 0 ? [['other', 'Other', KIND_META.other.color]] : []),
                        ].map(([key, label, color]) => (
                          <button
                            key={key}
                            type="button"
                            className={`gxp-seg-btn${kind === key ? ' is-active' : ''}`}
                            style={{ '--k': color }}
                            onClick={() => setKind(key)}
                          >
                            {label} <i>{counts[key]}</i>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="gxp-rows">
                      {filtered.length === 0 ? (
                        <div className="gxp-none">No levels match.</div>
                      ) : (
                        filtered.map((l) => (
                          <div
                            key={l.id}
                            className="gxp-row"
                            style={{ '--k': KIND_META[l.kind].color }}
                          >
                            <span className="gxp-row-dot" aria-hidden />
                            <span>
                              <span className="gxp-row-price">{fmt(l.price)}</span>
                              <span className="gxp-row-type">{l.type || KIND_META[l.kind].label}</span>
                            </span>
                            <span className="gxp-row-label" title={l.label}>{l.label}</span>
                            <button
                              type="button"
                              className="gxp-row-copy"
                              aria-label={`Copy ${l.priceRaw}`}
                              title="Copy price"
                              onClick={() => copyText(l.priceRaw, null, `Copied ${l.priceRaw}`)}
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </aside>
                </div>

                <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
                  <span className="gxp-kbd">←</span> <span className="gxp-kbd">→</span> switch days
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}