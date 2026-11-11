import * as svc from '../services/strategies.service.js';

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    next(e);
  }
};

export const list = wrap(async (req, res) => {
  res.json({ strategies: await svc.listStrategies(req.userId, { status: req.query.status }) });
});

export const overview = wrap(async (req, res) => {
  res.json(await svc.getOverview(req.userId, req.filters));
});

export const get = wrap(async (req, res) => {
  res.json({ strategy: await svc.getStrategy(req.userId, req.params.id) });
});

export const performance = wrap(async (req, res) => {
  res.json(await svc.getPerformance(req.userId, req.params.id, req.filters));
});

export const create = wrap(async (req, res) => {
  res.status(201).json({ strategy: await svc.createStrategy(req.userId, req.body) });
});

export const update = wrap(async (req, res) => {
  res.json({ strategy: await svc.updateStrategy(req.userId, req.params.id, req.body) });
});

export const archive = wrap(async (req, res) => {
  res.json({ strategy: await svc.archiveStrategy(req.userId, req.params.id) });
});

export const duplicate = wrap(async (req, res) => {
  res.status(201).json({ strategy: await svc.duplicateStrategy(req.userId, req.params.id) });
});

export const remove = wrap(async (req, res) => {
  res.json(await svc.deleteStrategy(req.userId, req.params.id));
});
