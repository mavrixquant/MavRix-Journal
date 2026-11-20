import { useMemo, useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { FIB_LEVELS, FIB_PRESET, rrNormalize } from '../drawings';
import { saveDrawingDefaults } from '../chartSettings';
import { parseColor } from '../../utils/colorUtil';
import {
  CheckField, ColorField, LineStyleField, Note, RangeField, Row, Section, WidthField,
} from './fields';
import SettingsDialog from './SettingsDialog';

const TITLES = {
  hline: 'Horizontal line', trend: 'Trend line', ray: 'Ray', rect: 'Rectangle',
  fib: 'Fib retracement', rr: 'Position', measure: 'Measure',
};

const defaultFibLevels = () => FIB_PRESET.map((v) => ({ v, on: FIB_LEVELS.includes(v) }));

function pointLabels(type, n) {
  if (type === 'rr') return n >= 3 ? ['Entry price', 'Stop loss', 'Target'] : ['Entry price', 'Stop loss'];
  if (type === 'hline') return ['Price'];
  if (type === 'fib') return ['Start price (0)', 'End price (1)'];
  return Array.from({ length: n }, (_, i) => `Price ${i + 1}`);
}

/**
 * Settings for one drawing. Edits preview live on the chart (without touching app state, so
 * undo history isn't flooded); OK commits once, Cancel / Esc discards.
 */
export default function DrawingSettingsDialog({
  drawing, precision = 2, onPreview, onCommit, onCancel, onDelete, onDuplicate,
}) {
  const [draft, setDraft] = useState(drawing);
  const [tab, setTab] = useState('style');
  const [text, setText] = useState({});
  const [saved, setSaved] = useState(false);
  const [customLevel, setCustomLevel] = useState('');
  const st = draft.style || {};
  const type = draft.type;

  const apply = (next) => { setDraft(next); onPreview(next); setSaved(false); };
  const setStyle = (patch) => apply({ ...draft, style: { ...(draft.style || {}), ...patch } });
  const setColor = (hex) => apply({ ...draft, color: hex });

  const setPrice = (i, raw) => {
    setText((t) => ({ ...t, [i]: raw }));
    const n = Number(raw);
    if (raw === '' || !Number.isFinite(n) || n <= 0) return;
    let pts = draft.pts.map((q, k) => (k === i ? { ...q, p: n } : q));
    if (type === 'rr' && pts.length === 3) pts = rrNormalize(pts, i);
    apply({ ...draft, pts });
  };

  const tabs = useMemo(() => {
    const t = [{ id: 'style', label: 'Style' }];
    if (type === 'fib') t.push({ id: 'levels', label: 'Levels' });
    t.push({ id: 'coords', label: 'Coordinates' });
    return t;
  }, [type]);

  const levels = st.fibLevels || defaultFibLevels();
  const setLevels = (next) => setStyle({ fibLevels: next });
  const addLevel = () => {
    const v = Number(customLevel);
    if (!Number.isFinite(v) || levels.some((l) => Math.abs(l.v - v) < 1e-9)) return;
    setLevels([...levels, { v, on: true }].sort((a, b) => a.v - b.v));
    setCustomLevel('');
  };

  const labels = pointLabels(type, draft.pts.length);
  const fmt = (v) => (Number.isFinite(v) ? Number(v).toFixed(precision) : '');

  return (
    <SettingsDialog
      title={TITLES[type] || 'Drawing'} dot={draft.color} tabs={tabs} tab={tab} onTab={setTab} onCancel={onCancel}
      footer={(
        <>
          <button type="button" className="cs-btn is-danger" onClick={() => onDelete(draft)} aria-label="Delete drawing"><Trash2 size={13} /></button>
          <button type="button" className="cs-btn" onClick={() => onDuplicate(draft)} aria-label="Duplicate drawing"><Copy size={13} /></button>
          <button type="button" className="cs-btn" onClick={() => apply({ ...draft, style: {} })} disabled={!draft.style || !Object.keys(draft.style).length}>Reset style</button>
          <button type="button" className="cs-btn" onClick={() => { saveDrawingDefaults(type, draft.style || {}); setSaved(true); }}>{saved ? 'Saved ✓' : 'Save as default'}</button>
          <span className="cs-grow" />
          <button type="button" className="cs-btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="cs-btn is-primary" onClick={() => onCommit(draft)}>OK</button>
        </>
      )}
    >
      {tab === 'style' && (
        <>
          {type === 'rr' ? (
            <>
              <Section>Colours</Section>
              <Row label="Profit zone"><ColorField value={st.profitColor || '#35C4A1'} onChange={(c) => setStyle({ profitColor: c })} label="Profit colour" /></Row>
              <Row label="Loss zone"><ColorField value={st.lossColor || '#FF5C5C'} onChange={(c) => setStyle({ lossColor: c })} label="Loss colour" /></Row>
              <Row label="Entry line"><ColorField value={st.entryColor || '#E7E9EE'} onChange={(c) => setStyle({ entryColor: c })} label="Entry colour" /></Row>
            </>
          ) : type === 'measure' ? (
            <>
              <Section>Colours</Section>
              <Row label="Up move"><ColorField value={st.upColor || '#35C4A1'} onChange={(c) => setStyle({ upColor: c })} label="Up colour" /></Row>
              <Row label="Down move"><ColorField value={st.downColor || '#FF5C5C'} onChange={(c) => setStyle({ downColor: c })} label="Down colour" /></Row>
            </>
          ) : (
            <Row label={type === 'rect' ? 'Border colour' : 'Colour'}><ColorField value={parseColor(draft.color).hex} onChange={setColor} /></Row>
          )}

          {type !== 'measure' && (
            <>
              <Section>Line</Section>
              <Row label="Width"><WidthField value={st.width ?? 1.5} onChange={(w) => setStyle({ width: w })} /></Row>
              <Row label="Line style"><LineStyleField value={st.dash} onChange={(v) => setStyle({ dash: v })} allowClassic={type === 'fib'} /></Row>
            </>
          )}

          {(type === 'rect' || type === 'fib' || type === 'rr' || type === 'measure') && (
            <Row label="Fill opacity">
              <RangeField
                value={st.fillOpacity ?? (type === 'rect' ? 0.1 : type === 'rr' ? 0.14 : type === 'fib' ? 0.07 : 0.12)}
                min={0} max={0.6} step={0.02} onChange={(v) => setStyle({ fillOpacity: v })} label="Fill opacity"
              />
            </Row>
          )}

          {type === 'trend' && (
            <>
              <Section>Options</Section>
              <Row check><CheckField id="d-extl" checked={st.extendLeft} onChange={(v) => setStyle({ extendLeft: v })}>Extend left</CheckField></Row>
              <Row check><CheckField id="d-extr" checked={st.extendRight} onChange={(v) => setStyle({ extendRight: v })}>Extend right</CheckField></Row>
              <Row check><CheckField id="d-lbl" checked={st.label} onChange={(v) => setStyle({ label: v })}>Show change, bars and duration</CheckField></Row>
            </>
          )}
          {type === 'hline' && (
            <Row check><CheckField id="d-plabel" checked={st.label !== false} onChange={(v) => setStyle({ label: v })}>Show price label</CheckField></Row>
          )}
          {type === 'measure' && (
            <Row check><CheckField id="d-mlabel" checked={st.label !== false} onChange={(v) => setStyle({ label: v })}>Show measurement label</CheckField></Row>
          )}
          {type === 'fib' && (
            <>
              <Section>Labels</Section>
              <Row check><CheckField id="d-flabel" checked={st.label !== false} onChange={(v) => setStyle({ label: v })}>Show level labels</CheckField></Row>
              <Row check><CheckField id="d-fprice" checked={st.fibPrices !== false} onChange={(v) => setStyle({ fibPrices: v })}>Show prices</CheckField></Row>
              <Row check><CheckField id="d-fpct" checked={!!st.fibPercent} onChange={(v) => setStyle({ fibPercent: v })}>Show levels as percentages</CheckField></Row>
              <Row check><CheckField id="d-ftrend" checked={st.fibTrend !== false} onChange={(v) => setStyle({ fibTrend: v })}>Show trend line</CheckField></Row>
            </>
          )}
          {type === 'rr' && (
            <Row check><CheckField id="d-always" checked={!!st.alwaysLabels} onChange={(v) => setStyle({ alwaysLabels: v })}>Always show details (otherwise only on hover / select)</CheckField></Row>
          )}

          <Section>Behaviour</Section>
          <Row check><CheckField id="d-lock" checked={!!draft.locked} onChange={(v) => apply({ ...draft, locked: v })}>Lock (can’t be moved or resized)</CheckField></Row>
        </>
      )}

      {tab === 'levels' && (
        <>
          <Note>Choose which levels are drawn and give each its own colour. Add custom ratios below.</Note>
          <div className="cs-levels">
            {levels.map((l, i) => (
              <div key={l.v} className={`cs-level${l.on === false ? ' is-off' : ''}`}>
                <input
                  type="checkbox" checked={l.on !== false} aria-label={`Show level ${l.v}`}
                  onChange={(e) => setLevels(levels.map((x, k) => (k === i ? { ...x, on: e.target.checked } : x)))}
                />
                <b>{l.v}</b>
                <input
                  type="color" className="cs-input" style={{ padding: 2, height: 26, maxWidth: 64 }}
                  value={parseColor(l.color || draft.color).hex} aria-label={`Colour for level ${l.v}`}
                  onChange={(e) => setLevels(levels.map((x, k) => (k === i ? { ...x, color: e.target.value } : x)))}
                />
                {!FIB_PRESET.includes(l.v) ? (
                  <button type="button" className="cs-btn" onClick={() => setLevels(levels.filter((_, k) => k !== i))} aria-label={`Remove level ${l.v}`}>Remove</button>
                ) : <span />}
              </div>
            ))}
          </div>
          <Row label="Add level">
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="cs-input" type="number" step="any" placeholder="e.g. 1.414" value={customLevel} onChange={(e) => setCustomLevel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLevel(); } }} />
              <button type="button" className="cs-btn" onClick={addLevel} disabled={customLevel === ''}>Add</button>
            </div>
          </Row>
        </>
      )}

      {tab === 'coords' && (
        <>
          {draft.pts.map((pt, i) => (
            <Row key={i} label={labels[i] || `Price ${i + 1}`} htmlFor={`d-p${i}`}>
              <input
                id={`d-p${i}`} className="cs-input" type="number" step="any"
                value={text[i] ?? fmt(pt.p)} onChange={(e) => setPrice(i, e.target.value)}
                onBlur={() => setText((t) => { const { [i]: _drop, ...rest } = t; return rest; })}
              />
            </Row>
          ))}
          {type === 'rr' && draft.pts.length >= 3 && (
            <Note>The side flips automatically when the stop is moved to the other side of the entry.</Note>
          )}
        </>
      )}
    </SettingsDialog>
  );
}
