
import { startHealthCheck, ALL_PHASES, PHASE_META } from '../services/healthCheck/index.js';
import { getRun, subscribe } from '../services/healthCheck/runStore.js';
import { HttpError } from '../middleware/error.js';


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

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    req.socket.setNoDelay(true);
    req.socket.setKeepAlive(true);
    res.flushHeaders();

    for (const event of run.events) {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    }

    if (run.status !== 'running') {
      res.end();
      return;
    }

    const unsubscribe = subscribe(run, (event) => {
      try {
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
        if (event.type === 'run:complete' || event.type === 'run:error') {
          setTimeout(() => {
            try { res.end(); } catch { }
          }, 60);
        }
      } catch {
      }
    });

    const keepAlive = setInterval(() => {
      try { res.write(`: ping ${Date.now()}\n\n`); } catch { }
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