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

export async function importData(req, res, next) {
  try {
    const actor = await buildActor(req);
    const { symbol, interval, from, to } = req.body || {};
    res.json(await svc.importRange({ symbol, interval, from, to, actor }));
  } catch (e) { next(e); }
}

export async function wipe(req, res, next) {
  try {
    const actor = await buildActor(req);
    const { symbol, interval } = req.body || {};
    res.json(await svc.wipeCache({ symbol, interval, actor }));
  } catch (e) { next(e); }
}
