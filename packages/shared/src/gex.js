// packages/shared/src/gex.js
//
// GEX / BL level converter — canonical source of truth for both the API
// (server-side validation) and the web app (admin live preview + user view).
//
// Input:  the raw JSON array pasted by an admin — array of objects with
//         at least { Name, Y1, TextMsg?, ShowPrice? }.
//
// Output: `{ ok, levels, converted, counts, errors }` where each level is
//         `{ type, price, label }` and `converted` is the Pine-friendly
//         pipe-string `TYPE|PRICE|LABEL;TYPE|PRICE|LABEL;...`.
//
// The pipe-string is DETERMINISTIC from the levels array — the server
// re-runs the serializer and rejects any mismatch to prevent tampering.

/* ------------------------------------------------------------------ */
/*  Level type classification                                          */
/* ------------------------------------------------------------------ */

/**
 * Decide a level's short type tag.
 *
 * Rules (in order):
 *   1. "BL"  appears in Name (case-insensitive)  → "BL"
 *   2. "GEX" appears in Name                     → "GEX"
 *   3. First whitespace-delimited token of TextMsg, uppercased → that token
 *   4. Fallback                                  → "OTHER"
 */
export function classifyGexLevel(item) {
  const name = String(item?.Name ?? '').toUpperCase();
  if (name.includes('BL')) return 'BL';
  if (name.includes('GEX')) return 'GEX';

  const text = String(item?.TextMsg ?? '').trim();
  const first = text.split(/\s+/)[0];
  return first ? first.toUpperCase() : 'OTHER';
}

/* ------------------------------------------------------------------ */
/*  Label sanitization                                                 */
/* ------------------------------------------------------------------ */

/**
 * Sanitize a label so it can be safely embedded in the pipe-string.
 * - Newlines → space
 * - `;`  → `,`      (delimiter between records)
 * - `|`  → `-`      (delimiter between fields inside a record)
 * - ` / ` → ` - `   (legibility)
 * - Collapse runs of whitespace, trim
 */
export function cleanGexLabel(text) {
  return String(text ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/;/g, ',')
    .replace(/\|/g, '-')
    .replace(/\s*\/\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ */
/*  Number normalization                                               */
/* ------------------------------------------------------------------ */

/**
 * Convert any input to a clean numeric string. Returns null if not finite.
 * Uses plain String(n) — matches the converter HTML's behavior exactly.
 */
export function normalizeGexNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return String(n);
}

/* ------------------------------------------------------------------ */
/*  Record serialization / parsing                                     */
/* ------------------------------------------------------------------ */

/**
 * Serialize an array of `{ type, price, label }` into the pipe-string.
 * Order is preserved from the input array.
 */
export function serializeGexLevels(levels) {
  return levels
    .map((l) => `${l.type}|${l.price}|${l.label}`)
    .join(';');
}

/**
 * Parse a pipe-string back into a levels array.
 *
 * Returns `{ levels, malformed }` — malformed records (missing fields) are
 * collected rather than throwing, so a caller can decide whether to reject
 * the whole batch or skip individual records.
 */
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

/* ------------------------------------------------------------------ */
/*  Main converter                                                     */
/* ------------------------------------------------------------------ */

const DEFAULT_OPTIONS = Object.freeze({
  // Skip items where `ShowPrice === false` — mirrors the HTML converter.
  skipHidden: true,
  // Skip items whose Name contains "CREDIT" — mirrors the HTML converter.
  skipCredit: true,
});

/**
 * Convert a parsed JSON array (or a JSON string) into the GEX payload.
 *
 * @param {string|Array} input    — JSON string OR already-parsed array
 * @param {object}       [opts]
 * @returns {{
 *   ok: boolean,
 *   levels: Array<{type:string,price:number,label:string}>,
 *   converted: string,
 *   counts: { total:number, bl:number, gex:number, other:number },
 *   errors: string[]
 * }}
 */
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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const GEX_TYPES = Object.freeze(['BL', 'GEX', 'OTHER']);

// Re-export for callers that only import from this module.
export const GEX_DEFAULT_TIMEZONE = 'Asia/Kolkata';