// apps/api/src/services/admin.service.js
//
// All admin-panel business logic. Controllers stay thin; this file owns
// every rule (self-protection, last-superadmin guard, cascade shape).

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { hashPassword } from '../lib/password.js';
import { writeAudit } from '../lib/audit.js';
import { getSettings, updateSettings } from '../lib/settings.js';
import { invalidateSvCache } from '../lib/session.js';
import { getTotalClientCount, getClientCount } from '../lib/broadcaster.js';
import {
  generateSecureToken,
  VERIFY_TTL_MS,
  RESET_TTL_MS,
} from '../lib/tokens.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../lib/mailer.js';

/* ------------------------------------------------------------------ */
/*  Public user shape                                                  */
/* ------------------------------------------------------------------ */
const adminUserShape = (u) => ({
  id: u.id,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  emailVerified: u.emailVerified,
  photoUrl: u.photoUrl,
  hasGoogle: !!u.googleId,
  role: u.role,
  isBanned: u.isBanned,
  bannedAt: u.bannedAt,
  bannedReason: u.bannedReason,
  bannedBy: u.bannedBy,
  lastLoginAt: u.lastLoginAt,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
  _count: u._count || undefined,
});

/* ------------------------------------------------------------------ */
/*  Self-protection helpers                                            */
/* ------------------------------------------------------------------ */
function assertNotSelf(actorId, targetId, verb) {
  if (actorId === targetId) {
    throw new HttpError(400, `You cannot ${verb} your own account.`);
  }
}

async function assertNotLastSuperadmin(targetId, verb) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new HttpError(404, 'User not found');
  if (target.role !== 'superadmin') return;

  const count = await prisma.user.count({ where: { role: 'superadmin' } });
  if (count <= 1) {
    throw new HttpError(
      400,
      `Cannot ${verb} the last remaining superadmin.`
    );
  }
}

/* ------------------------------------------------------------------ */
/*  /me  — capabilities                                                */
/* ------------------------------------------------------------------ */
export async function getAdminMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    capabilities: {
      canManageUsers: user.role === 'admin' || user.role === 'superadmin',
      canChangeRoles: user.role === 'superadmin',
      canDeleteUsers: user.role === 'superadmin',
      canImpersonate: user.role === 'superadmin',
      canEditSettings: user.role === 'superadmin',
      canBroadcast: true,
      canManageCalendar: true,
      canViewAudit: true,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  /stats  — global counters + 30d signup series                      */
/* ------------------------------------------------------------------ */
export async function getGlobalStats() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, verifiedUsers, bannedUsers, totalAccounts, totalTrades] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { emailVerified: true } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.account.count(),
      prisma.trade.count(),
    ]);

  const recentUsers = await prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const signups = [];
  const map = new Map();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, 0);
  }
  for (const u of recentUsers) {
    const key = u.createdAt.toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, map.get(key) + 1);
  }
  for (const [date, count] of map.entries()) signups.push({ date, count });

  return {
    users: { total: totalUsers, verified: verifiedUsers, banned: bannedUsers },
    accounts: { total: totalAccounts },
    trades: { total: totalTrades },
    signups,
  };
}

/* ------------------------------------------------------------------ */
/*  /health — process + infra state                                    */
/* ------------------------------------------------------------------ */
export async function getSystemHealth() {
  const startedAt = process.uptime();
  let dbOk = true;
  let dbErr = null;
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbOk = false;
    dbErr = err.message;
  }
  const dbLatencyMs = Date.now() - t0;

  const mem = process.memoryUsage();

  return {
    status: dbOk ? 'ok' : 'degraded',
    uptimeSeconds: Math.floor(startedAt),
    nodeVersion: process.version,
    memory: {
      rssMb: +(mem.rss / 1024 / 1024).toFixed(1),
      heapUsedMb: +(mem.heapUsed / 1024 / 1024).toFixed(1),
      heapTotalMb: +(mem.heapTotal / 1024 / 1024).toFixed(1),
    },
    database: { ok: dbOk, latencyMs: dbLatencyMs, error: dbErr },
    sse: { totalClients: getTotalClientCount() },
  };
}

/* ------------------------------------------------------------------ */
/*  Users — list / detail                                              */
/* ------------------------------------------------------------------ */
export async function listUsers({
  q = '',
  role,
  banned,
  emailVerified,
  page = 1,
  limit = 25,
} = {}) {
  const take = Math.min(Math.max(1, Number(limit)), 100);
  const skip = (Math.max(1, Number(page)) - 1) * take;

  const where = {};
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (role) where.role = role;
  if (banned === 'true' || banned === true) where.isBanned = true;
  if (banned === 'false' || banned === false) where.isBanned = false;
  if (emailVerified === 'true' || emailVerified === true)
    where.emailVerified = true;
  if (emailVerified === 'false' || emailVerified === false)
    where.emailVerified = false;

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        photoUrl: true,
        googleId: true,
        role: true,
        isBanned: true,
        bannedAt: true,
        bannedReason: true,
        bannedBy: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { accounts: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: rows.map(adminUserShape),
    total,
    page: Math.max(1, Number(page)),
    limit: take,
    pages: Math.ceil(total / take),
  };
}

export async function getUserDetail(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: { select: { accounts: true } },
      accounts: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          type: true,
          currency: true,
          balance: true,
          createdAt: true,
          _count: { select: { trades: true } },
        },
      },
    },
  });
  if (!user) throw new HttpError(404, 'User not found');

  const tradeCount = await prisma.trade.count({
    where: { account: { userId } },
  });

  const shaped = adminUserShape(user);
  shaped.tradeCount = tradeCount;
  shaped.accounts = user.accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    currency: a.currency,
    balance: a.balance,
    createdAt: a.createdAt,
    tradeCount: a._count.trades,
  }));

  return shaped;
}

/* ------------------------------------------------------------------ */
/*  Users — mutations                                                  */
/* ------------------------------------------------------------------ */
export async function updateUser(actor, targetId, patch) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new HttpError(404, 'User not found');

  const data = {};

  if (patch.email !== undefined) {
    const next = String(patch.email).trim().toLowerCase();
    if (!next) throw new HttpError(400, 'Email cannot be empty');
    if (next !== target.email) {
      const clash = await prisma.user.findUnique({ where: { email: next } });
      if (clash) throw new HttpError(409, 'Email already in use');
      data.email = next;
      data.emailVerified = false;
      data.verifyToken = generateSecureToken();
      data.verifyTokenExpiry = new Date(Date.now() + VERIFY_TTL_MS);
    }
  }

  if (patch.firstName !== undefined) data.firstName = String(patch.firstName).trim();
  if (patch.lastName !== undefined) data.lastName = String(patch.lastName).trim();

  if (patch.role !== undefined) {
    if (actor.role !== 'superadmin') {
      throw new HttpError(403, 'Only superadmins can change roles');
    }
    const next = String(patch.role);
    if (!['user', 'admin', 'superadmin'].includes(next)) {
      throw new HttpError(400, 'Invalid role');
    }
    if (next !== target.role) {
      // If demoting the last superadmin, refuse.
      if (target.role === 'superadmin' && next !== 'superadmin') {
        await assertNotLastSuperadmin(targetId, 'demote');
      }
      data.role = next;
      // Role change kills all sessions — refresh tokens die too.
      data.tokenVersion = { increment: 1 };
    }
  }

  if (Object.keys(data).length === 0) {
    return getUserDetail(targetId);
  }

  await prisma.user.update({ where: { id: targetId }, data });
  invalidateSvCache(targetId);

  // If email changed, send a fresh verification email.
  if (data.email) {
    const fresh = await prisma.user.findUnique({ where: { id: targetId } });
    await sendVerificationEmail({
      to: fresh.email,
      token: fresh.verifyToken,
    });
  }

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'user.update',
    targetType: 'user',
    targetId,
    metadata: { patch, previous: { role: target.role, email: target.email } },
    req: actor.req,
  });

  return getUserDetail(targetId);
}

export async function verifyUserEmail(actor, targetId) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new HttpError(404, 'User not found');

  await prisma.user.update({
    where: { id: targetId },
    data: { emailVerified: true, verifyToken: null, verifyTokenExpiry: null },
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'user.verify-email',
    targetType: 'user',
    targetId,
    req: actor.req,
  });

  return getUserDetail(targetId);
}

export async function unverifyUserEmail(actor, targetId) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new HttpError(404, 'User not found');

  const verifyToken = generateSecureToken();
  const verifyTokenExpiry = new Date(Date.now() + VERIFY_TTL_MS);

  await prisma.user.update({
    where: { id: targetId },
    data: { emailVerified: false, verifyToken, verifyTokenExpiry },
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'user.unverify-email',
    targetType: 'user',
    targetId,
    req: actor.req,
  });

  return getUserDetail(targetId);
}

export async function triggerUserPasswordReset(actor, targetId) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new HttpError(404, 'User not found');

  const resetToken = generateSecureToken();
  const resetTokenExpiry = new Date(Date.now() + RESET_TTL_MS);

  await prisma.user.update({
    where: { id: targetId },
    data: { resetToken, resetTokenExpiry },
  });

  await sendPasswordResetEmail({ to: target.email, token: resetToken });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'user.password-reset',
    targetType: 'user',
    targetId,
    req: actor.req,
  });

  return { ok: true };
}

export async function banUser(actor, targetId, reason) {
  assertNotSelf(actor.id, targetId, 'ban');
  await assertNotLastSuperadmin(targetId, 'ban');

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new HttpError(404, 'User not found');
  if (target.isBanned) return getUserDetail(targetId); // idempotent

  await prisma.user.update({
    where: { id: targetId },
    data: {
      isBanned: true,
      bannedAt: new Date(),
      bannedReason: reason ? String(reason).slice(0, 500) : null,
      bannedBy: actor.id,
      tokenVersion: { increment: 1 },
    },
  });
  invalidateSvCache(targetId);

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'user.ban',
    targetType: 'user',
    targetId,
    metadata: { reason: reason || null },
    req: actor.req,
  });

  return getUserDetail(targetId);
}

export async function unbanUser(actor, targetId) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new HttpError(404, 'User not found');
  if (!target.isBanned) return getUserDetail(targetId); // idempotent

  await prisma.user.update({
    where: { id: targetId },
    data: {
      isBanned: false,
      bannedAt: null,
      bannedReason: null,
      bannedBy: null,
    },
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'user.unban',
    targetType: 'user',
    targetId,
    req: actor.req,
  });

  return getUserDetail(targetId);
}

export async function forceLogoutUser(actor, targetId) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new HttpError(404, 'User not found');

  await prisma.user.update({
    where: { id: targetId },
    data: { tokenVersion: { increment: 1 } },
  });
  invalidateSvCache(targetId);

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'user.force-logout',
    targetType: 'user',
    targetId,
    req: actor.req,
  });

  return { ok: true };
}

export async function deleteUser(actor, targetId) {
  if (actor.role !== 'superadmin') {
    throw new HttpError(403, 'Only superadmins can delete users');
  }
  assertNotSelf(actor.id, targetId, 'delete');
  await assertNotLastSuperadmin(targetId, 'delete');

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new HttpError(404, 'User not found');

  await prisma.user.delete({ where: { id: targetId } });
  invalidateSvCache(targetId);

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'user.delete',
    targetType: 'user',
    targetId,
    metadata: { deletedEmail: target.email, role: target.role },
    req: actor.req,
  });

  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Sessions (SSE)                                                     */
/* ------------------------------------------------------------------ */
export async function getActiveSessions() {
  return {
    totalClients: getTotalClientCount(),
  };
}

export async function getUserSessionCount(userId) {
  return getClientCount(userId);
}