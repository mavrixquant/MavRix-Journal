

export function classifyGexLevel(item) {
  const name = String(item?.Name ?? '').toUpperCase();
  if (name.includes('BL')) return 'BL';
  if (name.includes('GEX')) return 'GEX';

  const text = String(item?.TextMsg ?? '').trim();
  const first = text.split(/\s+/)[0];
  return first ? first.toUpperCase() : 'OTHER';
}


export function cleanGexLabel(text) {
  return String(text ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/;/g, ',')
    .replace(/\|/g, '-')
    .replace(/\s*\/\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}


export function normalizeGexNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return String(n);
}


export function serializeGexLevels(levels) {
  return levels
    .map((l) => `${l.type}|${l.price}|${l.label}`)
    .join(';');
}

export function parseGexString(str) {
  const levels = [];
  const malformed = [];
  const raw = String(str ?? '').trim();
  if (!raw) return { levels, malformed };

  const records = raw.split(';');
  for (const rec of records) {
    const trimmed = rec.trim();
    if (!trimmed) continue;
    const parts = trimmed.split('|');
    if (parts.length !== 3) {
      malformed.push(trimmed);
      continue;
    }
    const [type, priceStr, label] = parts;
    const price = Number(priceStr);
    if (!type || !Number.isFinite(price) || !label) {
      malformed.push(trimmed);
      continue;
    }
    levels.push({ type, price, label });
  }
  return { levels, malformed };
}


const DEFAULT_OPTIONS = Object.freeze({
  skipHidden: true,
  skipCredit: true,
});

export function convertGexJson(input, opts = {}) {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const errors = [];

  let data = input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return {
        ok: false,
        levels: [],
        converted: '',
        counts: { total: 0, bl: 0, gex: 0, other: 0 },
        errors: ['Input is empty.'],
      };
    }
    try {
      data = JSON.parse(trimmed);
    } catch (err) {
      return {
        ok: false,
        levels: [],
        converted: '',
        counts: { total: 0, bl: 0, gex: 0, other: 0 },
        errors: [`Invalid JSON: ${err.message}`],
      };
    }
  }

  if (!Array.isArray(data)) {
    return {
      ok: false,
      levels: [],
      converted: '',
      counts: { total: 0, bl: 0, gex: 0, other: 0 },
      errors: ['Root JSON must be an array.'],
    };
  }

  const levels = [];

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    if (options.skipHidden && item.ShowPrice === false) continue;
    if (
      options.skipCredit &&
      String(item.Name ?? '').toUpperCase().includes('CREDIT')
    ) {
      continue;
    }

    const priceStr = normalizeGexNumber(item.Y1);
    if (priceStr === null) continue;

    const price = Number(priceStr);
    const label = cleanGexLabel(item.TextMsg || item.Name || '');
    const type = classifyGexLevel(item);

    if (!label) continue;

    levels.push({ type, price, label });
  }

  if (levels.length === 0) {
    return {
      ok: false,
      levels: [],
      converted: '',
      counts: { total: 0, bl: 0, gex: 0, other: 0 },
      errors: ['No valid price levels found.'],
    };
  }

  const converted = serializeGexLevels(levels);
  const bl = levels.filter((l) => l.type === 'BL').length;
  const gex = levels.filter((l) => l.type === 'GEX').length;

  return {
    ok: true,
    levels,
    converted,
    counts: {
      total: levels.length,
      bl,
      gex,
      other: levels.length - bl - gex,
    },
    errors,
  };
}


export const GEX_TYPES = Object.freeze(['BL', 'GEX', 'OTHER']);

export const GEX_DEFAULT_TIMEZONE = 'Asia/Kolkata';