// apps/api/src/controllers/strategies.controller.js
import * as svc from '../services/strategies.service.js';

export async function list(req, res, next) {
  try {
    const strategies = await svc.listStrategies(req.userId, {
      status: req.query.status,
    });
    res.json({ strategies });
  } catch (e) { next(e); }
}

export async function get(req, res, next) {
  try {
    const strategy = await svc.getStrategy(req.userId, req.params.id);
    res.json({ strategy });
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const strategy = await svc.createStrategy(req.userId, req.body);
    res.status(201).json({ strategy });
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const strategy = await svc.updateStrategy(req.userId, req.params.id, req.body);
    res.json({ strategy });
  } catch (e) { next(e); }
}

export async function archive(req, res, next) {
  try {
    const strategy = await svc.archiveStrategy(req.userId, req.params.id);
    res.json({ strategy });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    const result = await svc.deleteStrategy(req.userId, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}