import { useMemo, useRef, useState } from 'react';
import { INDICATOR_BY_ID, indicatorStore } from '../../lib/indicators';
import { composeColor, parseColor } from '../../lib/colorUtil';
import {
  CheckField, ColorField, LineStyleField, NumberField, Note, RangeField, Row, SelectField, Section, WidthField,
} from './fields';
import SettingsDialog from './SettingsDialog';

/**
 * Indicator settings. Changes apply live (the chart reads the store); Cancel restores
 * the snapshot taken when the dialog opened.
 */
export default function IndicatorSettingsDialog({ indicatorId, onClose }) {
  const ind = INDICATOR_BY_ID[indicatorId];
  const snapshot = useRef(indicatorStore.snapshot(indicatorId));
  const [, force] = useState(0);
  const [tab, setTab] = useState('inputs');
  const [errors, setErrors] = useState({});

  const ov = indicatorStore.get(indicatorId);
  const params = ind.params;
  const lines = ind.lines;
  const bump = () => force((n) => n + 1);

  const setParam = (spec, raw) => {
    const n = Number(raw);
    if (spec.type === 'select') {
      indicatorStore.patch(indicatorId, (o) => ({ ...o, params: { ...(o.params || {}), [spec.key]: raw } }));
      return bump();
    }
    const bad = raw === '' || !Number.isFinite(n) || n < spec.min || n > spec.max || (spec.type === 'int' && !Number.isInteger(n));
    setErrors((e) => ({ ...e, [spec.key]: bad ? `${spec.min}–${spec.max}${spec.type === 'int' ? ', whole number' : ''}` : '' }));
    if (!bad) indicatorStore.patch(indicatorId, (o) => ({ ...o, params: { ...(o.params || {}), [spec.key]: n } }));
    return bump();
  };
  // text shown while typing, so an invalid value doesn't snap back under the cursor
  const [draftVals, setDraftVals] = useState({});

  const setLine = (k, patch) => {
    indicatorStore.patch(indicatorId, (o) => ({ ...o, lines: { ...(o.lines || {}), [k]: { ...((o.lines || {})[k] || {}), ...patch } } }));
    bump();
  };

  const reset = () => { indicatorStore.set(indicatorId, null); setDraftVals({}); setErrors({}); bump(); };
  const cancel = () => { indicatorStore.set(indicatorId, Object.keys(snapshot.current).length ? snapshot.current : null); onClose(); };
  const hasErr = Object.values(errors).some(Boolean);

  const tabs = useMemo(() => [{ id: 'inputs', label: 'Inputs' }, { id: 'style', label: 'Style' }], []);
  const primary = lines.find((l) => l.k === ind.primary) || lines[0];

  return (
    <SettingsDialog
      title={ind.label} dot={primary.color} tabs={tabs} tab={tab} onTab={setTab} onCancel={cancel}
      footer={(
        <>
          <button type="button" className="cs-btn" onClick={reset} disabled={!indicatorStore.isModified(indicatorId)}>Reset to defaults</button>
          <span className="cs-grow" />
          <button type="button" className="cs-btn" onClick={cancel}>Cancel</button>
          <button type="button" className="cs-btn is-primary" onClick={onClose} disabled={hasErr}>OK</button>
        </>
      )}
    >
      {tab === 'inputs' && (
        <>
          {ind.paramSpecs.map((spec) => {
            const id = `ind-${indicatorId}-${spec.key}`;
            const v = draftVals[spec.key] ?? params[spec.key];
            return (
              <Row key={spec.key} label={spec.label} htmlFor={id}>
                {spec.type === 'select' ? (
                  <SelectField id={id} value={params[spec.key]} options={spec.options} onChange={(x) => setParam(spec, x)} />
                ) : (
                  <>
                    <NumberField
                      id={id} value={v} min={spec.min} max={spec.max} step={spec.step} int={spec.type === 'int'}
                      onChange={(raw) => { setDraftVals((d) => ({ ...d, [spec.key]: raw })); setParam(spec, raw); }}
                    />
                    {errors[spec.key] && <small style={{ color: '#FF8F8F', fontSize: 11 }}>{errors[spec.key]}</small>}
                  </>
                )}
              </Row>
            );
          })}
          {ind.paramSpecs.length === 0 && <Note>This indicator has no inputs.</Note>}
          {ind.intradayOnly && <Note>Resets every day, so it is only drawn on intraday timeframes.</Note>}
        </>
      )}

      {tab === 'style' && (
        <div className="cs-lines">
          {lines.map((ln) => {
            const o = (ov.lines || {})[ln.k] || {};
            const parsed = parseColor(ln.color);
            const hist = ln.type === 'hist';
            const setColor = (hex) => setLine(ln.k, { color: hex });
            return (
              <div key={ln.k} className={`cs-line${ln.visible ? '' : ' is-off'}`}>
                <div className="cs-line-head">
                  <CheckField id={`ln-${ln.k}`} checked={ln.visible} onChange={(v) => setLine(ln.k, { visible: v })}>{ln.name || ln.k}</CheckField>
                </div>
                <Row label={hist ? 'Up colour' : 'Colour'}><ColorField value={parsed.hex} onChange={setColor} label={`${ln.name} colour`} /></Row>
                {hist && (
                  <Row label="Down colour">
                    <ColorField value={parseColor(ln.colorDown).hex} onChange={(hex) => setLine(ln.k, { colorDown: hex })} label={`${ln.name} down colour`} />
                  </Row>
                )}
                <Row label="Opacity"><RangeField value={o.opacity ?? parsed.alpha} min={0.1} max={1} step={0.05} onChange={(v) => setLine(ln.k, { opacity: v })} label={`${ln.name} opacity`} /></Row>
                {!hist && (
                  <>
                    <Row label="Width"><WidthField value={ln.width ?? 2} onChange={(w) => setLine(ln.k, { width: w })} /></Row>
                    <Row label="Line style"><LineStyleField value={ln.lineStyle} onChange={(st) => setLine(ln.k, { style: st })} /></Row>
                  </>
                )}
              </div>
            );
          })}
          {ind.levels && (<><Section>Levels</Section><Note>Overbought / oversold lines follow the values on the Inputs tab.</Note></>)}
        </div>
      )}
    </SettingsDialog>
  );
}

// kept for tests / hosts that want a one-off colour string
export { composeColor };
