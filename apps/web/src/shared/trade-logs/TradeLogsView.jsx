import { useState, useMemo, useCallback, useEffect, useId } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaFileUpload,
  FaFolderOpen,
  FaPlus,
  FaDownload,
  FaColumns,
  FaEdit,
  FaTrash,
  FaChartLine,
} from 'react-icons/fa';
import { toast } from 'sonner';

import { useAccounts } from '@/shared/api/accounts';
import { useTrades, useDeleteTrade } from '@/shared/api/trades';
import { useStrategies } from '@/shared/api/strategies';
import { enrichTradesFromDB } from '@/shared/trading/enrich';
import { tradeTimeToUtcSeconds } from '@/shared/trading/tradeTime';
import { resolveTimezone } from '@/shared/format/datetime';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import UploadModal from './UploadModal';
import AddTradeModal from './AddTradeModal';
import ColumnManagerModal from './ColumnManagerModal';
import { downloadTradeTemplate } from './downloadTemplate';
import DataTable from '@/shared/ui/data-table';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import Alert from '@/shared/components/Alert';
import EmptyState from '@/shared/components/EmptyState';
import './tradeLogsModals.css';

/* ────────────────────────────────────────────────────────────────
   Styles
   ──────────────────────────────────────────────────────────────── */
const CSS = `
  .jm-root {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --win: #35C4A1;
    --loss: #FF5C5C;
    --glass: linear-gradient(180deg, rgba(17,21,29,.78), rgba(13,16,23,.62));

    width: 100%;
    max-width: 1680px;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    font-variant-numeric: tabular-nums;
  }
  .jm-root * { box-sizing: border-box; }
  .jm-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }

  /* ── Command bar ───────────────────────────────── */
  .jm-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }
  .jm-acct {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 8px 16px 8px 8px;
    border-radius: 14px;
    background: var(--glass);
    border: 1px solid var(--line);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
  }
  .jm-acct-icon {
    width: 38px; height: 38px;
    border-radius: 10px;
    display: grid; place-items: center;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border: 1px solid var(--accent-soft2);
    flex-shrink: 0;
  }
  .jm-acct-meta { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .jm-acct-name {
    font-size: 13.5px; font-weight: 700; letter-spacing: -.01em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;
  }
  .jm-acct-sub {
    display: flex; align-items: center; gap: 8px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: var(--ink-3); letter-spacing: .04em; text-transform: uppercase;
  }
  .jm-badge {
    padding: 1px 8px; border-radius: 99px; border: 1px solid;
    font-size: 9.5px; font-weight: 700; letter-spacing: .1em;
  }
  .jm-badge.is-live { color: #4DD6B3; background: rgba(77,214,179,.10); border-color: rgba(77,214,179,.35); }
  .jm-badge.is-demo { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); border-color: var(--accent-soft2); }
  .jm-badge.is-backtest { color: #60a5fa; background: rgba(96,165,250,.10); border-color: rgba(96,165,250,.32); }

  .jm-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .jm-btn {
    display: inline-flex; align-items: center; gap: 7px;
    height: 40px; padding: 0 14px;
    border-radius: 11px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer; white-space: nowrap;
    transition: all .2s cubic-bezier(.2,.8,.25,1);
  }
  .jm-btn:hover { color: var(--accent); background: color-mix(in srgb, var(--accent) 7%, transparent); border-color: var(--accent-soft2); transform: translateY(-1px); }
  .jm-btn:focus-visible, .jm-btn-primary:focus-visible, .jm-seg button:focus-visible {
    outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 26%, transparent);
  }
  .jm-btn-primary {
    position: relative; overflow: hidden;
    display: inline-flex; align-items: center; gap: 8px;
    height: 40px; padding: 0 20px;
    border-radius: 11px; border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 700; letter-spacing: .02em;
    cursor: pointer; white-space: nowrap;
    box-shadow: 0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent), inset 0 1px 0 rgba(255,255,255,.4);
    transition: transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s;
  }
  .jm-btn-primary::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,.3) 50%, transparent 68%);
    animation: jmShine 4.6s ease-in-out infinite;
  }
  .jm-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 42px -10px color-mix(in srgb, var(--accent) 70%, transparent), inset 0 1px 0 rgba(255,255,255,.5); }
  .jm-btn-primary:active { transform: translateY(0) scale(.98); }

  /* ── Hero stats ───────────────────────────────── */
  .jm-hero {
    position: relative;
    display: grid;
    grid-template-columns: minmax(300px, 1.5fr) auto minmax(320px, 1.1fr);
    gap: 0;
    border-radius: 20px;
    background: var(--glass);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow: 0 24px 60px -34px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
  }
  .jm-hero::before {
    content: ''; position: absolute; inset: 0 0 auto 0; height: 2px; pointer-events: none;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), transparent);
    opacity: .7;
  }
  .jm-hero-cell { padding: 22px 26px; min-width: 0; }
  .jm-hero-cell + .jm-hero-cell { border-left: 1px solid var(--line-soft); }

  .jm-eyebrow {
    display: block;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
    color: var(--ink-3);
  }
  .jm-pnl {
    display: block; margin: 8px 0 4px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: clamp(28px, 3.2vw, 42px); font-weight: 700; letter-spacing: -.03em; line-height: 1.05;
  }
  .jm-pnl.pos { color: var(--win); text-shadow: 0 0 40px rgba(53,196,161,.25); }
  .jm-pnl.neg { color: var(--loss); text-shadow: 0 0 40px rgba(255,92,92,.25); }
  .jm-pnl.zero { color: var(--ink-1); }
  .jm-pnl-sub {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; color: var(--ink-2);
  }
  .jm-delta { padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; }
  .jm-delta.pos { color: #4DD6B3; background: rgba(53,196,161,.10); }
  .jm-delta.neg { color: #FF7676; background: rgba(255,92,92,.10); }
  .jm-spark { display: block; width: 100%; height: 88px; margin-top: 14px; overflow: visible; }
  .jm-spark-empty {
    height: 88px; margin-top: 14px; border-radius: 10px;
    display: grid; place-items: center;
    border: 1px dashed rgba(255,255,255,.1);
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; color: var(--ink-3);
  }

  .jm-ring-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
  .jm-ring { position: relative; width: 132px; height: 132px; }
  .jm-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .jm-ring-center {
    position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .jm-ring-val { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 24px; font-weight: 700; letter-spacing: -.02em; }
  .jm-ring-lab { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 9px; font-weight: 700; letter-spacing: .16em; color: var(--ink-3); margin-top: 2px; }
  .jm-wl { display: flex; gap: 14px; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11.5px; font-weight: 700; }
  .jm-wl span { display: inline-flex; align-items: center; gap: 6px; }
  .jm-wl i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

  .jm-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; align-content: center; }
  .jm-stat {
    padding: 12px 14px; border-radius: 12px;
    background: rgba(255,255,255,.022); border: 1px solid var(--line-soft);
    transition: border-color .2s, background-color .2s;
  }
  .jm-stat:hover { border-color: rgba(255,255,255,.12); background: rgba(255,255,255,.035); }
  .jm-stat-val {
    display: block; margin-top: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 15px; font-weight: 700; letter-spacing: -.01em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .jm-stat-val.pos { color: var(--win); }
  .jm-stat-val.neg { color: var(--loss); }

  /* ── Table card ───────────────────────────────── */
  .jm-card {
    border-radius: 20px;
    background: var(--glass);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow: 0 24px 60px -34px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
  }
  .jm-card-head {
    display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    padding: 16px 20px; border-bottom: 1px solid var(--line-soft);
  }
  .jm-card-title { display: flex; align-items: baseline; gap: 10px; }
  .jm-card-title h3 { margin: 0; font-size: 14px; font-weight: 700; letter-spacing: -.01em; }
  .jm-card-count { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; color: var(--ink-3); }
  .jm-filters { display: flex; gap: 10px; flex-wrap: wrap; }
  .jm-seg {
    display: inline-flex; gap: 2px; padding: 3px;
    border-radius: 10px; background: rgba(0,0,0,.34); border: 1px solid rgba(255,255,255,.06);
  }
  .jm-seg button {
    padding: 6px 12px; border-radius: 7px; border: none; background: transparent;
    color: var(--ink-2); cursor: pointer; white-space: nowrap;
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; font-weight: 600; letter-spacing: .02em;
    transition: all .18s;
  }
  .jm-seg button:hover:not(.on) { color: var(--ink-1); background: rgba(255,255,255,.05); }
  .jm-seg button.on {
    color: #0D1117; font-weight: 700;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    box-shadow: 0 6px 16px -8px color-mix(in srgb, var(--accent) 60%, transparent);
  }
  .jm-body { padding: 4px 20px 20px; }

  /* ── Row actions ──────────────────────────────── */
  .jm-row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
  .jm-row-btn {
    width: 28px; height: 28px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 8px; border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025); color: var(--ink-2);
    cursor: pointer; flex-shrink: 0; transition: all .18s cubic-bezier(.2,.8,.25,1);
  }
  .jm-row-btn:hover { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); border-color: var(--accent-soft2); transform: translateY(-1px); }
  .jm-row-btn:active { transform: scale(.94); }
  .jm-row-btn.is-danger:hover { color: #FF7676; background: rgba(255,92,92,.10); border-color: rgba(255,92,92,.42); }
  .jm-row-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent); }

  .jm-dir {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 2px 9px; border-radius: 6px; font-size: 11px; font-weight: 700;
    font-family: 'IBM Plex Mono', ui-monospace, monospace; letter-spacing: .03em;
  }
  .jm-dir.long { color: #35C4A1; background: rgba(53,196,161,.10); }
  .jm-dir.short { color: #FF5C5C; background: rgba(255,92,92,.10); }

  .jm-strat-chip {
    display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 99px;
    border: 1px solid; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; font-weight: 600; max-width: 100%; overflow: hidden; white-space: nowrap;
  }
  .jm-strat-chip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .jm-strat-chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  @keyframes jmShine {
    0%,100% { transform: translateX(-130%) skewX(-18deg); }
    55% { transform: translateX(230%) skewX(-18deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .jm-btn-primary::after { animation: none !important; }
    .jm-btn, .jm-btn-primary, .jm-row-btn, .jm-stat { transition: none !important; }
  }

  /* ── Responsive ───────────────────────────────── */
  @media (max-width: 1180px) {
    .jm-hero { grid-template-columns: 1fr auto; }
    .jm-hero-cell.stats { grid-column: 1 / -1; border-left: none; border-top: 1px solid var(--line-soft); }
  }
  @media (max-width: 900px) {
    .jm-btn span { display: none; }
    .jm-btn { padding: 0; width: 40px; justify-content: center; }
  }
  @media (max-width: 720px) {
    .jm-hero { grid-template-columns: 1fr; }
    .jm-hero-cell + .jm-hero-cell { border-left: none; border-top: 1px solid var(--line-soft); }
    .jm-ring-cell { flex-direction: row; justify-content: space-around; }
    .jm-stats { grid-template-columns: repeat(2, 1fr); }
    .jm-bar { flex-direction: column; align-items: stretch; }
    .jm-actions { justify-content: flex-end; }
    .jm-acct-name { max-width: 190px; }
    .jm-card-head { padding: 14px; }
    .jm-body { padding: 4px 12px 14px; }
  }
`;

/* ────────────────────────────────────────────────────────────────
   Formatters
   ──────────────────────────────────────────────────────────────── */
function formatTimeWithAMPM(timeStr) {
  if (!timeStr) return '—';
  if (/^\d{2}:\d{2}/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  return timeStr;
}

function formatMoney(v, currency = 'USD') {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;
  }
}

function formatNum(v, decimals = 2) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(decimals);
}

/* ────────────────────────────────────────────────────────────────
   Small visual components
   ──────────────────────────────────────────────────────────────── */
function DirText({ value }) {
  if (!value) return '—';
  const isLong = value === 'Long';
  return (
    <span className={`jm-dir ${isLong ? 'long' : 'short'}`}>
      {isLong ? '▲' : '▼'} {value}
    </span>
  );
}

function StrategyCell({ strategy }) {
  if (!strategy) return <span style={{ color: 'var(--ink-3)' }}>—</span>;
  const color = strategy.color || '#8892A3';
  return (
    <span
      className="jm-strat-chip"
      style={{ color, background: `${color}18`, borderColor: `${color}44` }}
      title={strategy.name}
    >
      <span
        className="jm-strat-chip-dot"
        style={{ background: color, boxShadow: `0 0 6px ${color}aa` }}
      />
      <span className="jm-strat-chip-name">{strategy.name}</span>
    </span>
  );
}

function EquitySpark({ values }) {
  const uid = useId().replace(/:/g, '');
  if (values.length < 2) {
    return <div className="jm-spark-empty">Equity curve appears after 2 trades</div>;
  }
  const W = 360;
  const H = 88;
  const pad = 5;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const step = W / (values.length - 1);
  const y = (v) => H - pad - ((v - min) / range) * (H - pad * 2);
  const pts = values.map((v, i) => [i * step, y(v)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const up = values[values.length - 1] >= 0;
  const color = up ? '#35C4A1' : '#FF5C5C';
  const zeroY = y(0);
  const last = pts[pts.length - 1];

  return (
    <svg className="jm-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Cumulative P&L">
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,.14)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      <path d={area} fill={`url(#g${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function WinRing({ winRate, hasData }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, winRate)) / 100) * c;
  const tone = !hasData ? 'var(--ink-1)' : winRate >= 50 ? 'var(--win)' : 'var(--loss)';
  return (
    <div className="jm-ring">
      <svg viewBox="0 0 132 132" aria-hidden>
        <circle cx="66" cy="66" r={r} fill="none" stroke={hasData ? 'rgba(255,92,92,.28)' : 'rgba(255,255,255,.07)'} strokeWidth="10" />
        {hasData && (
          <circle
            cx="66" cy="66" r={r} fill="none" stroke="#35C4A1" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            style={{ filter: 'drop-shadow(0 0 8px rgba(53,196,161,.45))', transition: 'stroke-dasharray .6s cubic-bezier(.2,.8,.25,1)' }}
          />
        )}
      </svg>
      <div className="jm-ring-center">
        <span className="jm-ring-val" style={{ color: tone }}>{hasData ? `${winRate.toFixed(1)}%` : '—'}</span>
        <span className="jm-ring-lab">WIN RATE</span>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="jm-stat">
      <span className="jm-eyebrow">{label}</span>
      <span className={`jm-stat-val ${tone || ''}`} title={String(value)}>{value}</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Table columns
   ──────────────────────────────────────────────────────────────── */
function buildColumns(dynamicKeys, currency, isBacktest, { onEdit, onDelete, onViewChart }) {
  const price = (ctx) => {
    const v = ctx.getValue();
    if (v == null || v === '') return '—';
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '—';
  };

  const common = [
    { id: 'date', accessorKey: 'date', header: 'Date', meta: { label: 'Date' }, size: 110, cell: (ctx) => ctx.getValue() || '—' },
    { id: 'entry', accessorKey: 'entry', header: 'Entry', meta: { label: 'Entry' }, size: 96, cell: (ctx) => formatTimeWithAMPM(ctx.getValue()) },
    { id: 'exit', accessorKey: 'exit', header: 'Exit', meta: { label: 'Exit' }, size: 96, cell: (ctx) => formatTimeWithAMPM(ctx.getValue()) },
    { id: 'dir', accessorKey: 'dir', header: 'Dir', meta: { label: 'Direction' }, size: 90, cell: (ctx) => <DirText value={ctx.getValue()} /> },
    { id: 'symbol', accessorKey: 'symbol', header: 'Symbol', meta: { label: 'Symbol' }, size: 90, cell: (ctx) => ctx.getValue() || '—' },
    {
      id: 'strategy',
      accessorFn: (row) => row.strategy?.name || '',
      header: 'Strategy',
      meta: { label: 'Strategy' },
      size: 150,
      cell: (ctx) => <StrategyCell strategy={ctx.row.original.strategy} />,
    },
  ];

  const modeSpecific = isBacktest
    ? [
        { id: 'mae', accessorKey: 'mae', header: 'MAE', meta: { label: 'MAE' }, size: 70, cell: (ctx) => formatNum(ctx.getValue()) },
        { id: 'mfe', accessorKey: 'mfe', header: 'MFE', meta: { label: 'MFE' }, size: 70, cell: (ctx) => formatNum(ctx.getValue()) },
        { id: 'slPoints', accessorKey: 'slPoints', header: 'SL', meta: { label: 'SL (points)' }, size: 80, cell: (ctx) => formatNum(ctx.getValue()) },
      ]
    : [
        { id: 'entryPrice', accessorKey: 'entryPrice', header: 'Entry Price', meta: { label: 'Entry Price' }, size: 110, cell: price },
        { id: 'exitPrice', accessorKey: 'exitPrice', header: 'Exit Price', meta: { label: 'Exit Price' }, size: 110, cell: price },
        { id: 'takeProfit', accessorKey: 'takeProfit', header: 'Take Profit', meta: { label: 'Take Profit' }, size: 110, cell: price },
        { id: 'stopLoss', accessorKey: 'stopLoss', header: 'Stop Loss', meta: { label: 'Stop Loss' }, size: 110, cell: price },
      ];

  const common2 = [
    {
      id: 'pnl',
      accessorKey: 'pnl',
      header: 'P&L',
      meta: { label: 'P&L' },
      size: 120,
      cell: (ctx) => {
        const v = Number(ctx.getValue() ?? 0);
        return <span className={v >= 0 ? 'dt-cell-pos' : 'dt-cell-neg'}>{formatMoney(v, currency)}</span>;
      },
    },
    {
      id: 'commission',
      accessorKey: 'commission',
      header: 'Commission',
      meta: { label: 'Commission' },
      size: 110,
      cell: (ctx) => {
        const v = ctx.getValue();
        if (v == null) return <span style={{ color: 'var(--ink-3)' }}>—</span>;
        return <span style={{ color: '#8892A3' }}>{formatMoney(Number(v), currency)}</span>;
      },
    },
    {
      id: 'quantity',
      accessorKey: 'quantity',
      header: 'Qty',
      meta: { label: 'Quantity' },
      size: 70,
      cell: (ctx) => {
        const v = ctx.getValue();
        return v == null ? '—' : String(v);
      },
    },
    { id: 'notes', accessorKey: 'notes', header: 'Notes', meta: { label: 'Notes' }, size: 220, cell: (ctx) => ctx.getValue() || '—' },
  ];

  const dynamicCols = dynamicKeys.map((key) => ({
    id: key,
    accessorFn: (row) => row.dynamic?.[key] ?? '—',
    header: key,
    meta: { label: key },
    size: 130,
    cell: (ctx) => String(ctx.getValue() ?? '—'),
  }));

  const actionsCol = {
    id: '__actions',
    header: '',
    meta: { label: 'Actions' },
    size: 104,
    enableSorting: false,
    enableResizing: false,
    enableHiding: false,
    cell: (ctx) => {
      const row = ctx.row.original;
      return (
        <div className="jm-row-actions">
          {onViewChart && (
            <button type="button" className="jm-row-btn" onClick={() => onViewChart(row)} title="View on Chart" aria-label="View on Chart">
              <FaChartLine size={11} />
            </button>
          )}
          <button type="button" className="jm-row-btn" onClick={() => onEdit(row)} title="Edit" aria-label="Edit">
            <FaEdit size={11} />
          </button>
          <button type="button" className="jm-row-btn is-danger" onClick={() => onDelete(row)} title="Delete" aria-label="Delete">
            <FaTrash size={11} />
          </button>
        </div>
      );
    },
  };

  return [...common, ...modeSpecific, ...common2, ...dynamicCols, actionsCol];
}

/* ────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────── */
export default function TradeLogsView({
  accountId,
  currentR = 1,
  allowedTypes = [],
  noAccountsTitle,
  noAccountsMessage,
}) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const userTz = useMemo(
    () => resolveTimezone(settings?.preferences?.timezone || 'auto'),
    [settings?.preferences?.timezone]
  );
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const [searchParams, setSearchParams] = useSearchParams();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [addTradeOpen, setAddTradeOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [deletingTrade, setDeletingTrade] = useState(null);
  const [resultFilter, setResultFilter] = useState('all');
  const [dirFilter, setDirFilter] = useState('all');

  const deleteTrade = useDeleteTrade();

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) || null,
    [accounts, accountId]
  );
  const isBacktest = selectedAccount?.type === 'Backtest';

  const { data: rawTrades = [], isLoading: tradesLoading } = useTrades(accountId);
  const { data: strategies = [] } = useStrategies();

  const [dataTableMaxHeight, setDataTableMaxHeight] = useState(620);
  useEffect(() => {
    const updateHeight = () => {
      const w = window.innerWidth;
      setDataTableMaxHeight(w >= 2560 ? 960 : w >= 1920 ? 840 : w >= 1440 ? 720 : 620);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const { enrichedTrades, dynamicKeys } = useMemo(
    () => enrichTradesFromDB(rawTrades),
    [rawTrades]
  );

  const currency = selectedAccount?.currency || 'USD';

  useEffect(() => {
    if (accountsLoading) return;
    if (searchParams.get('addTrade') !== '1') return;
    setAddTradeOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('addTrade');
    setSearchParams(next, { replace: true });
  }, [accountsLoading, searchParams, setSearchParams]);

  const handleEdit = useCallback((row) => {
    setEditingTrade(row);
    setAddTradeOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((row) => setDeletingTrade(row), []);

  const handleDeleteConfirm = useCallback(async () => {
    const trade = deletingTrade;
    if (!trade) return;
    setDeletingTrade(null);
    try {
      await deleteTrade.mutateAsync(trade.id);
      toast.success('Trade deleted');
    } catch (err) {
      toast.error(err?.message || 'Could not delete trade');
    }
  }, [deletingTrade, deleteTrade]);

  const handleAddModalClose = useCallback(() => {
    setAddTradeOpen(false);
    setEditingTrade(null);
  }, []);

  const handleViewOnChart = useCallback((row) => {
    if (!row || !row.symbol) {
      toast.error('This trade has no symbol — cannot open chart.');
      return;
    }
    const ts = tradeTimeToUtcSeconds(row.date, row.entry, userTz);
    const params = new URLSearchParams();
    params.set('symbol', String(row.symbol).toUpperCase());
    if (ts != null) params.set('focusTs', String(ts));
    navigate(`/utilities/chart?${params.toString()}`);
  }, [navigate, userTz]);

  const columns = useMemo(
    () =>
      buildColumns(dynamicKeys, currency, isBacktest, {
        onEdit: handleEdit,
        onDelete: handleDeleteRequest,
        onViewChart: isBacktest ? null : handleViewOnChart,
      }),
    [dynamicKeys, currency, isBacktest, handleEdit, handleDeleteRequest, handleViewOnChart]
  );

  const stats = useMemo(() => {
    const s = {
      total: enrichedTrades.length, wins: 0, losses: 0, netPnl: 0,
      grossWin: 0, grossLoss: 0, best: null, worst: null, series: [],
    };
    if (!enrichedTrades.length) return { ...s, winRate: 0, avgWin: 0, avgLoss: 0, profitFactor: null };

    const ordered = [...enrichedTrades].sort((a, b) =>
      `${a.date || ''} ${a.entry || ''}`.localeCompare(`${b.date || ''} ${b.entry || ''}`)
    );
    let run = 0;
    for (const t of ordered) {
      const pnl = Number(t.pnl) || 0;
      run += pnl;
      s.series.push(run);
      s.netPnl += pnl;
      if (pnl > 0) { s.wins++; s.grossWin += pnl; }
      else if (pnl < 0) { s.losses++; s.grossLoss += Math.abs(pnl); }
      if (s.best == null || pnl > s.best) s.best = pnl;
      if (s.worst == null || pnl < s.worst) s.worst = pnl;
    }
    const decided = s.wins + s.losses;
    return {
      ...s,
      winRate: decided > 0 ? (s.wins / decided) * 100 : 0,
      avgWin: s.wins ? s.grossWin / s.wins : 0,
      avgLoss: s.losses ? s.grossLoss / s.losses : 0,
      profitFactor: s.grossLoss > 0 ? s.grossWin / s.grossLoss : s.grossWin > 0 ? Infinity : null,
    };
  }, [enrichedTrades]);

  const filteredTrades = useMemo(
    () =>
      enrichedTrades.filter((t) => {
        const pnl = Number(t.pnl) || 0;
        if (resultFilter === 'wins' && !(pnl > 0)) return false;
        if (resultFilter === 'losses' && !(pnl < 0)) return false;
        if (dirFilter !== 'all' && t.dir !== dirFilter) return false;
        return true;
      }),
    [enrichedTrades, resultFilter, dirFilter]
  );

  const loading = accountsLoading || (accountId && tradesLoading);

  const searchableIds = useMemo(
    () => ['date', 'entry', 'exit', 'dir', 'symbol', 'strategy', 'notes', 'entryPrice', 'exitPrice', 'takeProfit', 'stopLoss', ...dynamicKeys],
    [dynamicKeys]
  );

  if (loading) return <PageSkeleton />;

  if (!selectedAccount) {
    const typesLabel = allowedTypes.length > 0 ? allowedTypes.join(' or ') : 'matching';
    return (
      <>
        <style>{CSS}</style>
        <div className="jm-root page-fade-in">
          <EmptyState
            icon={FaFolderOpen}
            eyebrow="No accounts"
            size="lg"
            title={noAccountsTitle || `No ${typesLabel} accounts`}
            description={
              noAccountsMessage ||
              `Create a ${typesLabel} account first, then come back here to upload and browse your trades.`
            }
            actions={[{ label: 'Manage accounts', icon: FaFolderOpen, variant: 'primary', to: '/manage/accounts' }]}
          />
        </div>
      </>
    );
  }

  const noun = isBacktest ? 'test' : 'trade';
  const startBal = Number(selectedAccount.balance) || 0;
  const retPct = startBal > 0 ? (stats.netPnl / startBal) * 100 : null;
  const tone = stats.netPnl > 0 ? 'pos' : stats.netPnl < 0 ? 'neg' : 'zero';
  const badge = selectedAccount.type === 'Live' ? 'is-live' : selectedAccount.type === 'Demo' ? 'is-demo' : 'is-backtest';
  const pf = stats.profitFactor == null ? '—' : stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2);
  const money = (v) => (v == null ? '—' : formatMoney(v, currency));

  return (
    <>
      <style>{CSS}</style>
      <div className="jm-root page-fade-in">
        {/* Command bar */}
        <div className="jm-bar">
          <div className="jm-acct">
            <div className="jm-acct-icon"><FaFolderOpen size={15} /></div>
            <div className="jm-acct-meta">
              <span className="jm-acct-name" title={selectedAccount.name}>{selectedAccount.name}</span>
              <span className="jm-acct-sub">
                <span className={`jm-badge ${badge}`}>{selectedAccount.type || 'Backtest'}</span>
                <span>{currency}</span>
                <span>·</span>
                <span>{formatMoney(startBal, currency)} start</span>
              </span>
            </div>
          </div>

          <div className="jm-actions">
            <button type="button" className="jm-btn" onClick={() => downloadTradeTemplate({ account: selectedAccount })} title="Download .xlsx template">
              <FaDownload size={11} /> <span>Template</span>
            </button>
            <button type="button" className="jm-btn" onClick={() => setColumnsOpen(true)} title="Manage custom columns">
              <FaColumns size={11} /> <span>Columns</span>
            </button>
            <button type="button" className="jm-btn" onClick={() => setUploadOpen(true)} title="Bulk-upload from Excel">
              <FaFileUpload size={11} /> <span>Upload</span>
            </button>
            <button type="button" className="jm-btn-primary" onClick={() => setAddTradeOpen(true)}>
              <FaPlus size={11} /> Add {isBacktest ? 'Test' : 'Trade'}
            </button>
          </div>
        </div>

        {/* Hero */}
        <section className="jm-hero" aria-label="Performance summary">
          <div className="jm-hero-cell">
            <span className="jm-eyebrow">Net P&amp;L</span>
            <span className={`jm-pnl ${tone}`}>{formatMoney(stats.netPnl, currency)}</span>
            <div className="jm-pnl-sub">
              {retPct != null && stats.total > 0 && (
                <span className={`jm-delta ${retPct >= 0 ? 'pos' : 'neg'}`}>
                  {retPct >= 0 ? '+' : ''}{retPct.toFixed(2)}%
                </span>
              )}
              <span>{stats.total} {noun}{stats.total === 1 ? '' : 's'} logged</span>
            </div>
            <EquitySpark values={stats.series} />
          </div>

          <div className="jm-hero-cell jm-ring-cell">
            <WinRing winRate={stats.winRate} hasData={stats.wins + stats.losses > 0} />
            <div className="jm-wl">
              <span style={{ color: 'var(--win)' }}><i style={{ background: 'var(--win)' }} />{stats.wins} W</span>
              <span style={{ color: 'var(--loss)' }}><i style={{ background: 'var(--loss)' }} />{stats.losses} L</span>
            </div>
          </div>

          <div className="jm-hero-cell stats">
            <div className="jm-stats">
              <Stat label="Profit factor" value={pf} tone={stats.profitFactor != null && stats.profitFactor >= 1 ? 'pos' : stats.profitFactor != null ? 'neg' : ''} />
              <Stat label="Avg win" value={stats.wins ? money(stats.avgWin) : '—'} tone={stats.wins ? 'pos' : ''} />
              <Stat label="Avg loss" value={stats.losses ? money(-stats.avgLoss) : '—'} tone={stats.losses ? 'neg' : ''} />
              <Stat label="Best" value={money(stats.best)} tone={stats.best > 0 ? 'pos' : ''} />
              <Stat label="Worst" value={money(stats.worst)} tone={stats.worst < 0 ? 'neg' : ''} />
              <Stat label="Total" value={stats.total} />
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="jm-card">
          <div className="jm-card-head">
            <div className="jm-card-title">
              <h3>{isBacktest ? 'Test history' : 'Trade history'}</h3>
              <span className="jm-card-count">
                {filteredTrades.length === enrichedTrades.length
                  ? `${enrichedTrades.length} records`
                  : `${filteredTrades.length} of ${enrichedTrades.length}`}
              </span>
            </div>
            <div className="jm-filters">
              <div className="jm-seg" role="group" aria-label="Result filter">
                {[['all', 'All'], ['wins', 'Wins'], ['losses', 'Losses']].map(([k, label]) => (
                  <button key={k} type="button" className={resultFilter === k ? 'on' : ''} aria-pressed={resultFilter === k} onClick={() => setResultFilter(k)}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="jm-seg" role="group" aria-label="Direction filter">
                {[['all', 'Both'], ['Long', 'Long'], ['Short', 'Short']].map(([k, label]) => (
                  <button key={k} type="button" className={dirFilter === k ? 'on' : ''} aria-pressed={dirFilter === k} onClick={() => setDirFilter(k)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="jm-body">
            <DataTable
              data={filteredTrades}
              columns={columns}
              getRowId={(row, idx) => row.id ?? `${row.date}-${row.entry}-${idx}`}
              searchPlaceholder={`Search ${isBacktest ? 'tests' : 'trades'}…`}
              searchableColumnIds={searchableIds}
              initialSort={[{ id: 'date', desc: true }]}
              estimateRowHeight={40}
              maxHeight={dataTableMaxHeight}
              emptyMessage="No records match your filters."
              stickyFirstColumn={false}
              stickyLastColumn={true}
              emptyState={
                <EmptyState
                  icon={FaFileUpload}
                  eyebrow="Empty"
                  title={`No ${isBacktest ? 'tests' : 'trades'} yet`}
                  description={
                    `Add your first ${noun} manually, or bulk-import an .xlsx log. ` +
                    `You can also define custom columns to capture more context.`
                  }
                  actions={[
                    { label: `Add ${isBacktest ? 'Test' : 'Trade'}`, icon: FaPlus, variant: 'primary', onClick: () => setAddTradeOpen(true) },
                    { label: 'Upload', icon: FaFileUpload, variant: 'ghost', onClick: () => setUploadOpen(true) },
                  ]}
                />
              }
            />
          </div>
        </section>

        <UploadModal
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          account={selectedAccount}
          existingTrades={rawTrades}
          strategies={strategies}
          onSuccess={() => setUploadOpen(false)}
        />

        <AddTradeModal
          isOpen={addTradeOpen}
          onClose={handleAddModalClose}
          account={selectedAccount}
          trade={editingTrade}
          currentR={currentR}
        />

        <ColumnManagerModal
          isOpen={columnsOpen}
          onClose={() => setColumnsOpen(false)}
          account={selectedAccount}
          trades={rawTrades}
        />

        <Alert
          isOpen={!!deletingTrade}
          type="confirm"
          title="Delete trade?"
          message={
            deletingTrade
              ? `Delete the ${deletingTrade.dir || ''} ${deletingTrade.symbol || ''} trade from ${deletingTrade.date} at ${deletingTrade.entry || ''}? This cannot be undone.`
              : ''
          }
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingTrade(null)}
        />
      </div>
    </>
  );
}