// apps/api/src/controllers/adminOps.controller.js
import { prisma } from '../lib/prisma.js';
import * as svc from '../services/adminOps.service.js';

async function buildActor(req) {
  const u = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });
  return { id: req.userId, email: u?.email || '', role: req.userRole, req };
}

/* ---------------- Audit ---------------- */
export async function audit(req, res, next) {
  try {
    const data = await svc.listAuditLog({
      actorId: req.query.actorId,
      action: req.query.action,
      actionPrefix: req.query.actionPrefix,
      targetType: req.query.targetType,
      targetId: req.query.targetId,
      q: req.query.q,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(data);
  } catch (e) { next(e); }
}

/* ---------------- Sessions ---------------- */
export async function sessions(_req, res, next) {
  try {
    res.json(await svc.getActiveSessions());
  } catch (e) { next(e); }
}

export async function kickSession(req, res, next) {
  try {
    const actor = await buildActor(req);
    res.json(await svc.disconnectUserSessions(actor, req.params.id));
  } catch (e) { next(e); }
}

/* ---------------- Broadcast ---------------- */
export async function broadcast(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await svc.broadcast(actor, {
      message: req.body?.message,
      level: req.body?.level,
      sendEmail: !!req.body?.sendEmail,
    });
    res.json(data);
  } catch (e) { next(e); }
}

/* ---------------- Calendar ---------------- */
export async function calendarSync(req, res, next) {
  try {
    const actor = await buildActor(req);
    res.json(await svc.forceCalendarSync(actor));
  } catch (e) { next(e); }
}

export async function calendarWipe(req, res, next) {
  try {
    const actor = await buildActor(req);
    res.json(await svc.wipeCalendarCache(actor));
  } catch (e) { next(e); }
}

export async function calendarLogs(_req, res, next) {
  try {
    res.json(svc.calendarSyncLogs());
  } catch (e) { next(e); }
}