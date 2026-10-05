// apps/api/src/controllers/adminTrades.controller.js
import { prisma } from '../lib/prisma.js';
import * as svc from '../services/adminTrades.service.js';

async function buildActor(req) {
  const u = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });
  return { id: req.userId, email: u?.email || '', role: req.userRole, req };
}

export async function list(req, res, next) {
  try {
    const data = await svc.listTrades({
      accountId: req.query.accountId,
      userId: req.query.userId,
      from: req.query.from,
      to: req.query.to,
      symbol: req.query.symbol,
      q: req.query.q,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(data);
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await svc.deleteTrade(actor, req.params.id);
    res.json(data);
  } catch (e) { next(e); }
}

export async function removeByAccount(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await svc.deleteTradesByAccount(actor, req.params.accountId);
    res.json(data);
  } catch (e) { next(e); }
}