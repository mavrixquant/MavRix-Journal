import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Calculator, Clipboard, ClipboardCheck, Info, RotateCcw } from 'lucide-react';
import { NumberField, SegmentField, SelectField, TextAreaField } from './Fields';
import ResultTile, { copyToClipboard } from './ResultTile';
import ResultTable from './ResultTable';
import { num } from '../lib/math.js';
import { formatValue } from '../lib/format.js';
import { loadValues, saveValues } from '../lib/storage.js';

const resolve = (x, p) => (typeof x === 'function' ? x(p) : x);

/**
 * Renders any calculator definition from the registry:
 * inputs (persisted per calculator) on the left, live results on the right.
 */
export default function CalculatorEngine({ calc }) {
  const rootRef = useRef(null);
  const copyTimer = useRef(null);
  const [copied, setCopied] = useState(false);

  const defaults = useMemo(
    () => Object.fromEntries(calc.fields.map((f) => [f.key, String(f.default ?? '')])),
    [calc]
  );

  const [values, setValues] = useState(() => {
    const saved = loadValues(calc.id);
    const merged = { ...defaults };
    Object.keys(defaults).forEach((k) => {
      if (typeof saved[k] === 'string') merged[k] = saved[k];
    });
    return merged;
  });

  useEffect(() => saveValues(calc.id, values), [calc.id, values]);
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const parsed = useMemo(() => {
    const o = {};
    calc.fields.forEach((f) => {
      o[f.key] = f.type && f.type !== 'number' ? values[f.key] : num(values[f.key]);
    });
    return o;
  }, [calc, values]);

  const result = useMemo(() => {
    try {
      return calc.compute(parsed) ?? null;
    } catch {
      return { error: 'Could not calculate with these inputs.' };
    }
  }, [calc, parsed]);

  const setField = useCallback((key, v) => setValues((s) => ({ ...s, [key]: v })), []);
  const reset = () => setValues(defaults);

  /* Enter moves to the next input, like a spreadsheet. */
  const onKeyDown = (e) => {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
    const els = [...(rootRef.current?.querySelectorAll('.cx-fields .cx-input') ?? [])];
    const i = els.indexOf(e.target);
    if (i < 0) return;
    e.preventDefault();
    if (els[i + 1]) els[i + 1].focus();
    else e.target.blur();
  };

  const copySummary = async () => {
    if (!result?.tiles) return;
    const lines = result.tiles.map((t) => `${t.label}: ${formatValue(t.value, t.kind, t.decimals)}`);
    if (await copyToClipboard(`${calc.title}\n${lines.join('\n')}`, 'Results copied')) {
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1400);
    }
  };

  const tables = result?.tables ?? (result?.table ? [result.table] : []);

  return (
    <div className="cx-layout" ref={rootRef} onKeyDown={onKeyDown}>
      <section className="cx-panel" aria-label="Inputs">
        <div className="cx-phead">
          <span className="cx-ptitle">Inputs</span>
          <div className="cx-pactions">
            <button type="button" className="cx-btn" onClick={reset} title="Restore default values">
              <RotateCcw size={11} /> Reset
            </button>
          </div>
        </div>
        <div className="cx-pbody">
          <div className="cx-fields">
            {calc.fields.map((f) => {
              if (f.showIf && !f.showIf(parsed)) return null;
              const common = {
                label: f.label,
                value: values[f.key],
                onChange: (v) => setField(f.key, v),
                hint: resolve(f.hint, parsed),
              };
              if (f.type === 'select') return <SelectField key={f.key} {...common} options={f.options} full={!f.half} />;
              if (f.type === 'segment') return <SegmentField key={f.key} {...common} options={f.options} />;
              if (f.type === 'textarea') return <TextAreaField key={f.key} {...common} rows={f.rows} />;
              return (
                <NumberField
                  key={f.key}
                  {...common}
                  prefix={resolve(f.prefix, parsed)}
                  suffix={resolve(f.suffix, parsed)}
                  step={resolve(f.step, parsed) ?? 1}
                  min={f.min}
                  optional={f.optional}
                />
              );
            })}
          </div>
        </div>
      </section>

      <section className="cx-panel cx-out" aria-label="Results" aria-live="polite">
        <div className="cx-phead">
          <span className="cx-ptitle">Results</span>
          {result?.tiles && (
            <div className="cx-pactions">
              <button type="button" className={`cx-btn${copied ? ' is-copied' : ''}`} onClick={copySummary}>
                {copied ? <ClipboardCheck size={11} /> : <Clipboard size={11} />} {copied ? 'Copied' : 'Copy all'}
              </button>
            </div>
          )}
        </div>
        <div className="cx-pbody">
          {!result && (
            <div className="cx-idle">
              <Calculator size={26} />
              Fill in the inputs to see your results.
              <br />
              Everything updates as you type.
            </div>
          )}

          {result?.error && (
            <div className="cx-alert is-error" role="alert">
              <AlertTriangle size={15} /> <span>{result.error}</span>
            </div>
          )}

          {result?.warning && (
            <div className="cx-alert is-warn" role="status">
              <AlertTriangle size={15} /> <span>{result.warning}</span>
            </div>
          )}

          {result?.tiles && (
            <div className="cx-results">
              {result.tiles.map((t) => (
                <ResultTile key={t.label} {...t} />
              ))}
            </div>
          )}

          {tables.map((t) => (
            <ResultTable key={t.title} {...t} />
          ))}

          {result?.notes?.length > 0 && (
            <ul className="cx-notes">
              {result.notes.map((n) => (
                <li key={n}><Info size={12} /> <span>{n}</span></li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
