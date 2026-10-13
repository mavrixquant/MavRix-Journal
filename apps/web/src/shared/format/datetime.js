// apps/web/src/shared/format/datetime.js
//
// Timezone-aware date/time formatters shared by every timestamp-rendering
// surface (chat today, calendar later). Pure functions — no React, no
// settings context. The caller passes the timezone preference in.
//
// `timezone` is either an IANA identifier ('Asia/Kolkata') or 'auto' /
// null / '' — in which case the browser timezone is used.

/* ------------------------------------------------------------------ */
/*  Timezone resolution                                                */
/* ------------------------------------------------------------------ */

export function resolveTimezone(tz) {
  if (!tz || tz === 'auto') {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }
  return tz;
}

/**
 * "Asia/Kolkata" for display next to the Auto option.
 * Returns 'UTC' if Intl is unavailable.
 */
export function browserTimezoneLabel() {
  return resolveTimezone('auto');
}

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

/**
 * "2:35 PM" (12h) or "14:35" (24h).
 * Falls back to the browser timezone if the requested one is invalid.
 */
export function formatTime(iso, timeFormat = '12h', timezone) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const is24h = timeFormat === '24h';
  const tz = resolveTimezone(timezone);
  const base = {
    hour: is24h ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: !is24h,
  };

  try {
    return d.toLocaleTimeString('en-US', { ...base, timeZone: tz });
  } catch {
    return d.toLocaleTimeString('en-US', base);
  }
}

/**`r`n * Calendar-day key in the target timezone: "YYYY-MM-DD".
 * Used internally for day-boundary comparisons.
 */
export function dayKey(iso, tz) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const dd = parts.find((p) => p.type === 'day').value;
  return `${y}-${m}-${dd}`;
}

/** Whole-day diff between two YYYY-MM-DD strings (b - a). */
function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000
  );
}

/**
 * "Today" / "Yesterday" / "Wednesday" / "October 13, 2026"
 * Uses the target timezone to decide which calendar day "now" is in.
 */
export function formatDayLabel(iso, timezone) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const tz = resolveTimezone(timezone);
  const nowKey = dayKey(new Date().toISOString(), tz);
  const msgKey = dayKey(iso, tz);
  const diff = daysBetween(msgKey, nowKey);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) {
    try {
      return d.toLocaleDateString('en-US', { weekday: 'long', timeZone: tz });
    } catch {
      return d.toLocaleDateString('en-US', { weekday: 'long' });
    }
  }
  try {
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: tz,
    });
  } catch {
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}

/**
 * Compact relative timestamp for conversation lists.
 * Today → "2:35 PM" · Yesterday → "Yesterday" · <7d → "Wed" · else "Oct 13"
 */
export function formatRelative(iso, timeFormat = '12h', timezone) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const tz = resolveTimezone(timezone);
  const nowKey = dayKey(new Date().toISOString(), tz);
  const msgKey = dayKey(iso, tz);
  const diff = daysBetween(msgKey, nowKey);

  if (diff === 0) return formatTime(iso, timeFormat, timezone);
  if (diff === 1) return 'Yesterday';
  if (diff < 7) {
    try {
      return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz });
    } catch {
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    }
  }
  try {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: tz,
    });
  } catch {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  Dynamic IANA timezone catalog                                      */
/*                                                                     */
/*  Uses Intl.supportedValuesOf('timeZone') � available in Chrome 99+, */
/*  Safari 15.4+, Firefox 93+. Falls back to a small curated list on   */
/*  ancient browsers so the dropdown never renders empty.              */
/*                                                                     */
/*  Each entry:                                                        */
/*    { value, city, region, offset, offsetMinutes }                   */
/*                                                                     */
/*  `offset` reflects the CURRENT DST rules � shown as "UTC+05:30".    */
/* ------------------------------------------------------------------ */

const FALLBACK_TIMEZONES = [
  'UTC',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Hong_Kong',
  'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
  'Australia/Sydney', 'Pacific/Auckland',
];

function normalizeRegion(region) {
  const map = {
    America:    'Americas',
    Australia:  'Oceania',
    Indian:     'Indian Ocean',
    Atlantic:   'Atlantic',
    Pacific:    'Pacific',
    Arctic:     'Arctic',
    Antarctica: 'Antarctica',
    Africa:     'Africa',
    Asia:       'Asia',
    Europe:     'Europe',
    Etc:        'Other',
  };
  return map[region] || region || 'Other';
}

/**
 * "UTC+05:30" / "UTC-08:00" / "UTC+00:00" for the given IANA zone.
 * Uses the CURRENT offset (DST-aware).
 */
export function getTimezoneOffsetString(tz) {
  if (!tz) return 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'longOffset',
    }).formatToParts(new Date());
    const name = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    if (name === 'GMT' || name === 'UTC') return 'UTC+00:00';
    return name.replace(/^GMT/, 'UTC');
  } catch {
    return 'UTC';
  }
}

/**
 * Offset in minutes for the given zone (positive = east of UTC).
 * Used to sort zones within a region.
 */
function getTimezoneOffsetMinutes(tz) {
  try {
    const now = new Date();
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const local = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    return Math.round((local - utc) / 60000);
  } catch {
    return 0;
  }
}

/**
 * Full IANA list, decorated + sorted by region then offset then city.
 */
export function getAllTimezones() {
  let raw = [];
  if (
    typeof Intl !== 'undefined' &&
    typeof Intl.supportedValuesOf === 'function'
  ) {
    try {
      raw = Intl.supportedValuesOf('timeZone');
    } catch {
      raw = [];
    }
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    raw = FALLBACK_TIMEZONES;
  }

  const out = raw.map((tz) => {
    // "America/Argentina/Buenos_Aires" ? region="Americas", city="Argentina / Buenos Aires"
    const slash = tz.indexOf('/');
    const regionKey = slash === -1 ? 'Etc' : tz.slice(0, slash);
    const cityRaw = slash === -1 ? tz : tz.slice(slash + 1);
    const city = cityRaw.replace(/_/g, ' ').replace(/\//g, ' / ');
    return {
      value: tz,
      city,
      region: normalizeRegion(regionKey),
      offset: getTimezoneOffsetString(tz),
      offsetMinutes: getTimezoneOffsetMinutes(tz),
    };
  });

  // Flat ordering: negative offsets first (UTC-12), then 0, then positive
  // (UTC+14). Within the same offset, sort alphabetically by city.
  out.sort((a, b) => {
    if (a.offsetMinutes !== b.offsetMinutes) {
      return a.offsetMinutes - b.offsetMinutes;
    }
    return a.city.localeCompare(b.city);
  });

  return out;
}

/**
 * Groups the output of getAllTimezones() into an ordered array:
 *   [['Africa', [zone, ...]], ['Americas', [...]], ...]
 */
export function groupTimezonesByRegion(zones) {
  const preferredOrder = [
    'UTC', 'Africa', 'Americas', 'Antarctica', 'Arctic',
    'Asia', 'Atlantic', 'Europe', 'Indian Ocean',
    'Oceania', 'Pacific', 'Other',
  ];

  const byRegion = new Map();
  for (const z of zones) {
    if (!byRegion.has(z.region)) byRegion.set(z.region, []);
    byRegion.get(z.region).push(z);
  }

  const sorted = [...byRegion.entries()].sort(([a], [b]) => {
    const ai = preferredOrder.indexOf(a);
    const bi = preferredOrder.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return sorted;
}
