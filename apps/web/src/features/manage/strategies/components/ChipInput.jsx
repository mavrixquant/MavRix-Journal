import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';

export default function ChipInput({ value, onChange, max, maxLen = 40, placeholder, transform, disabled }) {
  const [text, setText] = useState('');

  const commit = () => {
    let v = text.trim().slice(0, maxLen);
    if (transform) v = transform(v);
    setText('');
    if (!v || value.includes(v) || value.length >= max) return;
    onChange([...value, v]);
  };

  return (
    <div className={`sx-chips ${disabled ? 'is-disabled' : ''}`}>
      {value.map((t) => (
        <span key={t} className="sx-chip-tag">
          {t}
          <button type="button" aria-label={`Remove ${t}`} disabled={disabled} onClick={() => onChange(value.filter((x) => x !== t))}>
            <FaTimes size={8} />
          </button>
        </span>
      ))}
      <input
        value={text}
        disabled={disabled || value.length >= max}
        maxLength={maxLen}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
          else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => text.trim() && commit()}
      />
    </div>
  );
}
