import * as svc from '../services/adminStrategies.service.js';
import { buildActor } from '../lib/buildActor.js';

export async function list(req, res, next) {
  try {
    const data = await svc.listStrategies({
      q: req.query.q,
      userId: req.query.userId,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(data);
  } catch (e) { next(e); }
}

export async function get(req, res, next) {
  try {
    const data = await svc.getStrategy(req.params.id);
    res.json({ strategy: data });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await svc.deleteStrategy(actor, req.params.id);
    res.json(data);
  } catch (e) { next(e); }
}