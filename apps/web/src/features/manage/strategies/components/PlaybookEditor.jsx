import { FaArrowUp, FaArrowDown, FaTimes, FaPlus } from 'react-icons/fa';
import { PLAYBOOK_SECTIONS, PLAYBOOK_MAX_ITEMS } from '@mavrix/shared';

const newId = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export default function PlaybookEditor({ value, onChange, disabled }) {
  const setList = (key, list) => onChange({ ...value, [key]: list });

  return (
    <div className="sx-pb-edit">
      {PLAYBOOK_SECTIONS.map((sec) => {
        const list = value[sec.key] || [];
        const update = (i, text) => setList(sec.key, list.map((r, idx) => (idx === i ? { ...r, text } : r)));
        const move = (i, d) => {
          const j = i + d;
          if (j < 0 || j >= list.length) return;
          const next = [...list];
          [next[i], next[j]] = [next[j], next[i]];
          setList(sec.key, next);
        };
        const add = (at = list.length) => {
          if (list.length >= PLAYBOOK_MAX_ITEMS) return;
          const next = [...list];
          next.splice(at, 0, { id: newId(), text: '' });
          setList(sec.key, next);
          requestAnimationFrame(() => document.getElementById(`pb-${sec.key}-${at}`)?.focus());
        };

        return (
          <section key={sec.key} className="sx-pb-sec">
            <header>
              <div>
                <h4>{sec.label}</h4>
                <p>{sec.hint}</p>
              </div>
              <span className="sx-pb-count">{list.length}/{PLAYBOOK_MAX_ITEMS}</span>
            </header>

            {list.map((r, i) => (
              <div key={r.id} className="sx-pb-row">
                <span className="sx-pb-idx">{i + 1}</span>
                <input
                  id={`pb-${sec.key}-${i}`}
                  value={r.text}
                  maxLength={240}
                  disabled={disabled}
                  placeholder={sec.placeholder}
                  onChange={(e) => update(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); add(i + 1); }
                    if (e.key === 'Backspace' && !r.text) { e.preventDefault(); setList(sec.key, list.filter((_, idx) => idx !== i)); }
                  }}
                />
                <button type="button" className="sx-mini" onClick={() => move(i, -1)} disabled={disabled || i === 0} aria-label="Move up"><FaArrowUp size={9} /></button>
                <button type="button" className="sx-mini" onClick={() => move(i, 1)} disabled={disabled || i === list.length - 1} aria-label="Move down"><FaArrowDown size={9} /></button>
                <button type="button" className="sx-mini is-danger" onClick={() => setList(sec.key, list.filter((_, idx) => idx !== i))} disabled={disabled} aria-label="Remove rule"><FaTimes size={9} /></button>
              </div>
            ))}

            <button type="button" className="sx-add-rule" onClick={() => add()} disabled={disabled || list.length >= PLAYBOOK_MAX_ITEMS}>
              <FaPlus size={9} /> Add rule
            </button>
          </section>
        );
      })}
    </div>
  );
}
