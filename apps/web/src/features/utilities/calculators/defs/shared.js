/** Result tile factory — keeps calculator definitions terse. */
export const tile = (label, value, kind = 'num', o = {}) => ({ label, value, kind, ...o });

export const sideField = (def = 'long') => ({
  key: 'side',
  label: 'Direction',
  type: 'segment',
  default: def,
  options: [
    { value: 'long', label: 'Long' },
    { value: 'short', label: 'Short' },
  ],
});

export const riskModeField = {
  key: 'riskMode',
  label: 'Risk as',
  type: 'segment',
  default: 'pct',
  options: [
    { value: 'pct', label: '% of account' },
    { value: 'usd', label: '$ amount' },
  ],
};

export const riskValueField = {
  key: 'riskValue',
  label: 'Risk per trade',
  default: '1',
  step: 0.25,
  min: 0,
  prefix: (p) => (p.riskMode === 'usd' ? '$' : ''),
  suffix: (p) => (p.riskMode === 'pct' ? '%' : ''),
};
