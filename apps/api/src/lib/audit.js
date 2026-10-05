// apps/api/src/lib/audit.js
//
// Fire-and-forget audit writer. Every admin mutation calls writeAudit().
//
// Design notes:
//   - Never throws. If the DB write fails, we log to stderr and move on —
//     we do not want a broken audit row to 500 an otherwise-successful action.
//   - actorId/actorEmail are denormalized (no FK) so a hard-deleted admin
//     does not erase their action history.
//   - metadata is a freeform Json blob — keep it small (< 2 KB).

import { prisma } from './prisma.js';

/**
 * @param {object}  ctx
 * @param {string}  ctx.actorId       — req.userId
 * @param {string}  ctx.actorEmail    — req.userEmail (set by requireAuth or looked up)
 * @param {string}  ctx.action        — e.g. "user.ban"
 * @param {string=} ctx.targetType    — "user" | "account" | "trade" | "setting" | "system"
 * @param {string=} ctx.targetId
 * @param {object=} ctx.metadata      — small JSON blob
 * @param {object=} ctx.req           — optional; used to pull IP + UA
 */
export async function writeAudit(ctx) {
  try {
    const {
      actorId,
      actorEmail,
      action,
      targetType = null,
      targetId = null,
      metadata = {},
      req = null,
    } = ctx;

    if (!actorId || !action) return;

    const ipAddress =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.ip ||
      req?.socket?.remoteAddress ||
      null;

    const userAgent = req?.headers?.['user-agent'] || null;

    await prisma.adminAuditLog.create({
      data: {
        actorId,
        actorEmail: actorEmail || '',
        action,
        targetType,
        targetId,
        metadata,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    // Never let audit failure break the request.
    console.error('[audit] write failed:', err?.message || err);
  }
}