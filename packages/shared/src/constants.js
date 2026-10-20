

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


export const RR_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];
export const TICKS_PER_POINT = 4;


export const ACCOUNT_TYPES = ['Backtest', 'Live', 'Demo'];
export const CURRENCIES = ['USD', 'EUR', 'INR', 'GBP'];
export const RISK_TYPES = ['fixed', 'variable'];
export const RISK_UNITS = ['percent', 'amount'];
export const SL_UNITS = ['ticks', 'points'];
export const COMMISSION_MODES = ['none', 'flat', 'per_contract'];
export const DIRECTIONS = ['Long', 'Short'];


export const MAX_LAYOUTS = 3;
export const MAX_DROPDOWN_UNIQUES = 10;


export const STRATEGY_STATUSES = ['active', 'paused', 'archived'];

export const STRATEGY_DIRECTIONS = ['Long', 'Short'];

export const STRATEGY_COLORS = [
  { hex: '#F59E0B', label: 'Amber'  },
  { hex: '#4C8BF5', label: 'Blue'   },
  { hex: '#35C4A1', label: 'Green'  },
  { hex: '#FF5C5C', label: 'Red'    },
  { hex: '#A78BFA', label: 'Violet' },
  { hex: '#6C7686', label: 'Grey'   },
];

export const STRATEGY_DEFAULT_COLOR = '#F59E0B';


export const GROUP_VISIBILITIES = ['public', 'private'];
export const GROUP_ROLES = ['owner', 'moderator', 'member'];

export const GROUP_COLORS = STRATEGY_COLORS;
export const GROUP_DEFAULT_COLOR = '#F59E0B';

export const GROUP_NAME_MAX = 60;
export const GROUP_DESCRIPTION_MAX = 500;
export const GROUP_ICON_EMOJI_MAX = 8;

export const GROUP_DISCOVER_DEFAULT_LIMIT = 50;
export const GROUP_DISCOVER_MAX_LIMIT = 100;


export function normalizeColumnConfig(raw) {
  if (typeof raw === 'string') {
    if (raw === 'text' || raw === 'dropdown' || raw === 'number') {
      return raw === 'dropdown'
        ? { type: 'dropdown', options: [] }
        : { type: raw };
    }
    return { type: 'text' };
  }

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

  return { type: 'text' };
}

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

export function getColumnType(raw) {
  return normalizeColumnConfig(raw).type;
}


export * from './calendar.js';