import * as svc from '../services/marketDataImport.service.js';
import { buildActor } from '../lib/buildActor.js';

export async function stats(_req, res, next) {
  try { res.json(await svc.getStats()); } catch (e) { next(e); }
}

// New simplified import: symbol + date range → all intervals
export async function startJob(req, res, next) {
  try {
    const actor = await buildActor(req);
    const { symbol, from, to, dryRun } = req.body || {};
    const result = await svc.startImportJob({ symbol, from, to, dryRun, actor });
    res.status(202).json(result);
  } catch (e) { next(e); }
}

export async function listJobs(req, res, next) {
  try {
    const jobs = await svc.listJobs({ limit: req.query.limit });
    res.json({ jobs });
  } catch (e) { next(e); }
}

export async function getJob(req, res, next) {
  try {
    const job = await svc.getJob(req.params.id);
    res.json(job);
  } catch (e) { next(e); }
}

// Chunks endpoint — returns child interval jobs in the chunk format
// the ImportChunksModal expects (index, range, status, fetched, inserted...)
export async function getChunks(req, res, next) {
  try {
    const job = await svc.getJob(req.params.id);
    const children = job.children || [];

    // Sort by SUPPORTED_INTERVALS order: 1m, 5m, 15m, 1h, 4h, 1d
    const intervalOrder = ['1m', '5m', '15m', '1h', '4h', '1d'];
    const sortedChildren = [...children].sort((a, b) => {
      const ai = intervalOrder.indexOf(a.interval);
      const bi = intervalOrder.indexOf(b.interval);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const chunks = sortedChildren.map((c, i) => ({
      id: c.id,
      index: i,
      interval: c.interval,
      fromTime: c.fromTime,
      toTime: c.toTime,
      // Normalize 'completed' -> 'succeeded' for modal STATUS_META
      status: c.status === 'completed' ? 'succeeded' : c.status,
      attempt: c.attempt || 0,
      fetched: c.fetched,
      inserted: c.inserted,
      error: c.lastError,
      startedAt: c.startedAt,
      finishedAt: c.finishedAt,
    }));
    res.json({
      chunks,
      total: chunks.length,
      job: job.parent,
    });
  } catch (e) { next(e); }
}

export async function stopJob(req, res, next) {
  try {
    const actor = await buildActor(req);
    const result = await svc.stopJob(req.params.id, actor);
    res.status(202).json(result);
  } catch (e) { next(e); }
}

export async function wipe(req, res, next) {
  try {
    const actor = await buildActor(req);
    const { symbol, interval } = req.body || {};
    res.json(await svc.wipeCache({ symbol, interval, actor }));
  } catch (e) { next(e); }
}
