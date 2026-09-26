import * as accountsService from '../services/accounts.service.js';

export async function list(req, res, next) {
  try {
    const accounts = await accountsService.listAccounts(req.userId);
    res.json({ accounts });
  } catch (e) { next(e); }
}

export async function get(req, res, next) {
  try {
    const account = await accountsService.getAccount(req.userId, req.params.id);
    res.json({ account });
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const account = await accountsService.createAccount(req.userId, req.body);
    res.status(201).json({ account });
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const account = await accountsService.updateAccount(req.userId, req.params.id, req.body);
    res.json({ account });
  } catch (e) { next(e); }
}

export async function updateColumnConfigs(req, res, next) {
  try {
    const account = await accountsService.updateColumnConfigs(req.userId, req.params.id, req.body.columnConfigs);
    res.json({ account });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    const result = await accountsService.deleteAccount(req.userId, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}
