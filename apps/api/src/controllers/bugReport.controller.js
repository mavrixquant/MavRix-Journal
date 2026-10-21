import * as svc from '../services/bugReport.service.js';

export async function create(req, res, next) {
  try {
    const report = await svc.createReport(req.userId, req.body, req);
    res.status(201).json({ report });
  } catch (e) {
    next(e);
  }
}