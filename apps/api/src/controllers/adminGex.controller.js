import * as svc from '../services/adminGex.service.js';
import { buildActor } from '../lib/buildActor.js';


export async function list(req, res, next) {
  try {
    const days = await svc.listAdminGexDays(req.query.symbol);
    res.json({ days });
  } catch (e) { next(e); }
}


export async function get(req, res, next) {
  try {
    const day = await svc.getAdminGexDay(req.params.date, req.query.symbol);
    res.json({ day });
  } catch (e) { next(e); }
}


export async function download(req, res, next) {
  try {
    const symbol = req.query.symbol;
    const scope = req.query.scope === 'all' ? 'all' : 'symbol';
    const format = req.query.format || 'json';

    const result = await svc.exportAdminGex(symbol, { scope, format });

    const safeFormat = (result.filename.split('.').pop() || 'json');
    const safeSymbol = String(symbol || 'all').toUpperCase();
    res.setHeader('Content-Type', result.mime);
    res.setHeader('Content-Disposition',
      `attachment; filename="${safeSymbol}-gex-${safeFormat}"`);
    res.setHeader('X-Suggested-Filename', result.filename);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(result.content);
  } catch (e) { next(e); }
}


export async function upsert(req, res, next) {
  try {
    const actor = await buildActor(req);
    const overwrite =
      req.query.overwrite === 'true' || req.query.overwrite === true;
    const day = await svc.upsertGexDay(actor, req.body, { overwrite });
    res.json({ day });
  } catch (e) { next(e); }
}


export async function remove(req, res, next) {
  try {
    const actor = await buildActor(req);
    const result = await svc.deleteGexDay(
      actor,
      req.params.date,
      req.query.symbol
    );
    res.json(result);
  } catch (e) { next(e); }
}