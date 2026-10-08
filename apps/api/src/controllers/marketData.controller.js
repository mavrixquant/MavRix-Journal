// apps/api/src/controllers/marketData.controller.js

import * as svc from '../services/marketData.service.js';

export async function catalog(_req, res, next) {
  try { res.json(svc.listCatalog()); } catch (e) { next(e); }
}

export async function bars(req, res, next) {
  try {
    const { symbol, interval, range } = req.query;
    res.json(await svc.fetchBars({ symbol, interval, range }));
  } catch (e) { next(e); }
}

export async function quote(req, res, next) {
  try {
    const { symbol } = req.query;
    res.json(await svc.fetchQuote({ symbol }));
  } catch (e) { next(e); }
}

export async function quotes(req, res, next) {
  try {
    const { symbols } = req.query;
    const list = String(symbols || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    res.json(await svc.fetchQuotes({ symbols: list }));
  } catch (e) { next(e); }
}