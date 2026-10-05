// apps/api/src/services/adminOps.service.js
//
// Admin operations that aren't user/account/trade CRUD:
//   - audit log read
//   - broadcast (SSE to all, optional email)
//   - active sessions + kick
//   - calendar force-sync / cache wipe / log read

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../lib/audit.js';
import { broadcastToAll, disconnectUser, getTotalClientCount } from '../lib/broadcaster.js';
import { runCalendarSyncOnce } from '../lib/calendarSync.js';
import { pushSyncLog, getSyncLogs, clearSyncLogs } from '../lib/syncLog.js';
import { sendBroadcastEmail } from '../lib/mailer.js';

/* ------------------------------------------------------------------ */
/*  Audit log read                                                     */
/* ------------------------------------------------------------------ */
export async function listAuditLog({
  actorId,
  action,
  actionPrefix,
  targetType,
  targetId,
  q,
  from,
  to,
  page = 1,
  limit = 50,
} = {}) {
  const take = Math.min(Math.max(1, Number(limit)), 200);
  const skip = (Math.max(1, Number(page)) - 1) * take;

  const where = {};
  if (actorId) where.actorId = actorId;
  if (action) where.action = action;
  if (actionPrefix) where.action = { startsWith: String(actionPrefix) };
  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;
  if (q) where.actorEmail = { contains: String(q), mode: 'insensitive' };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [rows, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return {
    entries: rows,
    total,
    page: Math.max(1, Number(page)),
    limit: take,
    pages: Math.ceil(total / take),
  };
}

/* ------------------------------------------------------------------ */
/*  Sessions                                                           */
/* ------------------------------------------------------------------ */
export async function getActiveSessions() {
  return { totalClients: getTotalClientCount() };
}

export async function disconnectUserSessions(actor, userId) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new HttpError(404, 'User not found');

  const closed = disconnectUser(userId);

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'session.disconnect',
    targetType: 'user',
    targetId: userId,
    metadata: { closedSockets: closed },
    req: actor.req,
  });

  return { ok: true, closedSockets: closed };
}

/* ------------------------------------------------------------------ */
/*  Broadcast                                                          */
/* ------------------------------------------------------------------ */
export async function broadcast(actor, { message, level = 'info', sendEmail = false }) {
  if (!message || !message.trim()) {
    throw new HttpError(400, 'message is required');
  }
  const clean = String(message).trim().slice(0, 2000);
  const cleanLevel = ['info', 'warning', 'critical'].includes(level) ? level : 'info';

  // 1. SSE to every connected client.
  const sseSent = broadcastToAll('broadcast', {
    message: clean,
    level: cleanLevel,
    ts: Date.now(),
    sentBy: actor.email,
  });

  // 2. Optional email to every non-banned verified user.
  let emailsSent = 0;
  let emailsFailed = 0;
  if (sendEmail) {
    const users = await prisma.user.findMany({
      where: { isBanned: false, emailVerified: true },
      select: { email: true },
    });
    for (const u of users) {
      try {
        await sendBroadcastEmail({ to: u.email, message: clean, level: cleanLevel });
        emailsSent++;
      } catch (err) {
        emailsFailed++;
        console.error('[admin-broadcast] email failed for', u.email, err?.message || err);
      }
    }
  }

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'broadcast.send',
    targetType: 'system',
    metadata: { message: clean, level: cleanLevel, sseSent, emailsSent, emailsFailed, sendEmail },
    req: actor.req,
  });

  return { ok: true, sseSent, emailsSent, emailsFailed };
}

/* ------------------------------------------------------------------ */
/*  Calendar                                                           */
/* ------------------------------------------------------------------ */
export async function forceCalendarSync(actor) {
  const startedAt = Date.now();
  let result = null;
  let error = null;

  try {
    result = await runCalendarSyncOnce();
  } catch (err) {
    error = err?.message || String(err);
  }

  const entry = {
    source: 'admin',
    actor: actor.email,
    elapsedMs: Date.now() - startedAt,
    ok: !error,
    result,
    error,
  };
  pushSyncLog(entry);

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'calendar.sync',
    targetType: 'system',
    metadata: { ok: !error, elapsedMs: entry.elapsedMs, error },
    req: actor.req,
  });

  if (error) throw new HttpError(500, `Calendar sync failed: ${error}`);
  return { ok: true, elapsedMs: entry.elapsedMs, result };
}

export async function wipeCalendarCache(actor) {
  const before = await prisma.economicEvent.count();
  await prisma.economicEvent.deleteMany({});

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'calendar.cache-wipe',
    targetType: 'system',
    metadata: { deleted: before },
    req: actor.req,
  });

  return { ok: true, deleted: before };
}

export function calendarSyncLogs() {
  return { entries: getSyncLogs() };
}

export function clearCalendarSyncLogs() {
  clearSyncLogs();
  return { ok: true };
}