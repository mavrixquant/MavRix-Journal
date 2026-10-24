import { prisma } from '../lib/prisma.js';
import * as svc from '../services/adminMarketData.service.js';

async function buildActor(req) {
  const u = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });
  return { id: req.userId, email: u?.email || '', role: req.userRole, req };
}

export async function stats(_req, res, next) {
  try { res.json(await svc.getStats()); } catch (e) { next(e); }
}

// 202 Accepted — the actual work runs async; poll GET /jobs/:id or /jobs.
export async function startJob(req, res, next) {
  try {
    const actor = await buildActor(req);
    const { symbol, interval, from, to } = req.body || {};
    const result = await svc.startImportJob({ symbol, interval, from, to, actor });
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
    res.json({ job });
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
