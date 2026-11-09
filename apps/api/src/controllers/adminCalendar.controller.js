import { prisma } from '../lib/prisma.js';
import * as svc from '../services/adminCalendar.service.js';

async function buildActor(req) {
  const u = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });
  return { id: req.userId, email: u?.email || '', role: req.userRole, req };
}

export async function listEvents(req, res, next) {
  try {
    const data = await svc.listEvents({
      page: req.query.page,
      limit: req.query.limit,
      q: req.query.q,
      currency: req.query.currency,
      impact: req.query.impact,
      from: req.query.from,
      to: req.query.to,
    });
    res.json(data);
  } catch (e) { next(e); }
}

export async function getEvent(req, res, next) {
  try {
    const event = await svc.getEvent(req.params.id);
    res.json({ event });
  } catch (e) { next(e); }
}

export async function stats(_req, res, next) {
  try {
    res.json(await svc.getStats());
  } catch (e) { next(e); }
}

export async function syncRange(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await svc.syncRange(actor, {
      from: req.body?.from,
      to: req.body?.to,
    });
    res.json(data);
  } catch (e) { next(e); }
}

export async function importEvents(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await svc.importEvents(actor, {
      rows: req.body?.rows,
      mode: req.body?.mode,
    });
    res.json(data);
  } catch (e) { next(e); }
}

export async function deleteEvents(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await svc.deleteEvents(actor, {
      ids: req.body?.ids,
      currency: req.body?.currency,
      impact: req.body?.impact,
      from: req.body?.from,
      to: req.body?.to,
      all: req.body?.all === true,
    });
    res.json(data);
  } catch (e) { next(e); }
}
