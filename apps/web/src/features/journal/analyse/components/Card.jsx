export function Card({ title, note, right, height, flush, className = '', children }) {
  return (
    <section className={`ax-card ${className}`}>
      <header className="ax-card-head">
        <span className="ax-card-title">{title}</span>
        {note && <span className="ax-card-note">{note}</span>}
        {right && <div className="ax-card-right">{right}</div>}
      </header>
      <div
        className={`ax-card-body ${flush ? 'is-flush' : ''}`}
        style={height ? { height } : undefined}
      >
        {children}
      </div>
    </section>
  );
}

/** Segmented control. Uses the dashboard's `.sg` styles. */
export function Seg({ value, options, onChange, label }) {
  return (
    <div className="sg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? 'on' : ''}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="pc-empty">
      <b>{title}</b>
      {children && <span>{children}</span>}
    </div>
  );
}

export function fmtDuration(minutes) {
  const m = Math.round(Number(minutes) || 0);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function fmtPF(v) {
  if (v === Infinity) return '\u221e';
  if (v == null || Number.isNaN(v)) return '-';
  return v.toFixed(2);
}
