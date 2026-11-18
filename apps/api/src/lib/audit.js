
import { prisma } from './prisma.js';

const CRITICAL_ACTIONS = new Set([
  'user.delete',
  'user.ban',
  'user.unban',
  'user.force-logout',
  'settings.update',
  'calendar.cache-wipe',
  'calendar.wipe',
  'calendar.delete',
  'market-data.wipe',
  'strategy.delete',
  'account.delete',
  'account.reassign',
  'group.delete',
  'bug-report.delete',
  'release.delete',
]);

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

    // FIXED 2026-11-18 — for critical mutating actions, make audit failure
    // observable. In production, these should be alerted on.
    if (CRITICAL_ACTIONS.has(ctx?.action)) {
      // In a real deployment this would push to your alerting system
      console.error('[AUDIT ALERT] Critical action audit failed:', {
        action: ctx?.action,
        actorId: ctx?.actorId,
        error: err?.message || err,
        timestamp: new Date().toISOString(),
      });

      // Optionally fail the operation for the most critical actions:
      // if (CRITICAL_ACTIONS.has(ctx?.action) && ['user.delete', 'settings.update'].includes(ctx?.action)) {
      //   throw new Error('Audit persistence required for this operation');
      // }
    }
  }
}