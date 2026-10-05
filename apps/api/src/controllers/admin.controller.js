// apps/api/src/controllers/admin.controller.js
//
// Thin HTTP layer. Attaches `req.userId`, `req.userEmail`, `req.userRole`
// from requireAuth, and delegates everything to admin.service.js.

import { prisma } from '../lib/prisma.js';
import * as adminService from '../services/admin.service.js';
import { getSettings, updateSettings } from '../lib/settings.js';
import { writeAudit } from '../lib/audit.js';
import { getClientCount } from '../lib/broadcaster.js';

/* ------------------------------------------------------------------ */
/*  Helper — build the actor object the service expects                */
/* ------------------------------------------------------------------ */
async function buildActor(req) {
  // Resolve email once. requireAuth gives us userId + role, but not email.
  const u = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });
  return {
    id: req.userId,
    email: u?.email || '',
    role: req.userRole,
    req,
  };
}

/* ------------------------------------------------------------------ */
/*  Me                                                                 */
/* ------------------------------------------------------------------ */
export async function me(req, res, next) {
  try {
    const data = await adminService.getAdminMe(req.userId);
    res.json(data);
  } catch (e) { next(e); }
}

/* ------------------------------------------------------------------ */
/*  Stats / Health                                                     */
/* ------------------------------------------------------------------ */
export async function stats(_req, res, next) {
  try {
    const data = await adminService.getGlobalStats();
    res.json(data);
  } catch (e) { next(e); }
}

export async function health(_req, res, next) {
  try {
    const data = await adminService.getSystemHealth();
    res.json(data);
  } catch (e) { next(e); }
}

/* ------------------------------------------------------------------ */
/*  Users                                                              */
/* ------------------------------------------------------------------ */
export async function listUsers(req, res, next) {
  try {
    const data = await adminService.listUsers({
      q: req.query.q,
      role: req.query.role,
      banned: req.query.banned,
      emailVerified: req.query.emailVerified,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(data);
  } catch (e) { next(e); }
}

export async function getUser(req, res, next) {
  try {
    const data = await adminService.getUserDetail(req.params.id);
    res.json({ user: data });
  } catch (e) { next(e); }
}

export async function updateUser(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await adminService.updateUser(actor, req.params.id, req.body);
    res.json({ user: data });
  } catch (e) { next(e); }
}

export async function verifyEmail(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await adminService.verifyUserEmail(actor, req.params.id);
    res.json({ user: data });
  } catch (e) { next(e); }
}

export async function unverifyEmail(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await adminService.unverifyUserEmail(actor, req.params.id);
    res.json({ user: data });
  } catch (e) { next(e); }
}

export async function triggerPasswordReset(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await adminService.triggerUserPasswordReset(actor, req.params.id);
    res.json(data);
  } catch (e) { next(e); }
}

export async function ban(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await adminService.banUser(actor, req.params.id, req.body?.reason);
    res.json({ user: data });
  } catch (e) { next(e); }
}

export async function unban(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await adminService.unbanUser(actor, req.params.id);
    res.json({ user: data });
  } catch (e) { next(e); }
}

export async function forceLogout(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await adminService.forceLogoutUser(actor, req.params.id);
    res.json(data);
  } catch (e) { next(e); }
}

export async function removeUser(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await adminService.deleteUser(actor, req.params.id);
    res.json(data);
  } catch (e) { next(e); }
}

/* ------------------------------------------------------------------ */
/*  Sessions                                                           */
/* ------------------------------------------------------------------ */
export async function sessions(_req, res, next) {
  try {
    const data = await adminService.getActiveSessions();
    res.json(data);
  } catch (e) { next(e); }
}

export async function userSessions(req, res, next) {
  try {
    const count = await adminService.getUserSessionCount(req.params.id);
    res.json({ userId: req.params.id, clients: count });
  } catch (e) { next(e); }
}

/* ------------------------------------------------------------------ */
/*  Settings (read is admin; write is superadmin — enforced in route)  */
/* ------------------------------------------------------------------ */
export async function getSettingsCtrl(_req, res, next) {
  try {
    const data = await getSettings();
    res.json(data);
  } catch (e) { next(e); }
}

export async function updateSettingsCtrl(req, res, next) {
  try {
    const actor = await buildActor(req);
    const before = await getSettings();
    const data = await updateSettings(req.body, actor.id);

    await writeAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'settings.update',
      targetType: 'setting',
      metadata: { before, after: data },
      req,
    });

    res.json(data);
  } catch (e) { next(e); }
}