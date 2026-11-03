import { useId } from 'react';
import { num, decimalsOf } from '../lib/math.js';

function Shell({ label, optional, hint, full, htmlFor, children }) {
  return (
    <div className={`cx-field${full ? ' is-full' : ''}`}>
      <label className="cx-label" htmlFor={htmlFor}>
        {label}
        {optional && <em>optional</em>}
      </label>
      {children}
      {hint && <span className="cx-hint">{hint}</span>}
    </div>
  );
}

/** Text input with numeric keyboard, select-on-focus, ↑/↓ stepping (Shift ×10, Alt ×0.1). */
export function NumberField({ label, value, onChange, prefix, suffix, step = 1, min, hint, optional, full }) {
  const id = useId();
  const bad = value !== '' && Number.isNaN(num(value));

  const onKeyDown = (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const cur = num(value);
    const base = Number.isFinite(cur) ? cur : 0;
    const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    const inc = step * mult;
    let next = base + (e.key === 'ArrowUp' ? inc : -inc);
    if (min !== undefined) next = Math.max(min, next);
    const prec = Math.min(8, Math.max(decimalsOf(inc), decimalsOf(base)));
    onChange(String(Number(next.toFixed(prec))));
  };

  return (
    <Shell label={label} optional={optional} hint={hint} full={full} htmlFor={id}>
      <div className={`cx-wrap${bad ? ' is-bad' : ''}`}>
        {prefix && <span className="cx-affix">{prefix}</span>}
        <input
          id={id}
          className="cx-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder="0"
          aria-invalid={bad}
          onFocus={(e) => e.target.select()}
          onKeyDown={onKeyDown}
          onChange={(e) => {
            const v = e.target.value;
            if (/^-?[\d,]*\.?\d*$/.test(v)) onChange(v);
          }}
        />
        {suffix && <span className="cx-affix">{suffix}</span>}
      </div>
    </Shell>
  );
}

export function SelectField({ label, value, onChange, options, hint, full = true }) {
  const id = useId();
  return (
    <Shell label={label} hint={hint} full={full} htmlFor={id}>
      <div className="cx-wrap">
        <select id={id} className="cx-input cx-select" value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </Shell>
  );
}

export function SegmentField({ label, value, onChange, options, hint }) {
  const id = useId();
  return (
    <Shell label={label} hint={hint} full htmlFor={id}>
      <div className="cx-seg" role="radiogroup" aria-label={label} id={id}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? 'is-active' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Shell>
  );
}

export function TextAreaField({ label, value, onChange, rows = 4, hint }) {
  const id = useId();
  return (
    <Shell label={label} hint={hint} full htmlFor={id}>
      <div className="cx-wrap is-area">
        <textarea
          id={id}
          className="cx-input cx-textarea"
          rows={rows}
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Shell>
  );
}
