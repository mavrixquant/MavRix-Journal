
import { prisma } from '../lib/prisma.js';
import * as svc from '../services/adminGex.service.js';

async function buildActor(req) {
  const u = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });
  return { id: req.userId, email: u?.email || '', role: req.userRole, req };
}


export async function list(_req, res, next) {
  try {
    const days = await svc.listAdminGexDays();
    res.json({ days });
  } catch (e) { next(e); }
}


export async function upsert(req, res, next) {
  try {
    const actor = await buildActor(req);
    const overwrite =
      req.query.overwrite === 'true' || req.query.overwrite === true;
    const day = await svc.upsertGexDay(actor, req.body, { overwrite });
    res.json({ day });
  } catch (e) { next(e); }
}


export async function remove(req, res, next) {
  try {
    const actor = await buildActor(req);
    const result = await svc.deleteGexDay(actor, req.params.date);
    res.json(result);
  } catch (e) { next(e); }
}