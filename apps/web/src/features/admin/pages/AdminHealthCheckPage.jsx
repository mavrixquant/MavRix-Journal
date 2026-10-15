// apps/web/src/features/admin/pages/AdminHealthCheckPage.jsx
//
// /admin/health-check — superadmin-only.
//
// Phase 3 (this file): full UI shell + phase picker + basic polling.
// Phase 4 upgrades polling → live SSE streaming and adds polish.

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  HeartPulse,
  ListChecks,
  Clock,
  Play,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { apiJson } from '@/shared/api/client';
import HealthCheckPhasePanel from '../components/HealthCheckPhasePanel';

/* ============================================================ */
/*  Scoped CSS                                                   */
/* ============================================================ */

const CSS = `
  .hc-root {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ---------- KPI strip ---------- */
  .hc-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
  }
  .hc-kpi {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    transition: border-color .25s ease, transform .25s ease;
  }
  .hc-kpi:hover {
    border-color: color-mix(in srgb, var(--accent) 25%, transparent);
    transform: translateY(-1px);
  }
  .hc-kpi-icon {
    flex-shrink: 0;
    color: var(--accent);
    opacity: .85;
  }
  .hc-kpi-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: #545E6E;
    margin-bottom: 3px;
  }
  .hc-kpi-value {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 20px;
    font-weight: 700;
    color: #E7E9EE;
    letter-spacing: -.01em;
    line-height: 1.1;
  }
  .hc-kpi-value-running   { color: var(--accent); }
  .hc-kpi-value-completed { color: #4ade80; }
  .hc-kpi-value-failed    { color: #f87171; }
  .hc-kpi-dim {
    font-size: 12px;
    color: #545E6E;
    font-weight: 500;
  }

  /* ---------- Shared card shell ---------- */
  .hc-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .hc-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 18px 12px;
    border-bottom: 1px solid rgba(255,255,255,.05);
    flex-wrap: wrap;
  }
  .hc-card-title {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: #E7E9EE;
    letter-spacing: -.005em;
  }
  .hc-card-sub {
    display: block;
    margin-top: 3px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: #8892A3;
    letter-spacing: .02em;
  }

  /* ---------- Toolbar buttons ---------- */
  .hc-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 18px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: .02em;
    cursor: pointer;
    outline: none;
    transition: all .2s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .hc-btn:hover:not(:disabled) {
    color: #E7E9EE;
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .hc-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }

  .hc-btn-run {
    position: relative;
    overflow: hidden;
    border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    padding: 11px 22px;
    font-size: 12px;
    box-shadow:
      0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent),
      inset 0 1px 0 rgba(255,255,255,.4);
  }
  .hc-btn-run::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(105deg, transparent 32%,
      rgba(255,255,255,.3) 50%, transparent 68%);
    animation: hcShine 4.2s ease-in-out infinite;
  }
  .hc-btn-run:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow:
      0 16px 42px -10px color-mix(in srgb, var(--accent) 70%, transparent),
      inset 0 1px 0 rgba(255,255,255,.5);
  }
  .hc-btn-run:disabled {
    background: linear-gradient(135deg,
      color-mix(in srgb, var(--accent) 32%, transparent),
      color-mix(in srgb, var(--accent-2) 28%, transparent));
    color: rgba(13,17,23,.55);
    box-shadow: none;
  }
  .hc-btn-run:disabled::after { display: none; }

  .hc-btn-ghost {
    padding: 7px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.08);
    background: transparent;
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all .18s;
  }
  .hc-btn-ghost:hover:not(:disabled) {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 28%, transparent);
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }
  .hc-btn-ghost:disabled { opacity: .35; cursor: not-allowed; }

  .hc-picker-actions {
    display: inline-flex;
    gap: 6px;
    flex-shrink: 0;
  }

  /* ---------- Phase picker grid ---------- */
  .hc-picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
    padding: 14px 18px 18px;
  }
  .hc-empty-inline {
    grid-column: 1 / -1;
    padding: 20px;
    text-align: center;
    color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
  }

  .hc-tile {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(255,255,255,.015);
    cursor: pointer;
    text-align: left;
    outline: none;
    transition:
      border-color .2s ease,
      background-color .2s ease,
      transform .2s cubic-bezier(.2,.8,.25,1),
      box-shadow .25s ease;
    position: relative;
    overflow: hidden;
  }
  .hc-tile:hover:not(:disabled) {
    border-color: rgba(255,255,255,.16);
    background: rgba(255,255,255,.03);
    transform: translateY(-1px);
  }
  .hc-tile.is-selected {
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    background: linear-gradient(135deg,
      color-mix(in srgb, var(--accent) 8%, transparent),
      color-mix(in srgb, var(--accent) 2%, transparent));
    box-shadow:
      0 0 24px -12px color-mix(in srgb, var(--accent) 55%, transparent),
      inset 0 1px 0 rgba(255,255,255,.05);
  }
  .hc-tile:disabled { cursor: not-allowed; opacity: .6; }

  .hc-tile-check {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 1.5px solid rgba(255,255,255,.14);
    background: rgba(0,0,0,.2);
    color: transparent;
    transition: all .2s cubic-bezier(.2,.8,.25,1);
  }
  .hc-tile.is-selected .hc-tile-check {
    border-color: var(--accent);
    background: var(--accent);
    color: #0D1117;
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 55%, transparent);
  }

  .hc-tile-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }
  .hc-tile-label {
    font-size: 12.5px;
    font-weight: 700;
    color: #E7E9EE;
    letter-spacing: -.005em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hc-tile.is-selected .hc-tile-label { color: #FFFFFF; }
  .hc-tile-desc {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: #8892A3;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .hc-tile-est {
    flex-shrink: 0;
    padding: 3px 8px;
    border-radius: 99px;
    background: rgba(255,255,255,.03);
    border: 1px solid rgba(255,255,255,.08);
    color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .02em;
    white-space: nowrap;
  }
  .hc-tile.is-selected .hc-tile-est {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  }

  /* ---------- Empty / running / failed states ---------- */
  .hc-results-empty {
    padding: 60px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }
  .hc-empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg,
      color-mix(in srgb, var(--accent) 14%, transparent),
      color-mix(in srgb, var(--accent) 4%, transparent));
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    color: var(--accent);
    box-shadow: 0 0 30px -10px color-mix(in srgb, var(--accent) 55%, transparent);
    margin-bottom: 6px;
  }
  .hc-empty-title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #E7E9EE;
    letter-spacing: -.01em;
  }
  .hc-empty-desc {
    margin: 0;
    max-width: 420px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.7;
    color: #8892A3;
  }
  .hc-empty-desc b { color: var(--accent); font-weight: 700; }

  .hc-results-running,
  .hc-results-failed {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 22px 24px;
  }
  .hc-results-running { color: var(--accent); }
  .hc-results-failed  { color: #f87171; border-color: rgba(239,68,68,.28) !important; }
  .hc-running-title {
    font-size: 14px;
    font-weight: 700;
    color: #E7E9EE;
    margin-bottom: 4px;
  }
  .hc-running-sub {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    color: #8892A3;
  }
  .hc-running-sub code {
    color: var(--accent);
    padding: 1px 6px;
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
    border-radius: 4px;
    font-size: 11px;
  }

  .hc-spin { animation: hcSpin 1s linear infinite; }
  @keyframes hcSpin { to { transform: rotate(360deg); } }
  @keyframes hcShine {
    0%, 100% { transform: translateX(-130%) skewX(-18deg); }
    55%      { transform: translateX(230%) skewX(-18deg); }
  }

  /* ---------- Summary tiles ---------- */
  .hc-summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    padding: 16px 18px 18px;
  }
  .hc-summary-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 16px 12px;
    border-radius: 12px;
    background: rgba(255,255,255,.02);
    border: 1px solid rgba(255,255,255,.06);
    color: #8892A3;
    text-align: center;
  }
  .hc-summary-pass { color: #4ade80; border-color: rgba(34,197,94,.28); background: rgba(34,197,94,.04); }
  .hc-summary-fail { color: #f87171; border-color: rgba(239,68,68,.28); background: rgba(239,68,68,.04); }
  .hc-summary-skip { color: #8892A3; }

  .hc-summary-num {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 22px;
    font-weight: 700;
    color: #E7E9EE;
    letter-spacing: -.01em;
    line-height: 1.1;
  }
  .hc-summary-pass .hc-summary-num { color: #4ade80; }
  .hc-summary-fail .hc-summary-num { color: #f87171; }
  .hc-summary-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    opacity: .75;
  }

  @media (prefers-reduced-motion: reduce) {
    .hc-btn-run::after,
    .hc-spin,
    .hc-tile { animation: none !important; transition: none !important; }
  }
`;

/* ============================================================ */
/*  Component                                                    */
/* ============================================================ */

export default function AdminHealthCheckPage() {
  const [selected, setSelected] = useState(null); // null until phases load
  const [runState, setRunState] = useState({
    runId: null,
    status: 'idle', // 'idle' | 'running' | 'completed' | 'failed'
    summary: null,
    error: null,
  });

  /* ---------------- fetch phase metadata ---------------- */

  const phasesQuery = useQuery({
    queryKey: ['admin', 'health-check', 'phases'],
    queryFn: () => apiJson('/api/admin/health-check/phases'),
    staleTime: 5 * 60_000,
  });

  const phases = phasesQuery.data?.phases ?? [];

  /* ---------------- init selection once phases arrive ---------------- */

  useEffect(() => {
    if (phases.length === 0) return;
    setSelected((prev) => prev ?? new Set(phases.map((p) => p.id)));
  }, [phases]);

  /* ---------------- start run ---------------- */

  const startMutation = useMutation({
    mutationFn: (phasesList) =>
      apiJson('/api/admin/health-check/run', {
        method: 'POST',
        body: JSON.stringify({ phases: phasesList }),
      }),
    onSuccess: (data) => {
      setRunState({
        runId: data.runId,
        status: 'running',
        summary: null,
        error: null,
      });
      toast.info('Health check started');
    },
    onError: (err) => {
      setRunState({
        runId: null,
        status: 'failed',
        summary: null,
        error: err.message,
      });
      toast.error(err.message || 'Failed to start');
    },
  });

  /* ---------------- poll status while running ---------------- */
  // Phase 4 replaces this with live SSE streaming.

  useEffect(() => {
    if (runState.status !== 'running' || !runState.runId) return undefined;

    let cancelled = false;
    const iv = setInterval(async () => {
      if (cancelled) return;
      try {
        const data = await apiJson(
          `/api/admin/health-check/status/${runState.runId}`
        );
        if (data.status === 'running') return;
        setRunState((prev) => ({
          ...prev,
          status: data.status,
          summary: data.summary,
        }));
      } catch (err) {
        setRunState((prev) => ({
          ...prev,
          status: 'failed',
          error: err.message,
        }));
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [runState.status, runState.runId]);

  const selectedList = useMemo(() => [...(selected ?? [])], [selected]);
  const allSelected = phases.length > 0 && selectedList.length === phases.length;
  const noneSelected = selectedList.length === 0;

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(phases.map((p) => p.id)));
  const clearAll = () => setSelected(new Set());

  const handleRun = () => {
    if (noneSelected) return;
    startMutation.mutate(selectedList);
  };

  const isRunning = runState.status === 'running';

  const estimatedTests = phases
    .filter((p) => selected?.has(p.id))
    .reduce((sum, p) => sum + (p.est || 0), 0);

  /* ---------------- render ---------------- */

  return (
    <>
      <style>{CSS}</style>
      <div className="hc-root">
        {/* ---------- Header ---------- */}
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">System</span>
            <h1 className="admin-ph-title">Health Checkup</h1>
            <p className="admin-ph-sub">
              End-to-end API exercise across every route group — auth, accounts,
              trades, strategies, users, friends, chat, calendar, market data,
              GEX, admin, and SSE.
            </p>
          </div>
          <div className="admin-ph-right">
            <button
              type="button"
              className="hc-btn hc-btn-run"
              onClick={handleRun}
              disabled={isRunning || noneSelected || startMutation.isPending}
            >
              {isRunning ? (
                <>
                  <RefreshCw size={13} className="hc-spin" />
                  <span>Running…</span>
                </>
              ) : (
                <>
                  <Play size={13} />
                  <span>Run Health Check</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ---------- KPI strip ---------- */}
        <div className="hc-kpis">
          <div className="hc-kpi">
            <ListChecks size={14} className="hc-kpi-icon" />
            <div>
              <div className="hc-kpi-label">Phases selected</div>
              <div className="hc-kpi-value">
                {selectedList.length}
                <span className="hc-kpi-dim"> / {phases.length}</span>
              </div>
            </div>
          </div>

          <div className="hc-kpi">
            <HeartPulse size={14} className="hc-kpi-icon" />
            <div>
              <div className="hc-kpi-label">Estimated tests</div>
              <div className="hc-kpi-value">~{estimatedTests}</div>
            </div>
          </div>

          <div className="hc-kpi">
            <Clock size={14} className="hc-kpi-icon" />
            <div>
              <div className="hc-kpi-label">Status</div>
              <div className={`hc-kpi-value hc-kpi-value-${runState.status}`}>
                {runState.status === 'idle' && 'Idle'}
                {runState.status === 'running' && 'Running'}
                {runState.status === 'completed' && 'Completed'}
                {runState.status === 'failed' && 'Failed'}
              </div>
            </div>
          </div>

          {runState.summary?.elapsedMs != null && (
            <div className="hc-kpi">
              <Clock size={14} className="hc-kpi-icon" />
              <div>
                <div className="hc-kpi-label">Elapsed</div>
                <div className="hc-kpi-value">
                  {(runState.summary.elapsedMs / 1000).toFixed(1)}
                  <span className="hc-kpi-dim">s</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---------- Phase picker ---------- */}
        <div className="hc-card">
          <div className="hc-card-head">
            <div>
              <span className="hc-card-title">Select phases to run</span>
              <span className="hc-card-sub">
                Every fixture is created and destroyed within the same run
              </span>
            </div>
            <div className="hc-picker-actions">
              <button
                type="button"
                className="hc-btn-ghost"
                onClick={selectAll}
                disabled={allSelected || isRunning}
              >
                Select all
              </button>
              <button
                type="button"
                className="hc-btn-ghost"
                onClick={clearAll}
                disabled={noneSelected || isRunning}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="hc-picker-grid">
            {phasesQuery.isLoading && (
              <div className="hc-empty-inline">Loading phases…</div>
            )}
            {phases.map((p) => {
              const isSelected = selected?.has(p.id) ?? false;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`hc-tile${isSelected ? ' is-selected' : ''}`}
                  onClick={() => !isRunning && toggle(p.id)}
                  disabled={isRunning}
                  aria-pressed={isSelected}
                >
                  <span className="hc-tile-check" aria-hidden>
                    {isSelected && <CheckCircle2 size={13} />}
                  </span>
                  <span className="hc-tile-body">
                    <span className="hc-tile-label">{p.label}</span>
                    <span className="hc-tile-desc">{p.description}</span>
                  </span>
                  <span className="hc-tile-est">~{p.est} tests</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------- Results ---------- */}
        {runState.status === 'idle' && (
          <div className="hc-card hc-results-empty">
            <div className="hc-empty-icon">
              <HeartPulse size={26} />
            </div>
            <h3 className="hc-empty-title">Ready to run</h3>
            <p className="hc-empty-desc">
              Pick the phases above and click <b>Run Health Check</b>. Every
              fixture is created and destroyed automatically — nothing is left
              behind in the database.
            </p>
          </div>
        )}

        {isRunning && (
          <div className="hc-card hc-results-running">
            <RefreshCw size={22} className="hc-spin" />
            <div>
              <div className="hc-running-title">Running health check…</div>
              <div className="hc-running-sub">
                Run ID: <code>{runState.runId}</code>
              </div>
            </div>
          </div>
        )}

        {runState.status === 'failed' && (
          <div className="hc-card hc-results-failed">
            <AlertTriangle size={22} />
            <div>
              <div className="hc-running-title">Run failed</div>
              <div className="hc-running-sub">
                {runState.error || 'Unknown error'}
              </div>
            </div>
          </div>
        )}

        {runState.status === 'completed' && runState.summary && (
          <>
            <div className="hc-card">
              <div className="hc-card-head">
                <div>
                  <span className="hc-card-title">Summary</span>
                  <span className="hc-card-sub">
                    {runState.summary.total} tests ·{' '}
                    {runState.summary.pass} passed ·{' '}
                    {runState.summary.fail} failed ·{' '}
                    {runState.summary.skip} skipped
                  </span>
                </div>
              </div>
              <div className="hc-summary-grid">
                <div className="hc-summary-tile hc-summary-pass">
                  <CheckCircle2 size={16} />
                  <span className="hc-summary-num">{runState.summary.pass}</span>
                  <span className="hc-summary-label">Passed</span>
                </div>
                <div className="hc-summary-tile hc-summary-fail">
                  <XCircle size={16} />
                  <span className="hc-summary-num">{runState.summary.fail}</span>
                  <span className="hc-summary-label">Failed</span>
                </div>
                <div className="hc-summary-tile hc-summary-skip">
                  <AlertTriangle size={16} />
                  <span className="hc-summary-num">{runState.summary.skip}</span>
                  <span className="hc-summary-label">Skipped</span>
                </div>
                <div className="hc-summary-tile">
                  <Clock size={16} />
                  <span className="hc-summary-num">
                    {(runState.summary.elapsedMs / 1000).toFixed(1)}s
                  </span>
                  <span className="hc-summary-label">Duration</span>
                </div>
              </div>
            </div>

            {phases.map((p) => {
              const tests = (runState.summary.results || []).filter(
                (t) => t.phase === p.id
              );
              if (tests.length === 0) return null;
              return (
                <HealthCheckPhasePanel
                  key={p.id}
                  phase={p.id}
                  meta={p}
                  tests={tests}
                />
              );
            })}
          </>
        )}
      </div>
    </>
  );
}