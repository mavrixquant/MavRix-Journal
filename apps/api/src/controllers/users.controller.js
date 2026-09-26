import * as usersService from '../services/users.service.js';

export async function listLayouts(req, res, next) {
  try {
    const result = await usersService.listLayouts(req.userId);
    res.json(result);
  } catch (e) { next(e); }
}

export async function createLayout(req, res, next) {
  try {
    const layout = await usersService.createLayout(req.userId, req.body);
    res.status(201).json({ layout });
  } catch (e) { next(e); }
}

export async function updateLayout(req, res, next) {
  try {
    const layout = await usersService.updateLayout(
      req.userId,
      req.params.id,
      req.body
    );
    res.json({ layout });
  } catch (e) { next(e); }
}

export async function activateLayout(req, res, next) {
  try {
    const result = await usersService.activateLayout(req.userId, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}

export async function deleteLayout(req, res, next) {
  try {
    const result = await usersService.deleteLayout(req.userId, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}