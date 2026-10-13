// apps/api/src/controllers/preferences.controller.js
//
// Thin HTTP layer for /api/users/preferences.
// `req.userId` is set by requireAuth (see routes/users.routes.js).

import * as svc from '../services/preferences.service.js';

export async function get(req, res, next) {
  try {
    const preferences = await svc.getPreferences(req.userId);
    res.json({ preferences });
  } catch (e) { next(e); }
}

export async function put(req, res, next) {
  try {
    const incoming = req.body?.preferences;
    const preferences = await svc.setPreferences(req.userId, incoming);
    res.json({ preferences });
  } catch (e) { next(e); }
}