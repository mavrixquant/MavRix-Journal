import * as tradesService from '../services/trades.service.js';

export async function list(req, res, next) {
  try {
    const trades = await tradesService.listTrades(req.userId, {
      accountId: req.query.accountId,
      strategyId: req.query.strategyId,
    });
    res.json({ trades });
  } catch (e) { next(e); }
}

export async function get(req, res, next) {
  try {
    const trade = await tradesService.getTrade(req.userId, req.params.id);
    res.json({ trade });
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const trade = await tradesService.createTrade(req.userId, req.body);
    res.status(201).json({ trade });
  } catch (e) { next(e); }
}

export async function bulkCreate(req, res, next) {
  try {
    const result = await tradesService.bulkCreateTrades(req.userId, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const trade = await tradesService.updateTrade(req.userId, req.params.id, req.body);
    res.json({ trade });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    const result = await tradesService.deleteTrade(req.userId, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}

export async function removeByAccount(req, res, next) {
  try {
    const result = await tradesService.deleteTradesByAccount(req.userId, req.params.accountId);
    res.json(result);
  } catch (e) { next(e); }
}

export async function addColumn(req, res, next) {
  try {
    const result = await tradesService.addCustomColumn(req.userId, req.params.accountId, req.body.name);
    res.json(result);
  } catch (e) { next(e); }
}

export async function deleteColumn(req, res, next) {
  try {
    const result = await tradesService.deleteCustomColumn(req.userId, req.params.accountId, req.params.name);
    res.json(result);
  } catch (e) { next(e); }
}

export async function renameColumn(req, res, next) {
  try {
    const result = await tradesService.renameCustomColumn(
      req.userId,
      req.params.accountId,
      req.params.name,
      req.body.newName
    );
    res.json(result);
  } catch (e) { next(e); }
}

// ---------- Value-level operations ----------

export async function renameColumnValue(req, res, next) {
  try {
    const result = await tradesService.renameColumnValue(
      req.userId,
      req.params.accountId,
      req.params.name,
      req.body
    );
    res.json(result);
  } catch (e) { next(e); }
}

export async function clearColumnValue(req, res, next) {
  try {
    const result = await tradesService.clearColumnValue(
      req.userId,
      req.params.accountId,
      req.params.name,
      req.body
    );
    res.json(result);
  } catch (e) { next(e); }
}