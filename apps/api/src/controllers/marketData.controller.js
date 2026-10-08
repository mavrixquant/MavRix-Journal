// apps/api/src/controllers/marketData.controller.js
//
// Thin HTTP layer. Auth is applied at the router level, so `req.userId`
// is guaranteed here.

import * as svc from '../services/marketData.service.js';

export async function catalog(_req, res, next) {
  try {
    res.json(svc.listCatalog());
  } catch (e) { next(e); }
}

export async function bars(req, res, next) {
  try {
    const { symbol, interval, range } = req.query;
    const result = await svc.fetchBars({ symbol, interval, range });
    res.json(result);
  } catch (e) { next(e); }
}

export async function quote(req, res, next) {
  try {
    const { symbol } = req.query;
    const result = await svc.fetchQuote({ symbol });
    res.json(result);
  } catch (e) { next(e); }
}