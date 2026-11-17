import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  Database, RefreshCw, Download, Trash2, Play,
  AlertTriangle, CheckCircle2, Clock, Loader2,
  ChevronDown, ChevronRight, Square, List,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import { SymbolSelect } from '@/shared/symbols';
import { useAdminPageHeader } from '../AdminPageHeader';
import {
  useAdminMarketDataStats,
  useAdminMarketDataJobs,
  useAdminStartMarketDataImport,
  useAdminStopMarketDataImport,
  useAdminMarketDataWipe,
} from '../api';
import ConfirmDangerModal from '../components/ConfirmDangerModal';
import ImportChunksModal from '../components/ImportChunksModal';
import EmptyState from '@/shared/components/EmptyState';

const MAX_CONCURRENT_JOBS = 2;

function pad(n) { return String(n).padStart(2, '0'); }
function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayIso() { return isoDate(new Date()); }

function fmtNum(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function ago(iso) {
  if (!iso) return 'never';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'never';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}


const CSS = `
  .mdp-root { display: flex; flex-direction: column; gap: 18px; }

  /* ---------- KPI cards ---------- */
  .mdp-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
  }
  .mdp-kpi {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 18px; border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
  }
  .mdp-kpi-icon {
    flex-shrink: 0; width: 42px; height: 42px; border-radius: 12px;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
    color: #8892A3;
  }
  .mdp-kpi-icon.is-amber {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border-color: color-mix(in srgb, var(--accent) 28%, transparent);
    box-shadow: 0 0 24px -10px color-mix(in srgb, var(--accent) 55%, transparent);
  }
  .mdp-kpi-icon.is-win {
    color: #35C4A1; background: rgba(53,196,161,.10);
    border-color: rgba(53,196,161,.28);
  }
  .mdp-kpi-icon.is-blue {
    color: #60a5fa; background: rgba(96,165,250,.10);
    border-color: rgba(96,165,250,.28);
  }
  .mdp-kpi-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .mdp-kpi-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: #545E6E;
  }
  .mdp-kpi-value {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 20px; font-weight: 700; letter-spacing: -.01em; color: #E7E9EE;
    line-height: 1.15;
  }

  /* ---------- Job banners ---------- */
  .mdp-jobs { display: flex; flex-direction: column; gap: 10px; }
  .mdp-job {
    display: flex; align-items: center; gap: 14px;
    padding: 13px 16px; border-radius: 12px;
    border: 1px solid;
  }
  .mdp-job-running {
    border-color: color-mix(in srgb, var(--accent) 32%, transparent);
    background: color-mix(in srgb, var(--accent) 4%, transparent);
    box-shadow: 0 0 24px -14px color-mix(in srgb, var(--accent) 45%, transparent);
  }
  .mdp-job-interrupted {
    border-color: rgba(239,68,68,.35);
    background: rgba(239,68,68,.04);
  }
  .mdp-job-icon { flex-shrink: 0; color: var(--accent); }
  .mdp-job-icon.is-err { color: #f87171; }
  .mdp-job-body {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 4px;
  }
  .mdp-job-title {
    font-size: 13px; font-weight: 700; color: #E7E9EE;
    line-height: 1.25;
  }
  .mdp-job-title b {
    font-family: 'IBM Plex Mono', monospace; font-weight: 800;
    color: var(--accent);
  }
  .mdp-job-title.is-err b { color: #f87171; }
  .mdp-job-sub {
    font-family: 'IBM Plex Mono', monospace; font-size: 11px;
    color: #8892A3; letter-spacing: .01em;
  }
  .mdp-job-bar {
    height: 3px; border-radius: 99px;
    background: rgba(255,255,255,.08);
    overflow: hidden; margin-top: 6px;
  }
  .mdp-job-bar > div {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
    transition: width .35s cubic-bezier(.2,.8,.25,1);
  }
  .mdp-job-stop, .mdp-job-resume {
    flex-shrink: 0;
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 9px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px; font-weight: 700; letter-spacing: .02em;
    border: 1px solid; cursor: pointer;
    transition: all .18s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .mdp-job-stop {
    color: #f87171;
    border-color: rgba(239,68,68,.35);
    background: rgba(239,68,68,.06);
  }
  .mdp-job-stop:hover:not(:disabled) {
    color: #fca5a5;
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55);
  }
  .mdp-job-chunks {
    flex-shrink: 0;
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px;
    border-radius: 9px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px; font-weight: 700; letter-spacing: .02em;
    border: 1px solid rgba(255,255,255,.10);
    background: rgba(255,255,255,.03);
    color: #8892A3;
    cursor: pointer;
    transition: all .18s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .mdp-job-chunks:hover {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border-color: var(--accent-soft2);
  }
  .mdp-job-resume {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }
  .mdp-job-resume:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border-color: var(--accent);
  }
  .mdp-job-stop:disabled, .mdp-job-resume:disabled {
    opacity: .5; cursor: not-allowed;
  }

  /* ---------- Card shell ---------- */
  .mdp-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .mdp-card-head {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 18px 12px;
    border-bottom: 1px solid rgba(255,255,255,.05);
    flex-wrap: wrap;
  }
  .mdp-card-title { font-size: 13px; font-weight: 700; color: #E7E9EE; }
  .mdp-card-note {
    margin-left: auto; font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; letter-spacing: .06em; text-transform: uppercase;
    color: var(--accent); opacity: .85;
  }
  .mdp-card-body { padding: 16px 18px; }

  /* ---------- Import form ---------- */
  .mdp-form {
    display: grid;
    grid-template-columns: 200px 150px 150px auto;
    gap: 10px;
    align-items: end;
    flex-wrap: wrap;
  }
  @media (max-width: 700px) {
    .mdp-form { grid-template-columns: 1fr; }
  }
  .mdp-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .mdp-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9.5px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: #545E6E;
  }
  .mdp-input, .mdp-select {
    width: 100%; max-width: 150px; padding: 9px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: #E7E9EE;
    font-size: 12.5px;
    font-family: 'IBM Plex Mono', monospace;
    outline: none; box-sizing: border-box; color-scheme: dark;
    transition: border-color .18s, box-shadow .2s;
  }
  .mdp-select {
    appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='%23545E6E'><path d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 011.414 0l4-4a1 1 0 01-1.414-1.414z'/></svg>");
    background-repeat: no-repeat; background-position: right 10px center;
    padding-right: 32px; cursor: pointer;
  }
  .mdp-input:focus, .mdp-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }
  .mdp-input:disabled, .mdp-select:disabled { opacity: .55; cursor: not-allowed; }

  .mdp-btn-import, .mdp-btn-stop {
    position: relative; overflow: hidden;
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 20px; border-radius: 10px; border: none;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px; font-weight: 700; letter-spacing: .02em;
    cursor: pointer;
    transition: transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s;
    white-space: nowrap;
  }
  .mdp-btn-import {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    box-shadow: 0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent),
                inset 0 1px 0 rgba(255,255,255,.4);
  }
  .mdp-btn-import:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px color-mix(in srgb, var(--accent) 70%, transparent),
                inset 0 1px 0 rgba(255,255,255,.5);
  }
  .mdp-btn-import:disabled, .mdp-btn-stop:disabled {
    opacity: .5; cursor: not-allowed; transform: none;
  }
  .mdp-btn-stop {
    background: rgba(239,68,68,.10);
    color: #f87171;
    border: 1px solid rgba(239,68,68,.42);
    box-shadow: none;
  }
  .mdp-btn-stop:hover:not(:disabled) {
    background: rgba(239,68,68,.16);
    border-color: rgba(239,68,68,.65);
    color: #fca5a5;
  }

  /* ---------- Table ---------- */
  .mdp-table {
    width: 100%; border-collapse: collapse;
    font-family: 'IBM Plex Mono', monospace; font-size: 11.5px;
  }
  .mdp-th {
    padding: 10px 12px; text-align: left;
    font-size: 9.5px; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: #8892A3;
    background: rgba(0,0,0,.2);
    border-bottom: 1px solid rgba(255,255,255,.08);
    white-space: nowrap;
  }
  .mdp-th.right { text-align: right; }
  .mdp-tr { transition: background-color .12s; }
  .mdp-tr:hover { background: rgba(255,255,255,.025); }
  .mdp-td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,.04);
    color: #E7E9EE; vertical-align: middle;
    white-space: nowrap;
  }
  .mdp-td.muted { color: #8892A3; }
  .mdp-td.right { text-align: right; }

  .mdp-group-tr > .mdp-group-cell {
    padding: 0;
    background: rgba(0, 0, 0, 0.30);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .mdp-group-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
  }
  .mdp-group-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    padding: 4px 6px;
    margin: -4px -6px;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.15s;
  }
  .mdp-group-toggle:hover { background: rgba(255, 255, 255, 0.04); }
  .mdp-group-toggle:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 40%, transparent);
  }
  .mdp-group-chevron { flex-shrink: 0; color: #8892A3; }
  .mdp-group-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: var(--accent);
    flex-shrink: 0;
  }
  .mdp-group-meta {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    color: #8892A3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mdp-tr.is-group-child > .mdp-td:first-child { padding-left: 36px; }

  .mdp-symbol {
    display: inline-flex; align-items: center; gap: 8px;
    font-weight: 700;
  }
  .mdp-symbol-dot {
    width: 8px; height: 8px; border-radius: 2px;
    background: var(--accent);
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 55%, transparent);
  }
  .mdp-interval {
    display: inline-flex; padding: 2px 8px;
    border-radius: 6px;
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.1);
    font-size: 10.5px; font-weight: 700; letter-spacing: .06em;
    text-transform: uppercase;
  }
  .mdp-status-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 2px 8px; border-radius: 99px;
    font-size: 10px; font-weight: 700; letter-spacing: .06em;
    text-transform: uppercase; border: 1px solid;
  }
  .mdp-status-pill.ok {
    color: #4ade80; background: rgba(34,197,94,.08);
    border-color: rgba(34,197,94,.28);
  }
  .mdp-status-pill.warn {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border-color: color-mix(in srgb, var(--accent) 28%, transparent);
  }
  .mdp-status-pill.err {
    color: #f87171; background: rgba(239,68,68,.08);
    border-color: rgba(239,68,68,.28);
  }
  .mdp-status-pill.idle {
    color: #8892A3; background: rgba(255,255,255,.03);
    border-color: rgba(255,255,255,.1);
  }
  .mdp-status-pill.is-importing {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border-color: color-mix(in srgb, var(--accent) 42%, transparent);
    animation: mdpPulse 1.4s ease-in-out infinite;
  }
  @keyframes mdpPulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: .6; }
  }

  .mdp-actions { display: inline-flex; gap: 6px; justify-content: flex-end; }
  .mdp-icon-btn {
    width: 28px; height: 28px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025);
    color: #8892A3; cursor: pointer;
    transition: all .18s;
    flex-shrink: 0;
  }
  .mdp-icon-btn:hover:not(:disabled) {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border-color: var(--accent-soft2);
  }
  .mdp-icon-btn.danger:hover:not(:disabled) {
    color: #f87171; background: rgba(239,68,68,.08);
    border-color: rgba(239,68,68,.42);
  }
  .mdp-icon-btn.is-stop {
    color: #f87171;
    border-color: rgba(239,68,68,.35);
    background: rgba(239,68,68,.06);
  }
  .mdp-icon-btn.is-stop:hover:not(:disabled) {
    color: #fca5a5;
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55);
  }
  .mdp-icon-btn:disabled { opacity: .35; cursor: not-allowed; }

  .mdp-loading {
    padding: 60px 24px; text-align: center;
    color: #8892A3; font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
  }
  .mdp-spin { animation: mdpSpin .8s linear infinite; }
  @keyframes mdpSpin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .mdp-btn-import, .mdp-btn-stop, .mdp-icon-btn, .mdp-tr, .mdp-group-toggle,
    .mdp-job-stop, .mdp-job-resume, .mdp-job-bar > div { transition: none !important; }
    .mdp-status-pill.is-importing { animation: none !important; }
    .mdp-spin { animation-duration: 1.6s; }
  }
`;


export default function AdminMarketDataPage() {
  const { user } = useAuth();
  const isSuper = user?.role === 'superadmin';

  const { data: jobsData } = useAdminMarketDataJobs();
  const startMutation = useAdminStartMarketDataImport();
  const stopMutation = useAdminStopMarketDataImport();
  const wipeMutation = useAdminMarketDataWipe();

  const allJobs = jobsData?.jobs ?? [];

  // Classify jobs - only show parent jobs (interval: 'all')
  const runningJobs = useMemo(
    () => allJobs.filter((j) => j.status === 'running' || j.status === 'stopping'),
    [allJobs]
  );

  const {
    data: statsData,
    isLoading,
    refetch: refetchStats,
    isFetching: statsFetching,
  } = useAdminMarketDataStats({
    refetchInterval: runningJobs.length > 0 ? 3000 : false,
  });

  // Refetch the table one final time when the job finishes
  const prevRunningCount = useRef(runningJobs.length);
  useEffect(() => {
    if (prevRunningCount.current > 0 && runningJobs.length === 0) {
      refetchStats();
    }
    prevRunningCount.current = runningJobs.length;
  }, [runningJobs.length, refetchStats]);

  // Simple import state - only symbol and date range (no interval, no mode)
  const [symbol, setSymbol] = useState('NQ');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return isoDate(d);
  });
  const [to, setTo] = useState(() => todayIso());

  const [wipeTarget, setWipeTarget] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
  const [chunksModalJobId, setChunksModalJobId] = useState(null);

  useAdminPageHeader({
    eyebrow: 'Operations',
    title: 'Market Data',
    subtitle: 'Chart bar cache · coverage · async import jobs',
  });

  const rows = statsData?.rows ?? [];
  const totals = statsData?.totals ?? { totalBars: 0, symbolCount: 0, intervalCount: 0, coverageRows: 0 };

  // Fast lookup: "SYM" -> active parent job (interval: 'all')
  const activeParentJobBySymbol = useMemo(() => {
    const map = new Map();
    for (const j of runningJobs) map.set(j.symbol, j);
    return map;
  }, [runningJobs]);

  const formActiveJob = activeParentJobBySymbol.get(symbol);
  const globalCapReached = runningJobs.length >= MAX_CONCURRENT_JOBS;
  const anyBusy = startMutation.isPending || stopMutation.isPending || wipeMutation.isPending;

  // ---- Group rows by symbol ----
  const groups = useMemo(() => {
    const m = new Map();
    for (const row of rows) {
      if (!m.has(row.symbol)) m.set(row.symbol, []);
      m.get(row.symbol).push(row);
    }
    return [...m.entries()].map(([sym, items]) => ({
      symbol: sym,
      items,
      totalBars: items.reduce((s, r) => s + r.barCount, 0),
      intervals: items.map((r) => r.interval),
    }));
  }, [rows]);

  // ---- Handlers ----
  const toggleGroup = (sym) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  };

  // NEW: Import ALL intervals for the date range (no interval selector, no full/range mode)
  const startImport = async ({ symbol: sym, from: f, to: t }) => {
    if (!sym) {
      toast.error('Symbol is required.');
      return;
    }
    if (!f || !t) {
      toast.error('Symbol and both dates are required.');
      return;
    }
    if (new Date(f) >= new Date(t)) {
      toast.error('From date must be before To date.');
      return;
    }
    try {
      const res = await startMutation.mutateAsync({ symbol: sym, from: f, to: t });

      // Show summary
      const summary = res.intervals
        .filter(i => i.needsImport)
        .map(i => `${i.interval}: ${i.chunksToImport} chunks`)
        .join(', ');

      toast.success(`Import started · All intervals (${res.category})\n${summary || 'All data already exists'}`);

      // Open chunks modal to show progress
      setChunksModalJobId(res.jobId);
    } catch (err) {
      toast.error(err?.message || 'Could not start import');
    }
  };

  const handleImport = (e) => {
    e?.preventDefault?.();
    if (formActiveJob) return;
    startImport({ symbol, from, to });
  };

  const handleStop = async (jobId) => {
    try {
      await stopMutation.mutateAsync(jobId);
      toast.info('Stop requested — will halt at next chunk boundary');
    } catch (err) {
      toast.error(err?.message || 'Could not stop import');
    }
  };

  const handleResume = (job) => {
    startImport({
      symbol: job.symbol,
      from: job.fromTime?.slice(0, 10) || isoDate(new Date(job.fromTime)),
      to: job.toTime?.slice(0, 10) || isoDate(new Date(job.toTime)),
    });
  };

  const requestWipeRow = (row) => {
    setWipeTarget({
      kind: 'single',
      symbol: row.symbol,
      interval: row.interval,
      barCount: row.barCount,
    });
  };

  const requestWipeGroup = (group) => {
    setWipeTarget({
      kind: 'group',
      symbol: group.symbol,
      intervals: group.intervals,
      totalBars: group.totalBars,
    });
  };

  const handleConfirmWipe = async () => {
    if (!wipeTarget) return;
    try {
      const payload = wipeTarget.kind === 'group'
        ? { symbol: wipeTarget.symbol }
        : { symbol: wipeTarget.symbol, interval: wipeTarget.interval };
      const result = await wipeMutation.mutateAsync(payload);
      const label = wipeTarget.kind === 'group'
        ? `${wipeTarget.symbol} (all intervals)`
        : `${wipeTarget.symbol} ${wipeTarget.interval}`;
      toast.success(`Deleted ${result.deleted.toLocaleString()} bars · ${label}`);
      setWipeTarget(null);
      refetchStats();
    } catch (err) {
      toast.error(err?.message || 'Wipe failed');
      setWipeTarget(null);
    }
  };

  // ---- Derived UI ----
  const rowsEmpty = !isLoading && rows.length === 0;

  const wipeTitle = !wipeTarget ? ''
    : wipeTarget.kind === 'group'
      ? `Delete ALL ${wipeTarget.symbol} data?`
      : `Wipe ${wipeTarget.symbol} · ${wipeTarget.interval}?`;

  const wipeDescription = !wipeTarget ? ''
    : wipeTarget.kind === 'group'
      ? `Deletes every cached bar and coverage row for ${wipeTarget.symbol} across ${wipeTarget.intervals.length} interval${wipeTarget.intervals.length === 1 ? '' : 's'} (${wipeTarget.intervals.join(', ')}). Total: ${wipeTarget.totalBars.toLocaleString()} bars. Users will re-fetch from the provider on the next chart view.`
      : `This deletes all ${wipeTarget.barCount.toLocaleString()} cached bars for ${wipeTarget.symbol} ${wipeTarget.interval}. Users will re-fetch from the provider on the next chart view.`;

  const wipePhrase = !wipeTarget ? ''
    : wipeTarget.kind === 'group'
      ? wipeTarget.symbol
      : `${wipeTarget.symbol}_${wipeTarget.interval}`;

  return (
    <>
      <style>{CSS}</style>
      <div className="mdp-root">

        {/* KPI cards */}
        <div className="mdp-kpis">
          <div className="mdp-kpi">
            <div className="mdp-kpi-icon is-amber"><Database size={16} /></div>
            <div className="mdp-kpi-text">
              <span className="mdp-kpi-label">Total Bars</span>
              <span className="mdp-kpi-value">{fmtNum(totals.totalBars)}</span>
            </div>
          </div>
          <div className="mdp-kpi">
            <div className="mdp-kpi-icon is-win"><CheckCircle2 size={16} /></div>
            <div className="mdp-kpi-text">
              <span className="mdp-kpi-label">Coverage Rows</span>
              <span className="mdp-kpi-value">{fmtNum(totals.coverageRows)}</span>
            </div>
          </div>
          <div className="mdp-kpi">
            <div className="mdp-kpi-icon is-blue"><RefreshCw size={16} /></div>
            <div className="mdp-kpi-text">
              <span className="mdp-kpi-label">Symbols</span>
              <span className="mdp-kpi-value">{fmtNum(totals.symbolCount)}</span>
            </div>
          </div>
          <div className="mdp-kpi">
            <div className="mdp-kpi-icon"><Clock size={16} /></div>
            <div className="mdp-kpi-text">
              <span className="mdp-kpi-label">Intervals</span>
              <span className="mdp-kpi-value">{fmtNum(totals.intervalCount)}</span>
            </div>
          </div>
        </div>

        {/* Job banners - show only parent jobs */}
        {(runningJobs.length > 0 || allJobs.filter(j => j.status === 'interrupted').length > 0) && (
          <div className="mdp-jobs">
            {runningJobs.map((job) => {
              const stopping = job.stopRequested || job.status === 'stopping';
              const pct = job.totalChunks > 0
                ? Math.round((job.chunksDone / job.totalChunks) * 100)
                : 0;
              return (
                <div key={job.id} className="mdp-job mdp-job-running">
                  <div className="mdp-job-icon">
                    <Loader2 size={18} className="mdp-spin" />
                  </div>
                  <div className="mdp-job-body">
                    <div className="mdp-job-title">
                      Importing <b>{job.symbol}</b> · <b>All intervals</b>
                      {stopping && (
                        <span style={{ marginLeft: 10, color: '#f87171' }}>
                          · stopping…
                        </span>
                      )}
                    </div>
                    <div className="mdp-job-sub">
                      {job.chunksDone} / {job.totalChunks} chunks
                      {' · '}
                      {fmtNum(job.inserted)} bars added
                      {' · '}
                      started {ago(job.startedAt)}
                    </div>
                    <div className="mdp-job-bar">
                      <div style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mdp-job-chunks"
                    onClick={() => setChunksModalJobId(job.id)}
                    title="View import status"
                  >
                    <List size={12} /> Status
                  </button>
                  <button
                    type="button"
                    className="mdp-job-stop"
                    onClick={() => handleStop(job.id)}
                    disabled={stopMutation.isPending || stopping}
                    title="Stop this import"
                  >
                    {stopMutation.isPending || stopping
                      ? <><Loader2 size={12} className="mdp-spin" /> Stopping…</>
                      : <><Square size={12} fill="currentColor" /> Stop</>}
                  </button>
                </div>
              );
            })}

            {allJobs.filter(j => j.status === 'interrupted').map((job) => (
              <div key={job.id} className="mdp-job mdp-job-interrupted">
                <div className="mdp-job-icon is-err">
                  <AlertTriangle size={18} />
                </div>
                <div className="mdp-job-body">
                  <div className="mdp-job-title is-err">
                    Interrupted <b>{job.symbol}</b> · <b>All intervals</b>
                  </div>
                  <div className="mdp-job-sub">
                    Stopped at {job.chunksDone} / {job.totalChunks} chunks
                    {job.lastError ? ` · ${String(job.lastError).slice(0, 90)}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="mdp-job-chunks"
                  onClick={() => setChunksModalJobId(job.id)}
                  title="View import status"
                >
                  <List size={12} /> Status
                </button>
                <button
                  type="button"
                  className="mdp-job-resume"
                  onClick={() => handleResume(job)}
                  disabled={startMutation.isPending || globalCapReached || !!activeParentJobBySymbol.get(job.symbol)}
                  title="Start again — skips already-covered chunks"
                >
                  <Play size={12} /> Start again
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Import form - SIMPLIFIED: Symbol + Date Range only */}
        <div className="mdp-card">
          <div className="mdp-card-head">
            <Download size={14} style={{ color: 'var(--accent)' }} />
            <span className="mdp-card-title">
              {formActiveJob ? 'Import in progress' : 'Import historical bars'}
            </span>
            <span className="mdp-card-note">
              {formActiveJob
                ? `${formActiveJob.chunksDone} / ${formActiveJob.totalChunks} chunks`
                : 'imports all intervals · runs async'}
            </span>
          </div>
          <div className="mdp-card-body">
            <form className="mdp-form" onSubmit={handleImport}>
              <div className="mdp-field">
                <label className="mdp-label">Symbol</label>
                <SymbolSelect
                  value={symbol}
                  onChange={setSymbol}
                  placeholder="Select symbol…"
                  disabled={anyBusy}
                />
              </div>

              <div className="mdp-field">
                <label className="mdp-label">From</label>
                <input
                  className="mdp-input"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  disabled={anyBusy}
                />
              </div>

              <div className="mdp-field">
                <label className="mdp-label">To</label>
                <input
                  className="mdp-input"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  disabled={anyBusy}
                />
              </div>

              {formActiveJob ? (
                <button
                  type="button"
                  className="mdp-btn-stop"
                  onClick={() => handleStop(formActiveJob.id)}
                  disabled={stopMutation.isPending || formActiveJob.stopRequested}
                >
                  {stopMutation.isPending || formActiveJob.stopRequested
                    ? <><Loader2 size={12} className="mdp-spin" /> Stopping…</>
                    : <><Square size={12} fill="currentColor" /> Stop import</>}
                </button>
              ) : (
                <button
                  type="submit"
                  className="mdp-btn-import"
                  disabled={startMutation.isPending || globalCapReached}
                  title={globalCapReached ? `Maximum ${MAX_CONCURRENT_JOBS} imports running — stop one first` : undefined}
                >
                  {startMutation.isPending
                    ? <><Loader2 size={12} className="mdp-spin" /> Starting…</>
                    : <><Play size={12} /> Import All</>}
                </button>
              )}
            </form>

            {/* Help text - no more tabs, no more interval selection */}
            {!formActiveJob && (
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                  color: '#E7E9EE',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11.5,
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>How it works:</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#8892A3', fontSize: 11 }}>
                  <li>Imports <b>all 6 intervals</b> (1m, 5m, 15m, 1h, 4h, 1d) automatically</li>
                  <li>Only fetches <b>missing data</b> (skips what's already in DB)</li>
                  <li>Uses <b>smart provider selection</b> (Yahoo, AV, Biquote)</li>
                  <li>Respects <b>rate limits</b> (AV: 12s gap, 25/day max)</li>
                  <li>Runs asynchronously - survives page reload</li>
                </ul>
              </div>
            )}

            {globalCapReached && !formActiveJob && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(239,68,68,.06)',
                  border: '1px solid rgba(239,68,68,.24)',
                  color: '#fca5a5',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11.5,
                  lineHeight: 1.55,
                }}
              >
                {MAX_CONCURRENT_JOBS} imports already running. Stop one in the banner above before starting another.
              </div>
            )}
          </div>
        </div>

        {/* Coverage table */}
        <div className="mdp-card">
          <div className="mdp-card-head">
            <span className="mdp-card-title">Coverage</span>
            <button
              type="button"
              className="mdp-icon-btn"
              onClick={() => refetchStats()}
              disabled={statsFetching}
              title="Refresh"
              style={{ marginLeft: 'auto' }}
            >
              <RefreshCw size={12} className={statsFetching ? 'mdp-spin' : ''} />
            </button>
          </div>

          <div className="mdp-card-body" style={{ padding: 0 }}>
            {isLoading ? (
              <div className="mdp-loading">
                <Loader2 size={20} className="mdp-spin" />
                <span>Loading coverage…</span>
              </div>
            ) : rowsEmpty ? (
              <div style={{ padding: '32px 0' }}>
                <EmptyState
                  icon={Database}
                  eyebrow="Empty"
                  title="No bars cached yet"
                  description="Use the import form above to seed the cache. Once data exists, charts will read from it."
                />
              </div>
            ) : (
              <table className="mdp-table">
                <thead>
                  <tr>
                    <th className="mdp-th">Symbol</th>
                    <th className="mdp-th">Interval</th>
                    <th className="mdp-th right">Bars</th>
                    <th className="mdp-th">DB Range</th>
                    <th className="mdp-th">Coverage</th>
                    <th className="mdp-th">Last Fetched</th>
                    <th className="mdp-th">Status</th>
                    <th className="mdp-th right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    const isCollapsed = collapsedGroups.has(group.symbol);
                    const groupJob = activeParentJobBySymbol.get(group.symbol);
                    return (
                      <Fragment key={group.symbol}>
                        <tr className="mdp-group-tr">
                          <td colSpan={8} className="mdp-group-cell">
                            <div className="mdp-group-head">
                              <button
                                type="button"
                                className="mdp-group-toggle"
                                onClick={() => toggleGroup(group.symbol)}
                                aria-expanded={!isCollapsed}
                              >
                                {isCollapsed
                                  ? <ChevronRight size={13} className="mdp-group-chevron" />
                                  : <ChevronDown size={13} className="mdp-group-chevron" />}
                                <span className="mdp-group-label">{group.symbol}</span>
                                <span className="mdp-group-meta">
                                  {group.items.length} interval{group.items.length === 1 ? '' : 's'}
                                  {' · '}
                                  {fmtNum(group.totalBars)} bars
                                  {groupJob && ` · Importing: ${groupJob.chunksDone}/${groupJob.totalChunks} chunks`}
                                </span>
                              </button>
                              {isSuper && (
                                <button
                                  type="button"
                                  className="mdp-icon-btn danger"
                                  onClick={() => requestWipeGroup(group)}
                                  disabled={anyBusy || group.totalBars === 0}
                                  title={`Delete all ${group.symbol} data (every interval)`}
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {!isCollapsed && group.items.map((row) => {
                          const rowJob = activeParentJobBySymbol.get(row.symbol);

                          const hasBackoff = row.backoffUntil && new Date(row.backoffUntil) > new Date();
                          const hasError = !!row.lastError;
                          let pill;
                          if (rowJob) pill = { cls: 'is-importing', icon: Loader2, text: `Importing ${rowJob.chunksDone}/${rowJob.totalChunks}`, spin: true };
                          else if (hasBackoff) pill = { cls: 'warn', icon: Clock, text: 'Cooldown' };
                          else if (hasError) pill = { cls: 'err', icon: AlertTriangle, text: 'Error' };
                          else if (row.barCount > 0) pill = { cls: 'ok', icon: CheckCircle2, text: 'Healthy' };
                          else pill = { cls: 'idle', icon: Clock, text: 'Empty' };
                          const PillIcon = pill.icon;

                          return (
                            <tr key={`${row.symbol}:${row.interval}`} className="mdp-tr is-group-child">
                              <td className="mdp-td">
                                <span className="mdp-symbol">
                                  <span className="mdp-symbol-dot" />
                                  {row.symbol}
                                </span>
                              </td>
                              <td className="mdp-td">
                                <span className="mdp-interval">{row.interval}</span>
                              </td>
                              <td className="mdp-td right">{fmtNum(row.barCount)}</td>
                              <td className="mdp-td muted">
                                {row.dbFromTime && row.dbToTime
                                  ? `${fmtDate(row.dbFromTime)} → ${fmtDate(row.dbToTime)}`
                                  : '—'}
                              </td>
                              <td className="mdp-td muted">
                                {row.coverageFrom && row.coverageTo
                                  ? `${fmtDate(row.coverageFrom)} → ${fmtDate(row.coverageTo)}`
                                  : '—'}
                              </td>
                              <td className="mdp-td muted">{ago(row.lastFetchedAt)}</td>
                              <td className="mdp-td">
                                <span className={`mdp-status-pill ${pill.cls}`} title={row.lastError || ''}>
                                  <PillIcon size={10} className={pill.spin ? 'mdp-spin' : ''} />
                                  {pill.text}
                                </span>
                              </td>
                              <td className="mdp-td right">
                                <div className="mdp-actions">
                                  {rowJob ? (
                                    <button
                                      type="button"
                                      className="mdp-icon-btn is-stop"
                                      onClick={() => handleStop(rowJob.id)}
                                      disabled={stopMutation.isPending || rowJob.stopRequested}
                                      title="Stop import"
                                    >
                                      <Square size={11} fill="currentColor" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="mdp-icon-btn"
                                      onClick={() => handleRefillRow(row, startImport)}
                                      disabled={anyBusy || hasBackoff || globalCapReached}
                                      title={
                                        globalCapReached
                                          ? `Maximum ${MAX_CONCURRENT_JOBS} imports running`
                                          : 'Refill last N days'
                                      }
                                    >
                                      <RefreshCw size={11} />
                                    </button>
                                  )}
                                  {isSuper && (
                                    <button
                                      type="button"
                                      className="mdp-icon-btn danger"
                                      onClick={() => requestWipeRow(row)}
                                      disabled={anyBusy}
                                      title="Wipe this interval only"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <ImportChunksModal
        job={allJobs.find(j => j.id === chunksModalJobId) || null}
        onClose={() => setChunksModalJobId(null)}
      />

      <ConfirmDangerModal
        isOpen={!!wipeTarget}
        title={wipeTitle}
        description={wipeDescription}
        confirmPhrase={wipePhrase}
        confirmLabel={wipeTarget?.kind === 'group' ? 'Delete group' : 'Wipe cache'}
        busy={wipeMutation.isPending}
        onCancel={() => setWipeTarget(null)}
        onConfirm={handleConfirmWipe}
      />
    </>
  );
}

// Refill helper - imports last N days for given interval via parent import
const handleRefillRow = (row, startImport) => {
  const d = new Date();
  const days = row.interval === '1m' ? 5
    : row.interval === '5m' || row.interval === '15m' ? 30
    : row.interval === '1h' || row.interval === '4h' ? 180
    : 1095;
  d.setDate(d.getDate() - days);
  startImport({
    symbol: row.symbol,
    from: isoDate(d),
    to: todayIso(),
  });
};
