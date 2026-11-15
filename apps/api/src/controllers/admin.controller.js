import { prisma } from '../lib/prisma.js';
import * as adminService from '../services/admin.service.js';
import { getSettings, updateSettings } from '../lib/settings.js';
import { writeAudit } from '../lib/audit.js';
import { broadcastToAll } from '../lib/broadcaster.js';

async function buildActor(req) {
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

export async function me(req, res, next) { /* unchanged */ try { res.json(await adminService.getAdminMe(req.userId)); } catch (e) { next(e); } }
export async function stats(_req, res, next) { try { res.json(await adminService.getGlobalStats()); } catch (e) { next(e); } }
export async function health(_req, res, next) { try { res.json(await adminService.getSystemHealth()); } catch (e) { next(e); } }

export async function listUsers(req, res, next) {
  try {
    res.json(await adminService.listUsers({
      q: req.query.q,
      role: req.query.role,
      banned: req.query.banned,
      emailVerified: req.query.emailVerified,
      page: req.query.page,
      limit: req.query.limit,
    }));
  } catch (e) { next(e); }
}

export async function getUser(req, res, next) {
  try { res.json({ user: await adminService.getUserDetail(req.params.id) }); }
  catch (e) { next(e); }
}

export async function updateUser(req, res, next) {
  try {
    const actor = await buildActor(req);
    res.json({ user: await adminService.updateUser(actor, req.params.id, req.body) });
  } catch (e) { next(e); }
}

export async function verifyEmail(req, res, next) {
  try {
    const actor = await buildActor(req);
    res.json({ user: await adminService.verifyUserEmail(actor, req.params.id) });
  } catch (e) { next(e); }
}

export async function unverifyEmail(req, res, next) {
  try {
    const actor = await buildActor(req);
    res.json({ user: await adminService.unverifyUserEmail(actor, req.params.id) });
  } catch (e) { next(e); }
}

export async function triggerPasswordReset(req, res, next) {
  try {
    const actor = await buildActor(req);
    res.json(await adminService.triggerUserPasswordReset(actor, req.params.id));
  } catch (e) { next(e); }
}

export async function ban(req, res, next) {
  try {
    const actor = await buildActor(req);
    res.json({ user: await adminService.banUser(actor, req.params.id, req.body?.reason) });
  } catch (e) { next(e); }
}

export async function unban(req, res, next) {
  try {
    const actor = await buildActor(req);
    res.json({ user: await adminService.unbanUser(actor, req.params.id) });
  } catch (e) { next(e); }
}

export async function forceLogout(req, res, next) {
  try {
    const actor = await buildActor(req);
    res.json(await adminService.forceLogoutUser(actor, req.params.id));
  } catch (e) { next(e); }
}

export async function removeUser(req, res, next) {
  try {
    const actor = await buildActor(req);
    res.json(await adminService.deleteUser(actor, req.params.id));
  } catch (e) { next(e); }
}

export async function sessions(_req, res, next) {
  try { res.json(await adminService.getActiveSessions()); }
  catch (e) { next(e); }
}

export async function userSessions(req, res, next) {
  try {
    res.json({ userId: req.params.id, clients: await adminService.getUserSessionCount(req.params.id) });
  } catch (e) { next(e); }
}

export async function getSettingsCtrl(_req, res, next) {
  try { res.json(await getSettings()); }
  catch (e) { next(e); }
}

// FIXED 2026-11-15 — broadcast a maintenance update when the mode flips so
// every connected client re-queries /api/system/status immediately
// (instead of waiting up to 30s for the next poll tick).
export async function updateSettingsCtrl(req, res, next) {
  try {
    const actor = await buildActor(req);
    const before = await getSettings();
    const data = await updateSettings(req.body, actor.id);

    if (before.maintenanceMode !== data.maintenanceMode) {
      try {
        broadcastToAll('maintenance:update', {
          active: !!data.maintenanceMode,
          message: data.maintenanceMessage || '',
          ts: Date.now(),
        });
      } catch (err) {
        console.warn('[admin] maintenance broadcast failed:', err?.message || err);
      }
    }

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