import { Check } from 'lucide-react';
import { LINE_STYLES, isHexColor, parseColor } from '../../utils/colorUtil';

const PALETTE = [
  '#F5B544', '#FF5C5C', '#35C4A1', '#5EA8FF', '#B58CFF', '#FF8AD8',
  '#FFD166', '#7DD3FC', '#E7E9EE', '#8892A3',
];

export function Row({ label, htmlFor, children, check }) {
  return (
    <div className={`cs-row${check ? ' is-check' : ''}`}>
      {!check && (htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span className="cs-lbl">{label}</span>)}
      <div>{children}</div>
    </div>
  );
}

export const Section = ({ children }) => <div className="cs-sect">{children}</div>;
export const Note = ({ children }) => <p className="cs-note">{children}</p>;

export function ColorField({ value, onChange, label = 'Colour' }) {
  const hex = parseColor(value).hex;
  return (
    <div className="cs-colors" role="group" aria-label={label}>
      {PALETTE.map((c) => (
        <button
          key={c} type="button" className={`cs-sw${hex === c ? ' is-on' : ''}`} style={{ background: c }}
          onClick={() => onChange(c)} aria-label={`${label} ${c}`} aria-pressed={hex === c}
        />
      ))}
      <label className="cs-custom" title="Custom colour" style={!PALETTE.includes(hex) && isHexColor(hex) ? { background: hex, borderStyle: 'solid' } : undefined}>
        {PALETTE.includes(hex) ? '+' : <Check size={11} color="#0A0D14" />}
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} aria-label={`Custom ${label}`} />
      </label>
    </div>
  );
}

export function RangeField({ value, onChange, min = 0, max = 1, step = 0.05, format, id, label }) {
  const out = format ? format(value) : `${Math.round(value * 100)}%`;
  return (
    <div className="cs-range">
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
      <output>{out}</output>
    </div>
  );
}

export function WidthField({ value, onChange }) {
  const opts = [1, 1.5, 2, 3, 4];
  return (
    <div className="cs-seg" role="group" aria-label="Line width">
      {opts.map((w) => (
        <button key={w} type="button" className={Math.abs(value - w) < 0.01 ? 'is-on' : ''} onClick={() => onChange(w)} aria-pressed={Math.abs(value - w) < 0.01} title={`${w}px`}>
          <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden><line x1="1" y1="5" x2="21" y2="5" stroke="currentColor" strokeWidth={w} strokeLinecap="round" /></svg>
        </button>
      ))}
    </div>
  );
}

export function LineStyleField({ value, onChange, allowClassic = false }) {
  const dashFor = { solid: undefined, dashed: '6 3.5', dotted: '1.5 3' };
  return (
    <div className="cs-seg" role="group" aria-label="Line style">
      {allowClassic && (
        <button type="button" className={!value ? 'is-on' : ''} onClick={() => onChange(undefined)} aria-pressed={!value}>Classic</button>
      )}
      {LINE_STYLES.map((s) => (
        <button key={s.id} type="button" className={value === s.id ? 'is-on' : ''} onClick={() => onChange(s.id)} aria-pressed={value === s.id} title={s.label} aria-label={s.label}>
          <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden><line x1="1" y1="5" x2="25" y2="5" stroke="currentColor" strokeWidth="2" strokeDasharray={dashFor[s.id]} strokeLinecap="round" /></svg>
        </button>
      ))}
    </div>
  );
}

export function CheckField({ checked, onChange, children, id }) {
  return (
    <label className="cs-check" htmlFor={id}>
      <input id={id} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export function NumberField({ value, onChange, min, max, step = 'any', id, int }) {
  return (
    <input
      id={id} className="cs-input" type="number" min={min} max={max} step={int ? 1 : step}
      value={value} onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function SelectField({ value, onChange, options, id }) {
  return (
    <select id={id} className="cs-input" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
