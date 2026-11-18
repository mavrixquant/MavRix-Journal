import * as svc from '../services/backtestSessions.service.js';

export async function list(req, res, next) {
  try {
    const sessions = await svc.listSessions(req.userId, { status: req.query.status || undefined });
    res.json({ sessions });
  } catch (e) { next(e); }
}

export async function availability(req, res, next) {
  try {
    res.json({ availability: await svc.getAvailability() });
  } catch (e) { next(e); }
}

export async function get(req, res, next) {
  try {
    res.json({ session: await svc.getSession(req.userId, req.params.id) });
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    res.status(201).json({ session: await svc.createSession(req.userId, req.body) });
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    res.json({ session: await svc.updateSession(req.userId, req.params.id, req.body) });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    res.json(await svc.deleteSession(req.userId, req.params.id));
  } catch (e) { next(e); }
}

export async function listTrades(req, res, next) {
  try {
    res.json({ trades: await svc.listTrades(req.userId, req.params.id) });
  } catch (e) { next(e); }
}

export async function createTrade(req, res, next) {
  try {
    res.status(201).json({ trade: await svc.createTrade(req.userId, req.params.id, req.body) });
  } catch (e) { next(e); }
}

export async function updateTrade(req, res, next) {
  try {
    res.json({ trade: await svc.updateTrade(req.userId, req.params.id, req.params.tradeId, req.body) });
  } catch (e) { next(e); }
}

export async function removeTrade(req, res, next) {
  try {
    res.json(await svc.deleteTrade(req.userId, req.params.id, req.params.tradeId));
  } catch (e) { next(e); }
}
