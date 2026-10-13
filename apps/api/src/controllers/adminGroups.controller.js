// apps/api/src/controllers/adminGroups.controller.js
//
// Thin HTTP layer for admin group management. Follows the pattern set by
// adminStrategies.controller.js and adminGex.controller.js: buildActor()
// resolves the caller's email for audit logs, then delegates to the service.

import { prisma } from '../lib/prisma.js';
import * as svc from '../services/adminGroups.service.js';

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

export async function list(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await svc.listGroups(actor, {
      q: req.query.q,
      visibility: req.query.visibility,
      createdById: req.query.createdById,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(data);
  } catch (e) { next(e); }
}

/* ------------------------------------------------------------------ */
/*  Detail                                                             */
/* ------------------------------------------------------------------ */

export async function get(req, res, next) {
  try {
    const actor = await buildActor(req);
    const group = await svc.getGroup(actor, req.params.id);
    res.json({ group });
  } catch (e) { next(e); }
}

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */

export async function create(req, res, next) {
  try {
    const actor = await buildActor(req);
    const group = await svc.createGroup(actor, req.body);
    res.status(201).json({ group });
  } catch (e) { next(e); }
}

/* ------------------------------------------------------------------ */
/*  Update                                                             */
/* ------------------------------------------------------------------ */

export async function update(req, res, next) {
  try {
    const actor = await buildActor(req);
    const group = await svc.updateGroup(actor, req.params.id, req.body);
    res.json({ group });
  } catch (e) { next(e); }
}

/* ------------------------------------------------------------------ */
/*  Delete                                                             */
/* ------------------------------------------------------------------ */

export async function remove(req, res, next) {
  try {
    const actor = await buildActor(req);
    const result = await svc.deleteGroup(actor, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}

/* ------------------------------------------------------------------ */
/*  Members                                                            */
/* ------------------------------------------------------------------ */

export async function addMember(req, res, next) {
  try {
    const actor = await buildActor(req);
    const result = await svc.addGroupMember(
      actor,
      req.params.id,
      req.body.userId
    );
    res.json(result);
  } catch (e) { next(e); }
}

export async function removeMember(req, res, next) {
  try {
    const actor = await buildActor(req);
    const result = await svc.removeGroupMember(
      actor,
      req.params.id,
      req.params.userId
    );
    res.json(result);
  } catch (e) { next(e); }
}

export async function setMemberRole(req, res, next) {
  try {
    const actor = await buildActor(req);
    const result = await svc.setGroupMemberRole(
      actor,
      req.params.id,
      req.params.userId,
      req.body.role
    );
    res.json(result);
  } catch (e) { next(e); }
}