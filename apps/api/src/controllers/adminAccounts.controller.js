// apps/api/src/controllers/adminAccounts.controller.js
import { prisma } from '../lib/prisma.js';
import * as svc from '../services/adminAccounts.service.js';

async function buildActor(req) {
  const u = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });
  return { id: req.userId, email: u?.email || '', role: req.userRole, req };
}

export async function list(req, res, next) {
  try {
    const data = await svc.listAccounts({
      q: req.query.q,
      userId: req.query.userId,
      type: req.query.type,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(data);
  } catch (e) { next(e); }
}

export async function get(req, res, next) {
  try {
    const data = await svc.getAccount(req.params.id);
    res.json({ account: data });
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await svc.updateAccount(actor, req.params.id, req.body);
    res.json({ account: data });
  } catch (e) { next(e); }
}

export async function reassign(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await svc.reassignAccount(actor, req.params.id, req.body?.newUserId);
    res.json({ account: data });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await svc.deleteAccount(actor, req.params.id);
    res.json(data);
  } catch (e) { next(e); }
}