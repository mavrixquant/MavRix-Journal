// apps/api/src/controllers/adminGex.controller.js
//
// Admin-side GEX endpoints. Follows the pattern established by
// adminAccounts.controller.js / adminTrades.controller.js:
//   - buildActor() resolves the caller's email for the audit log
//   - delegates business logic to the service
//   - passes the `req` through on the actor so writeAudit can pull IP + UA

import { prisma } from '../lib/prisma.js';
import * as svc from '../services/adminGex.service.js';

async function buildActor(req) {
  const u = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });
  return { id: req.userId, email: u?.email || '', role: req.userRole, req };
}

/* ------------------------------------------------------------------ */
/*  List                                                               */
/* ------------------------------------------------------------------ */

export async function list(_req, res, next) {
  try {
    const days = await svc.listAdminGexDays();
    res.json({ days });
  } catch (e) { next(e); }
}

/* ------------------------------------------------------------------ */
/*  Upsert                                                             */
/* ------------------------------------------------------------------ */
//
// Query params:
//   ?overwrite=true  → replace an existing day without a 409
//
// Without it, a duplicate date returns 409 with `details.existing` so the
// client can show a "this date already exists, overwrite?" confirmation.

export async function upsert(req, res, next) {
  try {
    const actor = await buildActor(req);
    const overwrite =
      req.query.overwrite === 'true' || req.query.overwrite === true;
    const day = await svc.upsertGexDay(actor, req.body, { overwrite });
    res.json({ day });
  } catch (e) { next(e); }
}

/* ------------------------------------------------------------------ */
/*  Delete (superadmin only — enforced at the route level)             */
/* ------------------------------------------------------------------ */

export async function remove(req, res, next) {
  try {
    const actor = await buildActor(req);
    const result = await svc.deleteGexDay(actor, req.params.date);
    res.json(result);
  } catch (e) { next(e); }
}