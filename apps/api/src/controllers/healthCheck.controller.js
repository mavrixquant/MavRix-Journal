// apps/api/src/controllers/healthCheck.controller.js
//
// Endpoints (mounted under /api/admin/health-check, superadmin-only):
//   GET  /phases            — list selectable phases + metadata
//   POST /run               — start a run (body: { phases?: string[] })
//   GET  /stream/:runId     — SSE stream of every event
//   GET  /status/:runId     — final summary (used as a fallback)

import { startHealthCheck, ALL_PHASES, PHASE_META } from '../services/healthCheck/index.js';
import { getRun, subscribe } from '../services/healthCheck/runStore.js';
import { HttpError } from '../middleware/error.js';

/* ------------------------------------------------------------------ */

export function listPhases(_req, res) {
  res.json({
    phases: ALL_PHASES.map((id) => ({
      id,
      ...PHASE_META[id],
    })),
  });
}

export function start(req, res, next) {
  try {
    const { phases } = req.body || {};
    const run = startHealthCheck({ phases, requestedBy: req.userId });
    res.status(202).json({ runId: run.id, phases: run.phases });
  } catch (err) {
    next(err);
  }
}

export function status(req, res, next) {
  try {
    const run = getRun(req.params.runId);
    if (!run) throw new HttpError(404, 'Run not found or expired');
    res.json({
      runId: run.id,
      status: run.status,
      phases: run.phases,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      summary: run.summary,
    });
  } catch (err) {
    next(err);
  }
}

export function stream(req, res, next) {
  try {
    const run = getRun(req.params.runId);
    if (!run) throw new HttpError(404, 'Run not found or expired');

    // --- SSE headers (before any byte is written) ---
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    req.socket.setNoDelay(true);
    req.socket.setKeepAlive(true);
    res.flushHeaders();

    // --- Replay buffered events ---
    for (const event of run.events) {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    }

    // Already done? Close immediately.
    if (run.status !== 'running') {
      res.end();
      return;
    }

    // --- Live subscription ---
    const unsubscribe = subscribe(run, (event) => {
      try {
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
        if (event.type === 'run:complete' || event.type === 'run:error') {
          setTimeout(() => {
            try { res.end(); } catch { /* noop */ }
          }, 60);
        }
      } catch {
        // Dead socket — 'close' handler below cleans up.
      }
    });

    // --- Keep-alive comments so proxies don't kill idle connections ---
    const keepAlive = setInterval(() => {
      try { res.write(`: ping ${Date.now()}\n\n`); } catch { /* noop */ }
    }, 25_000);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearInterval(keepAlive);
      unsubscribe();
    };

    res.on('close', cleanup);
    res.on('error', cleanup);
  } catch (err) {
    next(err);
  }
}