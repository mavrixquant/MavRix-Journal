import { useState } from 'react';
import { parseNumberList } from '../lib/format';

export function Field({ label, hint, action, children }) {
  return (
    <div className="sx-field">
      <div className="sx-field-head">
        <span className="sx-label">{label}</span>
        {action}
      </div>
      {children}
      {hint && <div className="sx-hint">{hint}</div>}
    </div>
  );
}

/** Numeric input with a local draft; commits on blur / Enter. */
export function NumField({
  value,
  onCommit,
  prefix,
  suffix,
  min = 0,
  max,
  disabled,
  placeholder,
  label,
  right,
}) {
  const [draft, setDraft] = useState(null);
  const shown = draft ?? (value == null ? '' : String(value));

  const commit = () => {
    if (draft == null) return;
    const text = draft.trim().replace(/[$,]/g, '');
    setDraft(null);
    if (text === '') return;
    let v = Number(text);
    if (!Number.isFinite(v)) return;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    onCommit(v);
  };

  return (
    <div className={`sx-input ${disabled ? 'is-disabled' : ''}`}>
      {prefix && <span className="sx-input-affix">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={shown}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') setDraft(null);
        }}
      />
      {suffix && <span className="sx-input-affix">{suffix}</span>}
      {right}
    </div>
  );
}

/** Comma / space separated list of positive numbers. */
export function NumListField({ value, onCommit, label, format = (v) => String(v) }) {
  const [draft, setDraft] = useState(null);
  const shown = draft ?? value.map(format).join(', ');

  const commit = () => {
    if (draft == null) return;
    const list = parseNumberList(draft);
    setDraft(null);
    if (list.length) onCommit([...new Set(list)].sort((a, b) => a - b).slice(0, 8));
  };

  return (
    <div className="sx-input">
      <input
        type="text"
        aria-label={label}
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') setDraft(null);
        }}
      />
    </div>
  );
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="sx-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          title={o.title}
          className={value === o.value ? 'is-active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips({ options, onPick, activeValue }) {
  return (
    <div className="sx-chips">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          className={`sx-chip ${activeValue === o.value ? 'is-active' : ''}`}
          onClick={() => onPick(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
