import { prisma } from '../lib/prisma.js';
import * as svc from '../services/releases.service.js';

async function buildActor(req) {
  const u = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });
  return { id: req.userId, email: u?.email || '', role: req.userRole, req };
}

export async function list(_req, res, next) {
  try { res.json({ releases: await svc.listAll() }); }
  catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const actor = await buildActor(req);
    const publish = !!req.body?.publish;
    const release = await svc.createRelease(actor, req.body, { publish });
    res.status(201).json({ release });
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const actor = await buildActor(req);
    const release = await svc.updateRelease(actor, req.params.id, req.body);
    res.json({ release });
  } catch (err) { next(err); }
}

export async function publish(req, res, next) {
  try {
    const actor = await buildActor(req);
    const release = await svc.publishRelease(actor, req.params.id);
    res.json({ release });
  } catch (err) { next(err); }
}

export async function rebroadcast(req, res, next) {
  try {
    const actor = await buildActor(req);
    const result = await svc.rebroadcastRelease(actor, req.params.id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function unpublish(req, res, next) {
  try {
    const actor = await buildActor(req);
    const release = await svc.unpublishRelease(actor, req.params.id);
    res.json({ release });
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const actor = await buildActor(req);
    const result = await svc.deleteRelease(actor, req.params.id);
    res.json(result);
  } catch (err) { next(err); }
}
