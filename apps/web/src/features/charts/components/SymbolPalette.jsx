import { useEffect, useMemo } from 'react';
import { Check, Search } from 'lucide-react';
import { Command } from 'cmdk';

import { SymbolIcon } from '@/shared/symbols';

// Full-screen symbol search (opens with "/" or Ctrl/Cmd+K).
export default function SymbolPalette({ open, onClose, catalog = [], value, onPick }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  const grouped = useMemo(() => {
    const m = new Map();
    for (const s of catalog) {
      if (!m.has(s.category)) m.set(s.category, []);
      m.get(s.category).push(s);
    }
    return [...m.entries()];
  }, [catalog]);

  if (!open) return null;

  return (
    <div className="mk-pal-scrim" onMouseDown={onClose}>
      <div className="mk-pal" role="dialog" aria-label="Search symbols" onMouseDown={(e) => e.stopPropagation()}>
        <Command className="mk-pal-cmd" loop>
          <div className="mk-pal-input">
            <Search size={14} />
            <Command.Input autoFocus placeholder="Search symbol, name or exchange…" autoComplete="off" spellCheck={false} />
            <kbd>Esc</kbd>
          </div>
          <Command.List className="mk-pal-list">
            <Command.Empty className="mk-pal-empty">No symbols match. Try NQ, EUR, or BTC.</Command.Empty>
            {grouped.map(([category, items]) => (
              <Command.Group key={category} heading={category} className="mk-pal-group">
                {items.map((s) => (
                  <Command.Item
                    key={s.code}
                    value={`${s.code} ${s.label} ${s.category} ${s.exchange || ''}`}
                    onSelect={() => { onPick(s.code); onClose(); }}
                    className="mk-pal-item"
                  >
                    <SymbolIcon symbol={s.code} size={20} />
                    <b>{s.code}</b>
                    <span>{s.label}</span>
                    {s.exchange && <em>{s.exchange}</em>}
                    {s.hasData === false && <u>no data</u>}
                    {s.code === value && <Check size={13} className="mk-check" />}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
