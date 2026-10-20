
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Download,
  Sparkles,
  StopCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { apiJson, apiFetch } from '@/shared/api/client';
import HealthCheckPhasePanel from '../components/HealthCheckPhasePanel';


const CSS = `
  .hc-root { display: flex; flex-direction: column; gap: 20px; }

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
  .hc-kpi-icon { flex-shrink: 0; color: var(--accent); opacity: .85; }
  .hc-kpi-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase;
    color: #545E6E; margin-bottom: 3px;
  }
  .hc-kpi-value {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 20px; font-weight: 700;
    color: #E7E9EE; letter-spacing: -.01em; line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .hc-kpi-value-running   { color: var(--accent); }
  .hc-kpi-value-completed { color: #4ade80; }
  .hc-kpi-value-failed    { color: #f87171; }
  .hc-kpi-dim { font-size: 12px; color: #545E6E; font-weight: 500; }

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
    display: block; font-size: 13px; font-weight: 700;
    color: #E7E9EE; letter-spacing: -.005em;
  }
  .hc-card-sub {
    display: block; margin-top: 3px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: #8892A3; letter-spacing: .02em;
  }

  /* ---------- Buttons ---------- */
  .hc-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 18px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03); color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 700; letter-spacing: .02em;
    cursor: pointer; outline: none; white-space: nowrap;
    transition: all .2s cubic-bezier(.2,.8,.25,1);
  }
  .hc-btn:hover:not(:disabled) {
    color: #E7E9EE; background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2); transform: translateY(-1px);
  }
  .hc-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }

  .hc-btn-run {
    position: relative; overflow: hidden; border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117; padding: 11px 22px; font-size: 12px;
    box-shadow:
      0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent),
      inset 0 1px 0 rgba(255,255,255,.4);
  }
  .hc-btn-run::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
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
    color: rgba(13,17,23,.55); box-shadow: none;
  }
  .hc-btn-run:disabled::after { display: none; }

  .hc-btn-ghost {
    padding: 7px 12px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,.08); background: transparent;
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; font-weight: 700; letter-spacing: .04em;
    text-transform: uppercase; cursor: pointer;
    transition: all .18s;
  }
  .hc-btn-ghost:hover:not(:disabled) {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 28%, transparent);
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }
  .hc-btn-ghost:disabled { opacity: .35; cursor: not-allowed; }

  .hc-btn-danger {
    padding: 7px 12px; border-radius: 8px;
    border: 1px solid rgba(239,68,68,.28);
    background: rgba(239,68,68,.05); color: #f87171;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; font-weight: 700; letter-spacing: .04em;
    text-transform: uppercase; cursor: pointer;
    transition: all .18s;
  }
  .hc-btn-danger:hover:not(:disabled) {
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55); color: #fca5a5;
  }
  .hc-btn-danger:disabled { opacity: .35; cursor: not-allowed; }

  .hc-picker-actions { display: inline-flex; gap: 6px; flex-shrink: 0; }

  /* ---------- Phase picker ---------- */
  .hc-picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px; padding: 14px 18px 18px;
  }
  .hc-empty-inline {
    grid-column: 1 / -1; padding: 20px; text-align: center;
    color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
  }

  .hc-tile {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 12px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(255,255,255,.015);
    cursor: pointer; text-align: left; outline: none;
    transition:
      border-color .2s ease,
      background-color .2s ease,
      transform .2s cubic-bezier(.2,.8,.25,1),
      box-shadow .25s ease;
    position: relative; overflow: hidden;
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
    display: inline-flex; align-items: center; justify-content: center;
    width: 20px; height: 20px; border-radius: 6px;
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

  .hc-tile-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
  .hc-tile-label {
    font-size: 12.5px; font-weight: 700;
    color: #E7E9EE; letter-spacing: -.005em;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .hc-tile.is-selected .hc-tile-label { color: #FFFFFF; }
  .hc-tile-desc {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: #8892A3; line-height: 1.4;
    overflow: hidden; text-overflow: ellipsis;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }

  .hc-tile-est {
    flex-shrink: 0;
    padding: 3px 8px; border-radius: 99px;
    background: rgba(255,255,255,.03);
    border: 1px solid rgba(255,255,255,.08);
    color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .02em;
    white-space: nowrap;
  }
  .hc-tile.is-selected .hc-tile-est {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  }

  /* ---------- Empty / running / failed ---------- */
  .hc-results-empty {
    padding: 60px 24px;
    display: flex; flex-direction: column; align-items: center;
    gap: 12px; text-align: center;
  }
  .hc-empty-icon {
    width: 64px; height: 64px; border-radius: 18px;
    display: inline-flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg,
      color-mix(in srgb, var(--accent) 14%, transparent),
      color-mix(in srgb, var(--accent) 4%, transparent));
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    color: var(--accent);
    box-shadow: 0 0 30px -10px color-mix(in srgb, var(--accent) 55%, transparent);
    margin-bottom: 6px;
  }
  .hc-empty-title {
    margin: 0; font-size: 16px; font-weight: 700;
    color: #E7E9EE; letter-spacing: -.01em;
  }
  .hc-empty-desc {
    margin: 0; max-width: 420px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px; line-height: 1.7; color: #8892A3;
  }
  .hc-empty-desc b { color: var(--accent); font-weight: 700; }

  .hc-results-running, .hc-results-failed {
    display: flex; align-items: center; gap: 16px; padding: 20px 24px;
  }
  .hc-results-running { color: var(--accent); }
  .hc-results-failed  { color: #f87171; border-color: rgba(239,68,68,.28) !important; }

  .hc-running-title {
    font-size: 14px; font-weight: 700; color: #E7E9EE; margin-bottom: 4px;
  }
  .hc-running-sub {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; color: #8892A3;
  }
  .hc-running-sub code {
    color: var(--accent);
    padding: 1px 6px;
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
    border-radius: 4px; font-size: 11px;
  }

  .hc-progress-bar {
    margin-top: 10px;
    height: 4px;
    border-radius: 99px;
    background: rgba(255,255,255,.06);
    overflow: hidden;
  }
  .hc-progress-fill {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
    transition: width .4s cubic-bezier(.2,.8,.25,1);
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 60%, transparent);
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
    gap: 12px; padding: 16px 18px 18px;
  }
  .hc-summary-tile {
    display: flex; flex-direction: column; align-items: center;
    gap: 4px; padding: 16px 12px; border-radius: 12px;
    background: rgba(255,255,255,.02);
    border: 1px solid rgba(255,255,255,.06);
    color: #8892A3; text-align: center;
  }
  .hc-summary-pass { color: #4ade80; border-color: rgba(34,197,94,.28); background: rgba(34,197,94,.04); }
  .hc-summary-fail { color: #f87171; border-color: rgba(239,68,68,.28); background: rgba(239,68,68,.04); }
  .hc-summary-skip { color: #8892A3; }

  .hc-summary-num {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 22px; font-weight: 700; color: #E7E9EE;
    letter-spacing: -.01em; line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .hc-summary-pass .hc-summary-num { color: #4ade80; }
  .hc-summary-fail .hc-summary-num { color: #f87171; }
  .hc-summary-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; opacity: .75;
  }

  /* ---------- Cleanup log ---------- */
  .hc-cleanup-list {
    padding: 8px 18px 16px;
    display: flex; flex-direction: column; gap: 2px;
  }
  .hc-cleanup-row {
    display: flex; align-items: center; gap: 10px;
    padding: 6px 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    color: #8892A3;
    border-bottom: 1px solid rgba(255,255,255,.03);
  }
  .hc-cleanup-row:last-child { border-bottom: none; }
  .hc-cleanup-row.ok  { color: #4ade80; }
  .hc-cleanup-row.bad { color: #fca5a5; }
  .hc-cleanup-icon { flex-shrink: 0; }

  /* ---------- Live badge ---------- */
  .hc-live {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 3px 10px; border-radius: 99px;
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
    color: var(--accent);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase;
  }
  .hc-live-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 70%, transparent);
    animation: hcLive 1.4s ease-in-out infinite;
  }
  @keyframes hcLive {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: .4; transform: scale(.75); }
  }

  @media (prefers-reduced-motion: reduce) {
    .hc-btn-run::after, .hc-spin, .hc-live-dot { animation: none !important; }
    .hc-tile { transition: none !important; }
  }
`;


const IDLE_STATE = {
  runId: null,
  status: 'idle',
  phases: {},
  cleanup: [],
  summary: null,
  error: null,
  startedAt: null,
  completedAt: null,
};


export default function AdminHealthCheckPage() {
  const [selected, setSelected] = useState(null);
  const [runState, setRunState] = useState(IDLE_STATE);

  const [now, setNow] = useState(0);


  const phasesQuery = useQuery({
    queryKey: ['admin', 'health-check', 'phases'],
    queryFn: () => apiJson('/api/admin/health-check/phases'),
    staleTime: 5 * 60_000,
  });

  const phases = useMemo(
    () => phasesQuery.data?.phases ?? [],
    [phasesQuery.data]
  );

  useEffect(() => {
    if (phases.length === 0) return;
    setSelected((prev) => prev ?? new Set(phases.map((p) => p.id)));
  }, [phases]);


  const startMutation = useMutation({
    mutationFn: (phasesList) =>
      apiJson('/api/admin/health-check/run', {
        method: 'POST',
        body: JSON.stringify({ phases: phasesList }),
      }),
    onSuccess: (data) => {
      const t0 = Date.now();
      setRunState({
        ...IDLE_STATE,
        runId: data.runId,
        status: 'running',
        phases: Object.fromEntries(
          data.phases.map((id) => [id, { status: 'pending', tests: [] }])
        ),
        startedAt: t0,
      });
      setNow(t0);
      toast.info('Health check started');
    },
    onError: (err) => {
      setRunState((prev) => ({
        ...prev,
        status: 'failed',
        error: err.message,
      }));
      toast.error(err.message || 'Failed to start');
    },
  });


  const abortRef = useRef(null);

  const handleStreamEvent = useCallback((event) => {
    setRunState((prev) => {
      const next = { ...prev };

      switch (event.type) {
        case 'run:start': {
          return next;
        }

        case 'phase:start': {
          next.phases = {
            ...prev.phases,
            [event.phase]: {
              status: 'running',
              tests: prev.phases[event.phase]?.tests ?? [],
            },
          };
          return next;
        }

        case 'phase:end': {
          next.phases = {
            ...prev.phases,
            [event.phase]: {
              ...(prev.phases[event.phase] || { tests: [] }),
              status: 'done',
            },
          };
          return next;
        }

        case 'phase:error': {
          next.phases = {
            ...prev.phases,
            [event.phase]: {
              ...(prev.phases[event.phase] || { tests: [] }),
              status: 'failed',
            },
          };
          return next;
        }

        case 'test:start': {
          const existing = prev.phases[event.phase]?.tests ?? [];
          if (existing.some((t) => t.id === event.id)) return next;
          next.phases = {
            ...prev.phases,
            [event.phase]: {
              ...(prev.phases[event.phase] || { status: 'running' }),
              tests: [
                ...existing,
                {
                  id: event.id,
                  name: event.name,
                  status: 'running',
                  durationMs: 0,
                },
              ],
            },
          };
          return next;
        }

        case 'test:end': {
          const existing = prev.phases[event.phase]?.tests ?? [];
          const without = existing.filter((t) => t.id !== event.id);
          next.phases = {
            ...prev.phases,
            [event.phase]: {
              ...(prev.phases[event.phase] || { status: 'running' }),
              tests: [
                ...without,
                {
                  id: event.id,
                  name: event.name,
                  status: event.status,
                  durationMs: event.durationMs || 0,
                  error: event.error,
                  reason: event.reason,
                  notes: event.notes,
                  status_code: event.status_code,
                },
              ],
            },
          };
          return next;
        }

        case 'cleanup:start': {
          next.cleanup = [];
          return next;
        }

        case 'cleanup:step': {
          next.cleanup = [...prev.cleanup, { ok: event.ok, label: event.label }];
          return next;
        }

        case 'cleanup:end':
          return next;

        case 'run:complete': {
          next.status = 'completed';
          next.summary = event.summary;
          next.completedAt = Date.now();
          return next;
        }

        case 'run:error': {
          next.status = 'failed';
          next.error = event.error;
          next.completedAt = Date.now();
          return next;
        }

        default:
          return next;
      }
    });
  }, []);

  useEffect(() => {
    if (runState.status !== 'running' || !runState.runId) return undefined;

    const controller = new AbortController();
    abortRef.current = controller;
    let cancelled = false;

    const consume = async () => {
      try {
        const res = await apiFetch(
          `/api/admin/health-check/stream/${runState.runId}`,
          { signal: controller.signal }
        );

        if (!res.ok || !res.body) {
          throw new Error(`Stream failed: HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);

            const lines = frame.split('\n');
            const dataLines = [];
            for (const line of lines) {
              if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).trimStart());
              }
            }
            if (dataLines.length === 0) continue;
            try {
              const event = JSON.parse(dataLines.join('\n'));
              handleStreamEvent(event);
            } catch {
            }
          }
        }
      } catch (err) {
        if (!cancelled && err.name !== 'AbortError') {
          try {
            const data = await apiJson(
              `/api/admin/health-check/status/${runState.runId}`
            );
            if (data.status !== 'running') {
              setRunState((prev) => ({
                ...prev,
                status: data.status,
                summary: data.summary,
                completedAt: Date.now(),
              }));
            }
          } catch {
          }
        }
      }
    };

    consume();

    return () => {
      cancelled = true;
      try { controller.abort(); } catch { }
      abortRef.current = null;
    };
  }, [runState.status, runState.runId, handleStreamEvent]);

  useEffect(() => {
    if (runState.status !== 'running') return undefined;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [runState.status]);

  const elapsedMs = runState.startedAt
    ? (runState.completedAt ?? now) - runState.startedAt
    : 0;

  const selectedList = useMemo(() => [...(selected ?? [])], [selected]);
  const allSelected = phases.length > 0 && selectedList.length === phases.length;
  const noneSelected = selectedList.length === 0;
  const isRunning = runState.status === 'running';

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

  const handleStop = () => {
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch { }
    }
  };

  const estimatedTests = phases
    .filter((p) => selected?.has(p.id))
    .reduce((sum, p) => sum + (p.est || 0), 0);

  const totalTests = useMemo(() => {
    let n = 0;
    for (const id of Object.keys(runState.phases)) {
      n += runState.phases[id].tests.length;
    }
    return n;
  }, [runState.phases]);

  const currentPhase = useMemo(() => {
    for (const id of Object.keys(runState.phases)) {
      if (runState.phases[id].status === 'running') return id;
    }
    return null;
  }, [runState.phases]);

  const handleDownload = useCallback(() => {
    if (!runState.summary) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      runId: runState.runId,
      startedAt: runState.startedAt,
      completedAt: runState.completedAt,
      status: runState.status,
      summary: runState.summary,
      cleanup: runState.cleanup,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-check-${runState.runId || 'report'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  }, [runState]);

  const handleReset = useCallback(() => {
    setRunState(IDLE_STATE);
    setNow(0);
  }, []);


  const terminalState =
    runState.status === 'completed' || runState.status === 'failed';

  return (
    <>
      <style>{CSS}</style>
      <div className="hc-root">
        {}
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">System</span>
            <h1 className="admin-ph-title">Health Checkup</h1>
            <p className="admin-ph-sub">
              End-to-end API exercise across every route group — auth, accounts,
              trades, strategies, users, friends, chat, calendar, market data,
              GEX, admin, and SSE. Every fixture is created and destroyed in the
              same run.
            </p>
          </div>
          <div className="admin-ph-right">
            {isRunning && (
              <button
                type="button"
                className="hc-btn-danger"
                onClick={handleStop}
                title="Stop the live stream (backend run continues)"
              >
                <StopCircle size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Stop stream
              </button>
            )}
            {terminalState && (
              <button
                type="button"
                className="hc-btn-ghost"
                onClick={handleReset}
              >
                Reset
              </button>
            )}
            {terminalState && runState.summary && (
              <button
                type="button"
                className="hc-btn-ghost"
                onClick={handleDownload}
              >
                <Download size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Report
              </button>
            )}
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

        {}
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
              <div className="hc-kpi-label">
                {isRunning || terminalState ? 'Tests run' : 'Estimated tests'}
              </div>
              <div className="hc-kpi-value">
                {isRunning || terminalState ? totalTests : `~${estimatedTests}`}
              </div>
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

          {(isRunning || terminalState) && (
            <div className="hc-kpi">
              <Clock size={14} className="hc-kpi-icon" />
              <div>
                <div className="hc-kpi-label">
                  {isRunning ? 'Elapsed' : 'Duration'}
                </div>
                <div className="hc-kpi-value">
                  {(elapsedMs / 1000).toFixed(1)}
                  <span className="hc-kpi-dim">s</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {}
        {!isRunning && !terminalState && (
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
                  disabled={allSelected}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="hc-btn-ghost"
                  onClick={clearAll}
                  disabled={noneSelected}
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
                    onClick={() => toggle(p.id)}
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
        )}

        {}
        {runState.status === 'idle' && (
          <div className="hc-card hc-results-empty">
            <div className="hc-empty-icon">
              <Sparkles size={26} />
            </div>
            <h3 className="hc-empty-title">Ready to run</h3>
            <p className="hc-empty-desc">
              Pick the phases above and click <b>Run Health Check</b>. Every
              fixture is created and destroyed automatically — nothing is left
              behind in the database.
            </p>
          </div>
        )}

        {}
        {isRunning && (
          <div className="hc-card hc-results-running">
            <RefreshCw size={22} className="hc-spin" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="hc-running-title">
                Running health check
                {currentPhase && (
                  <span
                    style={{
                      marginLeft: 10,
                      color: '#8892A3',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    · {phases.find((p) => p.id === currentPhase)?.label || currentPhase}
                  </span>
                )}
              </div>
              <div className="hc-running-sub">
                Run ID <code>{runState.runId}</code> · {totalTests} test
                {totalTests === 1 ? '' : 's'} streamed
              </div>
              <div className="hc-progress-bar">
                <div
                  className="hc-progress-fill"
                  style={{
                    width: `${Math.min(100, (totalTests / Math.max(1, estimatedTests)) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <span className="hc-live">
              <span className="hc-live-dot" />
              Live
            </span>
          </div>
        )}

        {}
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

        {}
        {runState.summary && (
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
        )}

        {}
        {runState.cleanup.length > 0 && (
          <div className="hc-card">
            <div className="hc-card-head">
              <div>
                <span className="hc-card-title">Cleanup</span>
                <span className="hc-card-sub">
                  Every fixture created during this run is removed here
                </span>
              </div>
            </div>
            <div className="hc-cleanup-list">
              {runState.cleanup.map((step, i) => (
                <div
                  key={i}
                  className={`hc-cleanup-row ${step.ok ? 'ok' : 'bad'}`}
                >
                  <span className="hc-cleanup-icon" aria-hidden>
                    {step.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  </span>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {}
        {phases.length > 0 && (isRunning || terminalState) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {phases
              .filter((p) => runState.phases[p.id] != null)
              .map((p) => (
                <HealthCheckPhasePanel
                  key={p.id}
                  meta={p}
                  tests={runState.phases[p.id]?.tests ?? []}
                  status={runState.phases[p.id]?.status ?? 'pending'}
                  defaultExpanded={p.id === currentPhase}
                />
              ))}
          </div>
        )}
      </div>
    </>
  );
}