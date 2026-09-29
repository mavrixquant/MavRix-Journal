// apps/api/src/controllers/calendar.controller.js
import * as calendarService from '../services/calendar.service.js';
import { runCalendarSyncOnce } from '../lib/calendarSync.js';

function parseCsv(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split(',').map((s) => s.trim()).filter(Boolean);
}

export async function list(req, res, next) {
  try {
    const events = await calendarService.listEvents({
      from: req.query.from,
      to: req.query.to,
      currencies: parseCsv(req.query.currency || req.query.currencies),
      impacts: parseCsv(req.query.impact || req.query.impacts),
      limit: req.query.limit,
    });
    res.json({ events });
  } catch (e) { next(e); }
}

export async function get(req, res, next) {
  try {
    const event = await calendarService.getEventById(req.params.id);
    res.json({ event });
  } catch (e) { next(e); }
}

export async function currencies(req, res, next) {
  try {
    const list = await calendarService.listCurrencies();
    res.json({ currencies: list });
  } catch (e) { next(e); }
}

export async function meta(req, res, next) {
  try {
    const result = await calendarService.getCalendarMeta();
    res.json(result);
  } catch (e) { next(e); }
}

export async function sync(req, res, next) {
  try {
    const result = await runCalendarSyncOnce();
    res.json(result);
  } catch (e) { next(e); }
}