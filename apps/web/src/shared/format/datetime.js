

const TZ_CACHE = new Map();

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function resolveTimezone(tz) {
  const key = tz || 'auto';
  const cached = TZ_CACHE.get(key);
  if (cached) return cached;

  let resolved;

  if (!tz || tz === 'auto') {
    resolved = browserTimezone();
  } else {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz }).format();
      resolved = tz;
    } catch {
      resolved = browserTimezone();
    }
  }

  TZ_CACHE.set(key, resolved);
  return resolved;
}

export function browserTimezoneLabel() {
  return browserTimezone();
}


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

export function dayKey(iso, tz) {
  const d = new Date(iso);
  const safeTz = resolveTimezone(tz);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const dd = parts.find((p) => p.type === 'day').value;
  return `${y}-${m}-${dd}`;
}

function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000
  );
}

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

export function formatRelative(iso, timeFormat = '12h', timezone) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const tz = resolveTimezone(timezone);
  const nowKey = dayKey(new Date().toISOString(), tz);
  const msgKey = dayKey(iso, tz);
  const diff = daysBetween(msgKey, nowKey);

  if (diff === 0) return formatTime(iso, timeFormat, tz);
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

  out.sort((a, b) => {
    if (a.offsetMinutes !== b.offsetMinutes) {
      return a.offsetMinutes - b.offsetMinutes;
    }
    return a.city.localeCompare(b.city);
  });

  return out;
}

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