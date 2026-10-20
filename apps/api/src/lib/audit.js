
import { prisma } from './prisma.js';

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
    console.error('[audit] write failed:', err?.message || err);
  }
}