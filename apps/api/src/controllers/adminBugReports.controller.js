import * as svc from '../services/adminBugReports.service.js';
import { buildActor } from '../lib/buildActor.js';

export async function list(req, res, next) {
  try {
    const data = await svc.listReports({
      status: req.query.status,
      severity: req.query.severity,
      category: req.query.category,
      q: req.query.q,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(data);
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await svc.updateReport(actor, req.params.id, req.body);
    res.json({ report: data });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    const actor = await buildActor(req);
    const data = await svc.deleteReport(actor, req.params.id);
    res.json(data);
  } catch (e) { next(e); }
}