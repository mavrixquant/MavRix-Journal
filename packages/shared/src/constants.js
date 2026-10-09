// packages/shared/src/constants.js
//
// Values shared by the API and the web app.

/* ------------------------------------------------------------------ */
/*  Trading sessions                                                   */
/* ------------------------------------------------------------------ */

export const SESSION_RANGES = [
  { name: 'Asia',          start: 1080, end: 120  },
  { name: 'London',        start: 120,  end: 300  },
  { name: 'NY Pre-Market', start: 300,  end: 510  },
  { name: 'NY AM',         start: 510,  end: 660  },
  { name: 'NY Lunch',      start: 660,  end: 810  },
  { name: 'NY PM',         start: 810,  end: 960  },
  { name: 'After Hours',   start: 960,  end: 1080 },
];

export const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ------------------------------------------------------------------ */
/*  Trade scoring                                                      */
/* ------------------------------------------------------------------ */

export const RR_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];
export const TICKS_PER_POINT = 4;

/* ------------------------------------------------------------------ */
/*  Accounts                                                           */
/* ------------------------------------------------------------------ */

export const ACCOUNT_TYPES = ['Backtest', 'Live', 'Demo'];
export const CURRENCIES = ['USD', 'EUR', 'INR', 'GBP'];
export const RISK_TYPES = ['fixed', 'variable'];
export const RISK_UNITS = ['percent', 'amount'];
export const SL_UNITS = ['ticks', 'points'];
export const COMMISSION_MODES = ['none', 'flat', 'per_contract'];
export const DIRECTIONS = ['Long', 'Short'];

/* ------------------------------------------------------------------ */
/*  Dashboard layouts                                                  */
/* ------------------------------------------------------------------ */

export const MAX_LAYOUTS = 3;
export const MAX_DROPDOWN_UNIQUES = 10;

/* ------------------------------------------------------------------ */
/*  Strategies                                                         */
/* ------------------------------------------------------------------ */

// Lifecycle states. "archived" is the soft-delete path — the strategy
// disappears from pickers but its historical trades keep the tag.
export const STRATEGY_STATUSES = ['active', 'paused', 'archived'];

// A strategy is either Long-only, Short-only, or applies to both.
// "null" (undefined direction) means both.
export const STRATEGY_DIRECTIONS = ['Long', 'Short'];

// Curated palette for strategy colours. Values are 6-digit hex strings.
// The web app uses these to render the strategy chip; the API just stores
// whatever hex the client sent (validation restricts it to this palette).
export const STRATEGY_COLORS = [
  { hex: '#F59E0B', label: 'Amber'  },
  { hex: '#4C8BF5', label: 'Blue'   },
  { hex: '#35C4A1', label: 'Green'  },
  { hex: '#FF5C5C', label: 'Red'    },
  { hex: '#A78BFA', label: 'Violet' },
  { hex: '#6C7686', label: 'Grey'   },
];

// Default colour applied when the client doesn't specify one.
export const STRATEGY_DEFAULT_COLOR = '#F59E0B';

/* ------------------------------------------------------------------ */
/*  Custom column configs                                              */
/*                                                                     */
/*  A columnConfigs JSON blob can be in one of two shapes:             */
/*                                                                     */
/*    LEGACY (v1):                                                     */
/*      { "Setup": "dropdown", "Notes": "text", "R": "number" }        */
/*                                                                     */
/*    CURRENT (v2):                                                    */
/*      {                                                              */
/*        "Setup": { "type": "dropdown", "options": ["A", "B", "C"] }, */
/*        "Notes": { "type": "text" },                                 */
/*        "R":     { "type": "number" }                                */
/*      }                                                              */
/*                                                                     */
/*  The v2 shape lets us persist the option list for dropdown columns  */
/*  so the AddTradeModal can render a real <select> and the Column     */
/*  Manager can edit the options. Every reader should call             */
/*  normalizeColumnConfig() before touching a value — it transparently */
/*  upgrades v1 entries to v2 on the fly.                              */
/* ------------------------------------------------------------------ */

/**
 * Normalize a single column config entry.
 *
 * Accepts either:
 *   - a legacy string ("text" | "dropdown" | "number")
 *   - a v2 object ({ type, options? })
 *
 * Returns a v2 object: { type, ...(options if dropdown) }.
 *
 * Never throws — falls back to { type: 'text' } for anything unparseable.
 */
export function normalizeColumnConfig(raw) {
  // Legacy string form
  if (typeof raw === 'string') {
    if (raw === 'text' || raw === 'dropdown' || raw === 'number') {
      return raw === 'dropdown'
        ? { type: 'dropdown', options: [] }
        : { type: raw };
    }
    return { type: 'text' };
  }

  // Already an object
  if (raw && typeof raw === 'object') {
    const type =
      raw.type === 'text' || raw.type === 'dropdown' || raw.type === 'number'
        ? raw.type
        : 'text';

    if (type === 'dropdown') {
      const options = Array.isArray(raw.options)
        ? raw.options
            .map((o) => (o == null ? '' : String(o).trim()))
            .filter(Boolean)
        : [];
      // De-dupe while preserving first-seen order
      const seen = new Set();
      const unique = [];
      for (const o of options) {
        if (!seen.has(o)) {
          seen.add(o);
          unique.push(o);
        }
      }
      return { type: 'dropdown', options: unique };
    }

    return { type };
  }

  // Anything else — null, undefined, number, boolean, etc.
  return { type: 'text' };
}

/**
 * Normalize an entire columnConfigs JSON blob.
 *
 * Input:  any object map of { [columnName]: legacyOrV2Value }
 * Output: a fresh object map of { [columnName]: v2Config }
 *
 * Skips entries whose key isn't a non-empty string. Never mutates input.
 */
export function normalizeColumnConfigs(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const name = String(key).trim();
    if (!name) continue;
    out[name] = normalizeColumnConfig(value);
  }
  return out;
}

/**
 * Extract just the type from a raw config entry. Convenience wrapper used
 * where callers only need the type and don't care about options.
 */
export function getColumnType(raw) {
  return normalizeColumnConfig(raw).type;
}

/* ------------------------------------------------------------------ */
/*  Economic Calendar                                                  */
/* ------------------------------------------------------------------ */

export * from './calendar.js';