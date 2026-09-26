// Values shared by the API and the web app.

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