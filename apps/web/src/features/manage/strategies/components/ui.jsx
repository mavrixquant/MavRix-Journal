import { useEffect, useRef, useState } from 'react';
import { FaEllipsisH } from 'react-icons/fa';
import { RANGES, ACCOUNT_SCOPES } from '../lib/format';

export function StatusPill({ status }) {
  return <span className={`sx-status is-${status}`}>{status}</span>;
}

export function Stat({ label, value, sub, tone, hint }) {
  return (
    <div className="sx-stat" title={hint}>
      <span className="sx-stat-label">{label}</span>
      <span className={`sx-stat-value ${tone || ''}`}>{value}</span>
      {sub != null && <span className="sx-stat-sub">{sub}</span>}
    </div>
  );
}

export function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div className="sx-seg-bar" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.id} type="button" className={value === o.id ? 'is-active' : ''} onClick={() => onChange(o.id)}>
          {o.label}
          {o.count != null && <em>{o.count}</em>}
        </button>
      ))}
    </div>
  );
}

export function ScopeBar({ account, onAccount, range, onRange, extra }) {
  return (
    <div className="sx-scope">
      <Segmented ariaLabel="Account type" value={account} onChange={onAccount}
        options={ACCOUNT_SCOPES.map((a) => ({ id: a, label: a === 'all' ? 'All accounts' : a }))} />
      <Segmented ariaLabel="Date range" value={range} onChange={onRange} options={RANGES} />
      {extra}
    </div>
  );
}

export function Menu({ items, label = 'More actions' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div className="sx-menu" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="sx-icon-btn" aria-label={label} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <FaEllipsisH size={12} />
      </button>
      {open && (
        <div className="sx-menu-pop" role="menu">
          {items.filter(Boolean).map((it) => (
            <button key={it.label} type="button" role="menuitem" className={it.danger ? 'is-danger' : ''} disabled={it.disabled}
              onClick={() => { setOpen(false); it.onClick(); }}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
