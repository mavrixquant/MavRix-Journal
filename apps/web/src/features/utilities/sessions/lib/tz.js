/**
 * Timezone helpers built purely on Intl.DateTimeFormat so DST is automatic.
 * No dependencies. Everything takes/returns epoch milliseconds.
 */
export const NY = 'America/New_York';
export const LONDON = 'Europe/London';
export const MIN = 60000;
export const HOUR = 3600000;
export const DAY = 86400000;

const pad = (n) => String(n).padStart(2, '0');

/* ---------- formatter cache ---------- */
const fmtCache = new Map();
function fmt(tz, locale, opts) {
  const key = `${tz}|${locale}|${JSON.stringify(opts)}`;
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { timeZone: tz, ...opts });
    fmtCache.set(key, f);
  }
  return f;
}

const PARTS_OPTS = {
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
};

export function isValidTz(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function browserTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Wall-clock parts of an instant in a zone. dow: 0 = Sunday. */
export function zonedParts(ms, tz) {
  const o = {};
  for (const p of fmt(tz, 'en-US', PARTS_OPTS).formatToParts(ms)) {
    if (p.type !== 'literal') o[p.type] = Number(p.value);
  }
  const h = o.hour === 24 ? 0 : o.hour;
  return {
    y: o.year,
    mo: o.month,
    d: o.day,
    h,
    mi: o.minute,
    s: o.second,
    dow: new Date(Date.UTC(o.year, o.month - 1, o.day)).getUTCDay(),
    minutes: h * 60 + o.minute,
  };
}

/** UTC offset (ms) of a zone at an instant. */
export function tzOffset(ms, tz) {
  const p = zonedParts(ms, tz);
  const base = Math.floor(ms / 1000) * 1000;
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - base;
}

/** Wall time (minutes after local midnight, may exceed 1440) -> UTC instant. */
const zCache = new Map();
export function zonedToUtc(y, mo, d, minutes, tz) {
  const key = `${tz}|${y}|${mo}|${d}|${minutes}`;
  const hit = zCache.get(key);
  if (hit !== undefined) return hit;
  const guess = Date.UTC(y, mo - 1, d, 0, minutes);
  let t = guess - tzOffset(guess, tz);
  t = guess - tzOffset(t, tz);
  if (zCache.size > 4000) zCache.clear();
  zCache.set(key, t);
  return t;
}

export function addDays(y, mo, d, n) {
  const dt = new Date(Date.UTC(y, mo - 1, d + n));
  return {
    y: dt.getUTCFullYear(),
    mo: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
    dow: dt.getUTCDay(),
  };
}

/** Every instant in [now - backDays, now + fwdDays] where the zone's offset changes. */
export function findTransitions(tz, now, backDays = 10, fwdDays = 400) {
  const out = [];
  const step = 6 * HOUR;
  let t = now - backDays * DAY;
  let prev = tzOffset(t, tz);
  for (; t < now + fwdDays * DAY; t += step) {
    const nx = t + step;
    const o = tzOffset(nx, tz);
    if (o !== prev) {
      let lo = t;
      let hi = nx;
      while (hi - lo > 1000) {
        const mid = Math.floor((lo + hi) / 2);
        if (tzOffset(mid, tz) === prev) lo = mid;
        else hi = mid;
      }
      out.push({ at: hi, from: prev, to: o });
      prev = o;
    }
  }
  return out;
}

/* ---------- formatting ---------- */
export function fmtTime(ms, tz, { h12 = false, seconds = false } = {}) {
  const sec = seconds ? { second: '2-digit' } : {};
  return h12
    ? fmt(tz, 'en-US', { hour: 'numeric', minute: '2-digit', ...sec, hour12: true }).format(ms)
    : fmt(tz, 'en-GB', { hour: '2-digit', minute: '2-digit', ...sec, hourCycle: 'h23' }).format(ms);
}

export function fmtDay(ms, tz) {
  return fmt(tz, 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(ms);
}

export function tzAbbr(ms, tz) {
  const parts = fmt(tz, 'en-US', { timeZoneName: 'short' }).formatToParts(ms);
  return parts.find((p) => p.type === 'timeZoneName')?.value || tz;
}

export function utcLabel(ms, tz) {
  const m = Math.round(tzOffset(ms, tz) / MIN);
  const sign = m < 0 ? '-' : '+';
  const a = Math.abs(m);
  const h = Math.floor(a / 60);
  const r = a % 60;
  return `UTC${sign}${h}${r ? `:${pad(r)}` : ''}`;
}

/** Today / Tomorrow / Yesterday / "Mon, Mar 9" relative to now in a zone. */
export function relDay(ms, now, tz) {
  const a = zonedParts(ms, tz);
  const b = zonedParts(now, tz);
  const diff = Math.round((Date.UTC(a.y, a.mo - 1, a.d) - Date.UTC(b.y, b.mo - 1, b.d)) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return fmtDay(ms, tz);
}

export function fmtDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${m}m ${pad(sec)}s`;
}

export function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}