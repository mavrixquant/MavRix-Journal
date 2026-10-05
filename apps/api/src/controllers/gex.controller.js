// apps/api/src/controllers/gex.controller.js
//
// User-side GEX endpoints. Thin HTTP layer — auth is applied at the router
// level (requireAuth), so `req.userId` is guaranteed here.

import * as gexService from '../services/gex.service.js';

export async function list(_req, res, next) {
  try {
    const days = await gexService.listGexDays();
    res.json({ days });
  } catch (e) { next(e); }
}

export async function get(req, res, next) {
  try {
    const day = await gexService.getGexDay(req.params.date);
    res.json({ day });
  } catch (e) { next(e); }
}