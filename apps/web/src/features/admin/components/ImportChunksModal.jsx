// ============================================================================
// ImportChunksModal — live per-chunk log for a market-data import job.
//
// Shows every chunk with its status (pending / running / succeeded / failed /
// stopped), attempts, fetched/inserted rows, and error. While the job is
// running it refetches every 1.5s and auto-scrolls to the first active chunk.
//
// Opened from AdminMarketDataPage's running/interrupted job banners.
// ============================================================================

import { useEffect, useMemo, useRef } from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  MinusCircle,
  StopCircle,
  RefreshCw,
} from 'lucide-react';

import Portal from '@/shared/components/Portal';
import { useAdminMarketDataJobChunks } from '../api';

const STATUS_META = {
  pending:   { label: 'Pending',   icon: Clock,        cls: 'is-pending' },
  running:   { label: 'Running',   icon: Loader2,      cls: 'is-running', spin: true },
  succeeded: { label: 'Succeeded', icon: CheckCircle2, cls: 'is-succeeded' },
  failed:    { label: 'Failed',    icon: XCircle,      cls: 'is-failed' },
  stopped:   { label: 'Stopped',   icon: StopCircle,   cls: 'is-stopped' },
  skipped:   { label: 'Skipped',   icon: MinusCircle,  cls: 'is-skipped' },
};

const CSS = `
  .icm-overlay {
    position: fixed; inset: 0; z-index: 2500;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    animation: icmFade .18s ease;
  }
  .icm-modal {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    width: 100%; max-width: 980px; max-height: 90vh; max-height: 90dvh;
    display: flex; flex-direction: column;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95), 0 0 0 1px var(--accent-soft);
    color: var(--ink-1); overflow: hidden; position: relative;
    animation: icmPop .28s cubic-bezier(.2,.8,.25,1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .icm-modal::before {
    content: ''; position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: icmGrad 4s linear infinite;
    pointer-events: none;
    z-index: 3;
  }

  .icm-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex; align-items: center; gap: 12px;
    flex-shrink: 0;
  }
  .icm-title { margin: 0; font-size: 15px; font-weight: 700; letter-spacing: -.01em; }
  .icm-sub {
    margin: 3px 0 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: var(--ink-3); letter-spacing: .02em;
    word-break: break-all;
  }
  .icm-close {
    margin-left: auto;
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; padding: 0;
    border-radius: 8px; border: none; background: transparent;
    color: var(--ink-2); cursor: pointer;
    transition: all .2s; flex-shrink: 0;
  }
  .icm-close:hover { color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }

  .icm-summary {
    flex-shrink: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
    padding: 12px 22px;
    border-bottom: 1px solid var(--line-soft);
    background: rgba(0,0,0,.10);
  }
  .icm-stat {
    display: flex; flex-direction: column; gap: 2px;
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
    min-width: 0;
  }
  .icm-stat-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase;
    color: var(--ink-3);
  }
  .icm-stat-value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 15px; font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.01em;
    line-height: 1.15;
  }
  .icm-stat-value.ok { color: #4ade80; }
  .icm-stat-value.bad { color: #f87171; }
  .icm-stat-value.amber { color: var(--accent); }

  .icm-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 0;
    position: relative;
  }
  .icm-body::-webkit-scrollbar { width: 8px; }
  .icm-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  .icm-table {
    width: 100%; border-collapse: collapse;
    font-family: 'IBM Plex Mono', monospace; font-size: 11.5px;
  }
  .icm-table thead th {
    position: sticky; top: 0; z-index: 2;
    padding: 10px 12px;
    text-align: left;
    font-size: 9.5px; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: #8892A3;
    background: #141821;
    border-bottom: 1px solid rgba(255,255,255,.08);
    white-space: nowrap;
  }
  .icm-table thead th.right { text-align: right; }
  .icm-table tbody tr { transition: background-color .12s; }
  .icm-table tbody tr:hover { background: rgba(255,255,255,.025); }
  .icm-table tbody tr.is-running-row {
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }
  .icm-table tbody tr.is-failed-row {
    background: rgba(239,68,68,.05);
  }
  .icm-table tbody td {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255,255,255,.04);
    color: #E7E9EE;
    vertical-align: middle;
  }
  .icm-table tbody td.right { text-align: right; }
  .icm-idx { color: var(--ink-3); font-weight: 600; }
  .icm-range { color: var(--ink-2); white-space: nowrap; }
  .icm-error-cell {
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #fca5a5;
    font-size: 10.5px;
  }
  .icm-error-cell.is-empty { color: var(--ink-3); }

  .icm-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 2px 9px;
    border-radius: 99px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; font-weight: 700;
    letter-spacing: .04em; text-transform: uppercase;
    border: 1px solid;
    white-space: nowrap;
  }
  .icm-badge.is-pending   { color: #8892A3; background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.10); }
  .icm-badge.is-running   { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); border-color: color-mix(in srgb, var(--accent) 30%, transparent); }
  .icm-badge.is-succeeded { color: #4ade80; background: rgba(34,197,94,.08); border-color: rgba(34,197,94,.28); }
  .icm-badge.is-failed    { color: #f87171; background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.28); }
  .icm-badge.is-stopped   { color: #8892A3; background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.10); }
  .icm-badge.is-skipped   { color: #8892A3; background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.10); }
  .icm-spin { animation: icmSpin .8s linear infinite; }

  .icm-loading {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 14px; padding: 60px 20px;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', monospace; font-size: 12.5px;
  }
  .icm-empty {
    padding: 60px 20px; text-align: center;
    color: var(--ink-3);
    font-family: 'IBM Plex Mono', monospace; font-size: 12px;
  }

  .icm-foot {
    padding: 12px 22px;
    border-top: 1px solid var(--line-soft);
    background: rgba(0,0,0,.15);
    display: flex; align-items: center; gap: 12px;
    flex-shrink: 0;
  }
  .icm-live {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; font-weight: 700;
    letter-spacing: .12em; text-transform: uppercase;
    color: var(--accent);
  }
  .icm-live-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 70%, transparent);
    animation: icmLive 1.4s ease-in-out infinite;
  }
  .icm-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 16px; border-radius: 9px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03); color: var(--ink-2);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer; transition: all .18s;
    white-space: nowrap;
  }
  .icm-btn:hover {
    color: var(--ink-1); background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
  }

  @keyframes icmFade   { from { opacity: 0; } to { opacity: 1; } }
  @keyframes icmPop    { from { opacity: 0; transform: translateY(-10px) scale(.97); } to { opacity: 1; transform: none; } }
  @keyframes icmGrad   { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
  @keyframes icmSpin   { to { transform: rotate(360deg); } }
  @keyframes icmLive   { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(.75); } }

  @media (prefers-reduced-motion: reduce) {
    .icm-modal, .icm-modal::before, .icm-spin, .icm-live-dot { animation: none !important; }
    .icm-btn, .icm-close { transition: none !important; }
  }
  @media (max-width: 700px) {
    .icm-table { font-size: 10.5px; }
    .icm-table thead th, .icm-table tbody td { padding: 6px 8px; }
    .icm-summary { grid-template-columns: repeat(2, 1fr); }
  }
`;

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtNum(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('en-US');
}

export default function ImportChunksModal({ job, onClose }) {
  const isOpen = !!job;
  const jobId = job?.id;

  const { data, isLoading, refetch, isFetching } = useAdminMarketDataJobChunks(jobId, {
    enabled: isOpen,
  });

  const bodyRef = useRef(null);
  const scrolledRef = useRef(false);

  // Reset scroll-on-open bookkeeping when jobId changes.
  useEffect(() => {
    scrolledRef.current = false;
  }, [jobId]);

  // Auto-scroll to the first active chunk once, when chunks first load.
  useEffect(() => {
    if (!data?.chunks || scrolledRef.current) return;
    const firstActive = data.chunks.find(
      (c) => c.status === 'running' || c.status === 'pending'
    );
    if (!firstActive || !bodyRef.current) return;
    scrolledRef.current = true;
    setTimeout(() => {
      const el = bodyRef.current?.querySelector(
        `[data-chunk-index="${firstActive.index}"]`
      );
      el?.scrollIntoView({ block: 'center' });
    }, 60);
  }, [data?.chunks]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const summary = useMemo(() => {
    const chunks = data?.chunks || [];
    const counts = { pending: 0, running: 0, succeeded: 0, failed: 0, stopped: 0, skipped: 0 };
    let totalFetched = 0;
    let totalInserted = 0;
    for (const c of chunks) {
      counts[c.status] = (counts[c.status] || 0) + 1;
      totalFetched += c.fetched || 0;
      totalInserted += c.inserted || 0;
    }
    return { chunks, counts, totalFetched, totalInserted, total: chunks.length };
  }, [data]);

  if (!isOpen) return null;

  const doneCount =
    summary.counts.succeeded + summary.counts.failed + summary.counts.stopped;
  const progressPct = summary.total > 0 ? (doneCount / summary.total) * 100 : 0;

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="icm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="icm-modal" role="dialog" aria-modal="true">
          {/* Header */}
          <div className="icm-head">
            <div style={{ minWidth: 0 }}>
              <h2 className="icm-title">
                Import chunks · {job.symbol} · {job.interval}
              </h2>
              <p className="icm-sub">
                Job {String(job.id).slice(0, 14)}… ·{' '}
                {formatDate(job.fromTime)} ? {formatDate(job.toTime)} ·{' '}
                {job.status}
              </p>
            </div>
            <button
              type="button"
              className="icm-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Summary */}
          <div className="icm-summary">
            <div className="icm-stat">
              <span className="icm-stat-label">Progress</span>
              <span className="icm-stat-value amber">
                {doneCount}/{summary.total} ({progressPct.toFixed(0)}%)
              </span>
            </div>
            <div className="icm-stat">
              <span className="icm-stat-label">Succeeded</span>
              <span className="icm-stat-value ok">{summary.counts.succeeded}</span>
            </div>
            <div className="icm-stat">
              <span className="icm-stat-label">Failed</span>
              <span className="icm-stat-value bad">{summary.counts.failed}</span>
            </div>
            <div className="icm-stat">
              <span className="icm-stat-label">Pending</span>
              <span className="icm-stat-value">{summary.counts.pending}</span>
            </div>
            <div className="icm-stat">
              <span className="icm-stat-label">Fetched</span>
              <span className="icm-stat-value">{fmtNum(summary.totalFetched)}</span>
            </div>
            <div className="icm-stat">
              <span className="icm-stat-label">Inserted</span>
              <span className="icm-stat-value">{fmtNum(summary.totalInserted)}</span>
            </div>
          </div>

          {/* List */}
          <div className="icm-body" ref={bodyRef}>
            {isLoading ? (
              <div className="icm-loading">
                <Loader2 size={20} className="icm-spin" />
                <span>Loading chunks…</span>
              </div>
            ) : summary.total === 0 ? (
              <div className="icm-empty">No chunks recorded for this job.</div>
            ) : (
              <table className="icm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Range</th>
                    <th>Status</th>
                    <th className="right">Fetched</th>
                    <th className="right">Inserted</th>
                    <th className="right">Tries</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.chunks.map((c) => {
                    const meta = STATUS_META[c.status] || STATUS_META.pending;
                    const Icon = meta.icon;
                    const rowCls =
                      c.status === 'running' ? 'is-running-row'
                      : c.status === 'failed' ? 'is-failed-row'
                      : '';
                    return (
                      <tr
                        key={c.id}
                        className={rowCls}
                        data-chunk-index={c.index}
                      >
                        <td className="icm-idx">{c.index + 1}</td>
                        <td className="icm-range">
                          {formatDate(c.fromTime)} ? {formatDate(c.toTime)}
                        </td>
                        <td>
                          <span className={`icm-badge ${meta.cls}`}>
                            <Icon size={10} className={meta.spin ? 'icm-spin' : ''} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="right">{fmtNum(c.fetched)}</td>
                        <td className="right">{fmtNum(c.inserted)}</td>
                        <td className="right">{c.attempt || 0}</td>
                        <td
                          className={`icm-error-cell ${!c.error ? 'is-empty' : ''}`}
                          title={c.error || ''}
                        >
                          {c.error ? String(c.error) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Foot */}
          <div className="icm-foot">
            <span className="icm-live">
              <span className="icm-live-dot" />
              Live updates
            </span>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="icm-btn"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw size={12} className={isFetching ? 'icm-spin' : ''} />
              Refresh
            </button>
            <button type="button" className="icm-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}