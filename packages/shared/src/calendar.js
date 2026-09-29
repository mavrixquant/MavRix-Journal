// packages/shared/src/calendar.js
//
// Shared constants for the Economic Calendar feature.
// Consumed by both the API (validation, future sync extensions) and the
// web app (UI labels, default filters, impact ranking, currency names).
//
// Data source: Biquote (https://biquote.io) — no API key required.

/* ------------------------------------------------------------------ */
/*  Impact levels                                                      */
/* ------------------------------------------------------------------ */

// Matches Biquote's `importance` field, lowercased.
// Order is significant — high → medium → low for sort/display purposes.
export const IMPACT_LEVELS = ['high', 'medium', 'low'];

// UI metadata. `rank` is for client-side sorting (higher = more significant).
// Colors are intentionally not in here — they live in tokens.css so the
// whole app can be re-themed in one place.
export const IMPACT_META = {
  high:   { label: 'High',   rank: 3 },
  medium: { label: 'Medium', rank: 2 },
  low:    { label: 'Low',    rank: 1 },
};

/* ------------------------------------------------------------------ */
/*  Currencies                                                         */
/* ------------------------------------------------------------------ */

// Currencies pre-selected in the filter on first load. The full currency
// list is discovered dynamically from the events in the DB — this is just
// a sane default so the user isn't overwhelmed by 40+ currencies.
export const DEFAULT_CALENDAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'];

// Human-readable names for currencies the MT5 feed commonly emits.
// Anything not in this map falls back to the raw ISO code in the UI.
export const CURRENCY_NAMES = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc',
  NZD: 'New Zealand Dollar',
  CNY: 'Chinese Yuan',
  TRY: 'Turkish Lira',
  INR: 'Indian Rupee',
  BRL: 'Brazilian Real',
  MXN: 'Mexican Peso',
  ZAR: 'South African Rand',
  SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone',
  DKK: 'Danish Krone',
  PLN: 'Polish Zloty',
  CZK: 'Czech Koruna',
  HUF: 'Hungarian Forint',
  RUB: 'Russian Ruble',
  KRW: 'South Korean Won',
  SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar',
};

/* ------------------------------------------------------------------ */
/*  Event types                                                        */
/* ------------------------------------------------------------------ */

// Biquote's `type` field. Anything else (or null) falls into "Other" in UI.
export const EVENT_TYPES = ['indicator', 'holiday', 'speech', 'auction'];

/* ------------------------------------------------------------------ */
/*  Date window defaults                                               */
/* ------------------------------------------------------------------ */

// Default calendar page window: one week back, two weeks forward.
// Matches what most traders expect from a "current events" view.
export const DEFAULT_CALENDAR_DAYS_BACK = 7;
export const DEFAULT_CALENDAR_DAYS_FORWARD = 14;

// Hard cap matching the API route's maximum. Prevents accidental
// 10,000-row queries from the UI (or a bad URL).
export const MAX_CALENDAR_EVENTS_PER_REQUEST = 500;