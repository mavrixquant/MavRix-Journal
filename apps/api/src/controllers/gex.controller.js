import * as gexService from '../services/gex.service.js';

export async function list(req, res, next) {
  try {
    const days = await gexService.listGexDays(req.query.symbol);
    res.json({ days });
  } catch (e) { next(e); }
}

export async function get(req, res, next) {
  try {
    const day = await gexService.getGexDay(req.params.date, req.query.symbol);
    res.json({ day });
  } catch (e) { next(e); }
}