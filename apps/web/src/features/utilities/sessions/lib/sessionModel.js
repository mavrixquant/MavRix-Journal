/**
 * Pure model for the Sessions page. No React.
 *
 * Every window is defined in the wall-clock of its home zone and converted to
 * UTC instants on demand, so DST (US, UK, anywhere) is handled by Intl alone.
 *
 * Session boundaries come from SESSION_RANGES in `shared/trading/time.js`
 * (the same table `getSession` uses), so trade logs and this page cannot
 * disagree. Boundaries are minutes after midnight New York time.
 */
import { SESSION_RANGES } from '@/shared/trading/time';
import { NY, LONDON, MIN, DAY, zonedParts, zonedToUtc, addDays } from './tz';

/* ------------------------------------------------------------------ */
/* ET trading sessions (minutes after midnight ET)                     */
/* ------------------------------------------------------------------ */
// Display metadata keyed by the session names used in time.js.
const SESSION_META = {
  Asia: { id: 'asia', desc: 'Tokyo, Sydney, Singapore', color: '#7c8cff' },
  London: { id: 'london', desc: 'European open', color: '#378ADD' },
  'NY Pre-Market': { id: 'ny-pre', desc: 'Early positioning, data releases', color: '#f5b94a' },
  'NY AM': { id: 'ny-am', desc: 'Data and cash open, deepest liquidity', color: 'var(--accent)' },
  'NY Lunch': { id: 'ny-lunch', desc: 'Thin books, choppy ranges', color: '#8892A3' },
  'NY PM': { id: 'ny-pm', desc: 'Afternoon push into the close', color: '#4ade80' },
  'After Hours': { id: 'after', desc: 'Post-close, earnings reactions', color: '#a78bfa' },
};

export const SESSIONS = SESSION_RANGES.map((r) => ({
  ...(SESSION_META[r.name] || { id: r.name, desc: '', color: '#8892A3' }),
  name: r.name,
  start: r.start,
  end: r.end,
}));

export function computeSessions(now) {
  const t = zonedParts(now, NY);
  const inst = [];
  for (let off = -1; off <= 2; off++) {
    const day = addDays(t.y, t.mo, t.d, off);
    for (const s of SESSIONS) {
      const end = s.end > s.start ? s.end : s.end + 1440;
      inst.push({
        id: s.id,
        start: zonedToUtc(day.y, day.mo, day.d, s.start, NY),
        end: zonedToUtc(day.y, day.mo, day.d, end, NY),
      });
    }
  }

  const rows = SESSIONS.map((s) => {
    const list = inst.filter((i) => i.id === s.id).sort((a, b) => a.start - b.start);
    const live = list.find((i) => i.start <= now && now < i.end);
    const up = list.find((i) => i.start > now);
    const cur = live || up;
    return {
      ...s,
      live: !!live,
      startAt: cur.start,
      endAt: cur.end,
      progress: live ? (now - live.start) / (live.end - live.start) : 0,
    };
  });

  const current = rows.find((r) => r.live) || null;
  const next = rows.filter((r) => !r.live).sort((a, b) => a.startAt - b.startAt)[0] || null;
  rows.forEach((r) => {
    r.status = r.live ? 'live' : r === next ? 'next' : 'later';
  });

  return { rows, current, next, etMinutes: t.minutes + t.s / 60 };
}

/* ------------------------------------------------------------------ */
/* Interval builder (weekly windows in a zone -> merged UTC intervals) */
/* ------------------------------------------------------------------ */
export function buildIntervals(tz, windows, now, { back = 2, fwd = 9, skip } = {}) {
  const p = zonedParts(now, tz);
  const out = [];
  for (let off = -back; off <= fwd; off++) {
    const day = addDays(p.y, p.mo, p.d, off);
    if (skip && skip(day)) continue;
    for (const w of windows) {
      if (!w.days.includes(day.dow)) continue;
      out.push({
        start: zonedToUtc(day.y, day.mo, day.d, w.start, tz),
        end: zonedToUtc(day.y, day.mo, day.d, w.end, tz),
      });
    }
  }
  out.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const i of out) {
    const l = merged[merged.length - 1];
    if (l && i.start <= l.end) l.end = Math.max(l.end, i.end);
    else merged.push({ ...i });
  }
  return merged;
}

/* ------------------------------------------------------------------ */
/* Regional market centres + overlaps                                  */
/* ------------------------------------------------------------------ */
export const CENTERS = [
  { id: 'tokyo', name: 'Tokyo', tz: 'Asia/Tokyo', start: 540, end: 1080, color: '#7c8cff' },
  { id: 'london', name: 'London', tz: LONDON, start: 480, end: 1020, color: '#378ADD' },
  { id: 'newyork', name: 'New York', tz: NY, start: 480, end: 1020, color: '#4ade80' },
];
const WEEKDAYS = [1, 2, 3, 4, 5];

export function computeCenters(now) {
  const list = CENTERS.map((c) => {
    const iv = buildIntervals(c.tz, [{ days: WEEKDAYS, start: c.start, end: c.end }], now);
    const cur = iv.find((i) => i.start <= now && now < i.end);
    const next = iv.find((i) => i.start > now);
    return { ...c, iv, open: !!cur, end: cur?.end, nextOpen: next?.start };
  });

  const active = list.filter((c) => c.open);
  const overlap =
    active.length >= 2
      ? { names: active.map((c) => c.name), endsAt: Math.min(...active.map((c) => c.end)) }
      : null;

  let nextOverlap = null;
  if (!overlap) {
    const times = [...new Set(list.flatMap((c) => c.iv.flatMap((i) => [i.start, i.end])))]
      .filter((t) => t > now)
      .sort((a, b) => a - b);
    for (const t of times) {
      const a = list.filter((c) => c.iv.some((i) => i.start <= t && t < i.end));
      if (a.length >= 2) {
        nextOverlap = { names: a.map((c) => c.name), startsAt: t };
        break;
      }
    }
  }

  return {
    centers: list.map(({ iv, ...c }) => c),
    overlap,
    nextOverlap,
  };
}

/* ------------------------------------------------------------------ */
/* NYSE full-day holidays (early closes are not modelled)              */
/* ------------------------------------------------------------------ */
const pad = (n) => String(n).padStart(2, '0');
const key = (y, mo, d) => `${y}-${pad(mo)}-${pad(d)}`;
const dowOf = (y, mo, d) => new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
const nthDow = (y, mo, dow, n) => 1 + ((dow - dowOf(y, mo, 1) + 7) % 7) + (n - 1) * 7;
const lastDow = (y, mo, dow) => {
  const last = new Date(Date.UTC(y, mo, 0));
  return last.getUTCDate() - ((last.getUTCDay() - dow + 7) % 7);
};
function observed(y, mo, d) {
  const w = dowOf(y, mo, d);
  if (w === 6) return addDays(y, mo, d, -1);
  if (w === 0) return addDays(y, mo, d, 1);
  return { y, mo, d };
}
function easter(y) {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  return { mo: Math.floor((h + l - 7 * m + 114) / 31), d: ((h + l - 7 * m + 114) % 31) + 1 };
}

const holidayCache = new Map();
function holidaysFor(y) {
  if (holidayCache.has(y)) return holidayCache.get(y);
  const m = new Map();
  const add = (o, name) => m.set(key(o.y ?? y, o.mo, o.d), name);
  const w1 = dowOf(y, 1, 1);
  if (w1 === 0) add({ mo: 1, d: 2 }, "New Year's Day");
  else if (w1 !== 6) add({ mo: 1, d: 1 }, "New Year's Day");
  add({ mo: 1, d: nthDow(y, 1, 1, 3) }, 'Martin Luther King Jr. Day');
  add({ mo: 2, d: nthDow(y, 2, 1, 3) }, "Presidents' Day");
  const e = easter(y);
  add(addDays(y, e.mo, e.d, -2), 'Good Friday');
  add({ mo: 5, d: lastDow(y, 5, 1) }, 'Memorial Day');
  add(observed(y, 6, 19), 'Juneteenth');
  add(observed(y, 7, 4), 'Independence Day');
  add({ mo: 9, d: nthDow(y, 9, 1, 1) }, 'Labor Day');
  add({ mo: 11, d: nthDow(y, 11, 4, 4) }, 'Thanksgiving');
  add(observed(y, 12, 25), 'Christmas');
  holidayCache.set(y, m);
  return m;
}
export const nyseHoliday = (y, mo, d) => holidaysFor(y).get(key(y, mo, d));

/* ------------------------------------------------------------------ */
/* Instruments                                                         */
/* ------------------------------------------------------------------ */
export const INSTRUMENTS = [
  {
    id: 'forex',
    name: 'Forex',
    sub: 'Spot FX, 24/5',
    hours: 'Sun 5:00 PM to Fri 5:00 PM ET',
    tz: NY,
    windows: [
      { days: [0], start: 1020, end: 1440 },
      { days: [1, 2, 3, 4], start: 0, end: 1440 },
      { days: [5], start: 0, end: 1020 },
    ],
  },
  {
    id: 'cme',
    name: 'CME Futures',
    sub: 'Globex: ES, NQ, YM, RTY',
    hours: 'Sun 6:00 PM to Fri 5:00 PM ET, daily break 5 to 6 PM',
    tz: NY,
    windows: [
      { days: [0], start: 1080, end: 1440 },
      { days: [1, 2, 3, 4], start: 0, end: 1020 },
      { days: [1, 2, 3, 4], start: 1080, end: 1440 },
      { days: [5], start: 0, end: 1020 },
    ],
  },
  {
    id: 'equities',
    name: 'NYSE / NASDAQ',
    sub: 'Cash equities',
    hours: 'Mon to Fri 9:30 AM to 4:00 PM ET, extended 4:00 AM to 8:00 PM',
    tz: NY,
    holidays: true,
    windows: [{ days: [1, 2, 3, 4, 5], start: 570, end: 960 }],
    extended: [
      { days: [1, 2, 3, 4, 5], start: 240, end: 570 },
      { days: [1, 2, 3, 4, 5], start: 960, end: 1200 },
    ],
  },
  {
    id: 'crypto',
    name: 'Crypto',
    sub: 'Spot and perpetuals, 24/7',
    hours: 'Always open, daily candle closes 00:00 UTC',
    always: true,
  },
];

function segmentsFor(now, reg, ext) {
  const to = now + DAY;
  const clip = (list, kind) =>
    list
      .filter((i) => i.end > now && i.start < to)
      .map((i) => ({
        kind,
        from: (Math.max(i.start, now) - now) / DAY,
        to: (Math.min(i.end, to) - now) / DAY,
      }));
  return [...clip(ext, 'extended'), ...clip(reg, 'open')];
}

export function computeInstrument(spec, now) {
  const base = { id: spec.id, name: spec.name, sub: spec.sub, hours: spec.hours };

  if (spec.always) {
    const u = zonedParts(now, 'UTC');
    return {
      ...base,
      state: 'open',
      stateLabel: 'Open 24/7',
      until: Date.UTC(u.y, u.mo - 1, u.d + 1),
      untilLabel: 'Daily candle closes in',
      segments: [{ kind: 'open', from: 0, to: 1 }],
      note: null,
    };
  }

  const skip = spec.holidays ? (d) => !!nyseHoliday(d.y, d.mo, d.d) : undefined;
  const reg = buildIntervals(spec.tz, spec.windows, now, { skip });
  const ext = spec.extended ? buildIntervals(spec.tz, spec.extended, now, { skip }) : [];
  const cur = reg.find((i) => i.start <= now && now < i.end);
  const next = reg.find((i) => i.start > now);
  const prev = [...reg].reverse().find((i) => i.end <= now);

  let state;
  let stateLabel;
  let until;
  let untilLabel;
  if (cur) {
    state = 'open';
    stateLabel = 'Open';
    until = cur.end;
    untilLabel = 'Closes in';
  } else {
    const e = ext.find((i) => i.start <= now && now < i.end);
    if (e) {
      const pre = next && Math.abs(e.end - next.start) < 1000;
      state = 'extended';
      stateLabel = pre ? 'Pre-market' : 'After-hours';
      until = pre ? next.start : e.end;
      untilLabel = pre ? 'Opens in' : 'Extended hours end in';
    } else if (prev && next && next.start - prev.end <= 61 * MIN) {
      state = 'break';
      stateLabel = 'Daily break';
      until = next.start;
      untilLabel = 'Reopens in';
    } else {
      state = 'closed';
      stateLabel = 'Closed';
      until = next?.start;
      untilLabel = 'Opens in';
    }
  }

  let note = null;
  if (spec.holidays) {
    const p = zonedParts(now, spec.tz);
    for (let i = 0; i <= 21; i++) {
      const d = addDays(p.y, p.mo, p.d, i);
      const name = nyseHoliday(d.y, d.mo, d.d);
      if (name) {
        const when = new Date(Date.UTC(d.y, d.mo - 1, d.d)).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });
        note = i === 0 ? `Closed today for ${name}` : `Closed ${when} for ${name}`;
        break;
      }
    }
  }

  return { ...base, state, stateLabel, until, untilLabel, segments: segmentsFor(now, reg, ext), note };
}