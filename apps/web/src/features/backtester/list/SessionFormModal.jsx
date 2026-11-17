import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import Portal from '@/shared/components/Portal';
import { SymbolSelect } from '@/shared/symbols';
import { useCreateBacktestSession } from '@/shared/api/backtestSessions';
import {
  CURRENCIES, BACKTEST_INTERVALS, BACKTEST_INTERVAL_MAX_DAYS, BACKTEST_MAX_INSTRUMENTS,
  BACKTEST_DEFAULT_INSTRUMENT, PROP_FIRMS, PROP_DEFAULTS, backtestSessionSchema,
} from '@mavrix/shared';

import { daysBetweenIso, todayIso } from '../lib/time';
import { fmtMoney } from '../lib/format';

const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

function initialForm() {
  const to = addDays(todayIso(), -1);
  return {
    type: 'standard',
    name: '',
    balance: '50000',
    currency: 'USD',
    fromDate: addDays(to, -29),
    toDate: to,
    instruments: [BACKTEST_DEFAULT_INSTRUMENT],
    interval: '5m',
    firmName: 'FTMO',
    firmNameCustom: '',
    accountSize: '50000',
    sizeTouched: false,
    profitTargetPct: String(PROP_DEFAULTS.profitTargetPct),
    maxDailyLossPct: String(PROP_DEFAULTS.maxDailyLossPct),
    maxTotalLossPct: String(PROP_DEFAULTS.maxTotalLossPct),
    minTradingDays: String(PROP_DEFAULTS.minTradingDays),
    maxPositionSize: '',
    notes: '',
  };
}

const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

function toPayload(f) {
  const payload = {
    name: f.name.trim(),
    type: f.type,
    currency: f.currency,
    startingBalance: num(f.balance),
    fromDate: f.fromDate,
    toDate: f.toDate,
    instruments: f.instruments,
    interval: f.interval,
  };
  if (f.type === 'prop') {
    payload.propFirmConfig = {
      firmName: f.firmName,
      ...(f.firmName === 'Other' ? { firmNameCustom: f.firmNameCustom.trim() } : {}),
      accountSize: num(f.accountSize),
      profitTargetPct: num(f.profitTargetPct),
      maxDailyLossPct: num(f.maxDailyLossPct),
      maxTotalLossPct: num(f.maxTotalLossPct),
      minTradingDays: num(f.minTradingDays) ?? 0,
      ...(num(f.maxPositionSize) ? { maxPositionSize: num(f.maxPositionSize) } : {}),
      ...(f.notes.trim() ? { notes: f.notes.trim() } : {}),
    };
  }
  return payload;
}

function checkBasics(f) {
  if (!f.name.trim()) return 'Give the session a name.';
  const bal = num(f.balance);
  if (!bal || bal <= 0) return 'Enter an account balance above zero.';
  if (!f.fromDate || !f.toDate) return 'Pick a start and end date.';
  if (f.fromDate > f.toDate) return 'The end date must be after the start date.';
  if (f.toDate > todayIso()) return 'The end date can’t be in the future.';
  const max = BACKTEST_INTERVAL_MAX_DAYS[f.interval];
  const days = daysBetweenIso(f.fromDate, f.toDate);
  if (days > max) return `${f.interval} sessions can cover at most ${max} days (you picked ${days}). Shorten the range or use a higher interval.`;
  if (f.instruments.length === 0) return 'Pick at least one instrument.';
  return null;
}

function checkProp(f) {
  if (f.firmName === 'Other' && !f.firmNameCustom.trim()) return 'Enter the firm name.';
  const checks = [
    ['accountSize', 'Account size', (v) => v > 0],
    ['profitTargetPct', 'Profit target', (v) => v > 0 && v <= 100],
    ['maxDailyLossPct', 'Max daily loss', (v) => v > 0 && v <= 100],
    ['maxTotalLossPct', 'Max total loss', (v) => v > 0 && v <= 100],
  ];
  for (const [k, label, ok] of checks) {
    const v = num(f[k]);
    if (v == null || !ok(v)) return `${label} must be a valid number${k.endsWith('Pct') ? ' between 0 and 100' : ' above zero'}.`;
  }
  const d = num(f.minTradingDays);
  if (d == null || d < 0 || !Number.isInteger(d)) return 'Minimum trading days must be a whole number (0 or more).';
  if (f.maxPositionSize !== '' && !(num(f.maxPositionSize) > 0)) return 'Max position size must be above zero (or leave it empty).';
  if (num(f.maxDailyLossPct) > num(f.maxTotalLossPct)) return 'Daily loss limit can’t exceed the total loss limit.';
  return null;
}

export default function SessionFormModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const createM = useCreateBacktestSession();
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const saving = createM.isPending;

  const steps = useMemo(
    () => (form.type === 'prop' ? ['Basics', 'Prop rules', 'Review'] : ['Basics', 'Review']),
    [form.type],
  );
  const stepName = steps[step];

  useEffect(() => {
    if (!isOpen) return;
    setForm(initialForm());
    setStep(0);
    setError('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const set = (k, v) => setForm((p) => {
    const next = { ...p, [k]: v };
    if (k === 'balance' && !p.sizeTouched) next.accountSize = v;
    if (k === 'accountSize') next.sizeTouched = true;
    if (k === 'type' && v === 'prop' && !p.sizeTouched) next.accountSize = p.balance;
    return next;
  });

  const addInstrument = (code) => {
    if (!code || form.instruments.includes(code)) return;
    if (form.instruments.length >= BACKTEST_MAX_INSTRUMENTS) { setError(`You can add up to ${BACKTEST_MAX_INSTRUMENTS} instruments.`); return; }
    set('instruments', [...form.instruments, code]);
    setError('');
  };
  const removeInstrument = (code) => set('instruments', form.instruments.filter((x) => x !== code));

  const validateCurrent = () => {
    if (stepName === 'Basics') return checkBasics(form);
    if (stepName === 'Prop rules') return checkProp(form);
    return null;
  };

  const next = () => {
    const err = validateCurrent();
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const back = () => { setError(''); setStep((s) => Math.max(0, s - 1)); };

  const submit = async (e) => {
    e?.preventDefault();
    if (stepName !== 'Review') { next(); return; }
    const err = checkBasics(form) || (form.type === 'prop' ? checkProp(form) : null);
    if (err) { setError(err); return; }

    const payload = toPayload(form);
    const parsed = backtestSessionSchema.safeParse(payload);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Check the form and try again.'); return; }

    try {
      const session = await createM.mutateAsync(parsed.data);
      toast.success(`Session “${session.name}” created`);
      onClose();
      navigate(`/backtester/${session.id}/replay`);
    } catch (ex) {
      setError(ex?.message || 'Could not create the session.');
    }
  };

  const days = form.fromDate && form.toDate && form.fromDate <= form.toDate ? daysBetweenIso(form.fromDate, form.toDate) : 0;
  const maxDays = BACKTEST_INTERVAL_MAX_DAYS[form.interval];
  const cfgFirm = form.firmName === 'Other' ? form.firmNameCustom || 'Other' : form.firmName;

  return (
    <Portal>
      <div className="bt-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
        <form className="bt-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label="New backtest session">
          <div className="bt-modal-head">
            <div className="bt-modal-titles">
              <h2>New session</h2>
              <p>{form.name.trim() || 'Untitled session'}</p>
            </div>
            <button type="button" className="bt-icon-btn" onClick={onClose} disabled={saving} aria-label="Close"><X size={16} /></button>
          </div>

          <ol className="bt-steps" aria-label="Progress">
            {steps.map((s, i) => (
              <li key={s} className={i === step ? 'is-on' : i < step ? 'is-done' : ''}>
                <span>{i < step ? <Check size={11} /> : i + 1}</span>{s}
              </li>
            ))}
          </ol>

          <div className="bt-modal-body">
            {error && <div className="bt-error" role="alert">{error}</div>}

            {stepName === 'Basics' && (
              <>
                <div className="bt-field">
                  <span>Session type</span>
                  <div className="bt-seg" role="group" aria-label="Session type">
                    <button type="button" className={form.type === 'standard' ? 'is-on' : ''} onClick={() => set('type', 'standard')}>Standard</button>
                    <button type="button" className={form.type === 'prop' ? 'is-on' : ''} onClick={() => set('type', 'prop')}>Prop firm</button>
                  </div>
                  <small>{form.type === 'prop' ? 'Trade against a prop firm’s profit target, loss limits and minimum days.' : 'A plain account with no rules — just replay and review.'}</small>
                </div>

                <label className="bt-field">
                  <span>Name <b>*</b></span>
                  <input className="bt-input" autoFocus maxLength={80} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. NQ opening range — Oct 2026" disabled={saving} />
                </label>

                <div className="bt-row">
                  <label className="bt-field">
                    <span>Account balance <b>*</b></span>
                    <input className="bt-input" type="number" min="0" step="any" value={form.balance} onChange={(e) => set('balance', e.target.value)} disabled={saving} />
                  </label>
                  <label className="bt-field">
                    <span>Currency</span>
                    <select className="bt-input" value={form.currency} onChange={(e) => set('currency', e.target.value)} disabled={saving}>
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                </div>

                <div className="bt-field">
                  <span>Interval <i>bar size you replay on</i></span>
                  <div className="bt-pills">
                    {BACKTEST_INTERVALS.map((i) => (
                      <button key={i} type="button" className={form.interval === i ? 'is-on' : ''} onClick={() => set('interval', i)} disabled={saving}>{i.toUpperCase()}</button>
                    ))}
                  </div>
                </div>

                <div className="bt-row">
                  <label className="bt-field">
                    <span>From <b>*</b></span>
                    <input className="bt-input" type="date" max={todayIso()} value={form.fromDate} onChange={(e) => set('fromDate', e.target.value)} disabled={saving} />
                  </label>
                  <label className="bt-field">
                    <span>To <b>*</b></span>
                    <input className="bt-input" type="date" max={todayIso()} value={form.toDate} onChange={(e) => set('toDate', e.target.value)} disabled={saving} />
                  </label>
                </div>
                <small className={`bt-hint${days > maxDays ? ' is-bad' : ''}`}>
                  {days > 0 ? `${days} day${days === 1 ? '' : 's'} selected` : 'Pick a range'} · {form.interval.toUpperCase()} allows up to {maxDays} days.
                </small>

                <div className="bt-field">
                  <span>Instruments <b>*</b> <i>{form.instruments.length}/{BACKTEST_MAX_INSTRUMENTS}</i></span>
                  <div className="bt-chips">
                    {form.instruments.map((s) => (
                      <span key={s} className="bt-chip">
                        {s}
                        <button type="button" onClick={() => removeInstrument(s)} aria-label={`Remove ${s}`} disabled={saving || form.instruments.length === 1}><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                  <SymbolSelect value="" onChange={addInstrument} placeholder="Add instrument…" disabled={saving} />
                  <small>The first instrument opens on the chart; you can switch between them while replaying.</small>
                </div>
              </>
            )}

            {stepName === 'Prop rules' && (
              <>
                <div className="bt-row">
                  <label className="bt-field">
                    <span>Firm</span>
                    <select className="bt-input" value={form.firmName} onChange={(e) => set('firmName', e.target.value)} disabled={saving}>
                      {PROP_FIRMS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </label>
                  {form.firmName === 'Other' && (
                    <label className="bt-field">
                      <span>Firm name <b>*</b></span>
                      <input className="bt-input" maxLength={60} value={form.firmNameCustom} onChange={(e) => set('firmNameCustom', e.target.value)} placeholder="Your firm" disabled={saving} />
                    </label>
                  )}
                </div>

                <label className="bt-field">
                  <span>Account size <i>{form.currency} · percentages below are of this</i></span>
                  <input className="bt-input" type="number" min="0" step="any" value={form.accountSize} onChange={(e) => set('accountSize', e.target.value)} disabled={saving} />
                </label>

                <div className="bt-row">
                  <label className="bt-field"><span>Profit target %</span>
                    <input className="bt-input" type="number" min="0" max="100" step="any" value={form.profitTargetPct} onChange={(e) => set('profitTargetPct', e.target.value)} disabled={saving} /></label>
                  <label className="bt-field"><span>Min trading days</span>
                    <input className="bt-input" type="number" min="0" step="1" value={form.minTradingDays} onChange={(e) => set('minTradingDays', e.target.value)} disabled={saving} /></label>
                </div>
                <div className="bt-row">
                  <label className="bt-field"><span>Max daily loss %</span>
                    <input className="bt-input" type="number" min="0" max="100" step="any" value={form.maxDailyLossPct} onChange={(e) => set('maxDailyLossPct', e.target.value)} disabled={saving} /></label>
                  <label className="bt-field"><span>Max total loss %</span>
                    <input className="bt-input" type="number" min="0" max="100" step="any" value={form.maxTotalLossPct} onChange={(e) => set('maxTotalLossPct', e.target.value)} disabled={saving} /></label>
                </div>

                <label className="bt-field">
                  <span>Max position size <i>contracts · optional</i></span>
                  <input className="bt-input" type="number" min="0" step="any" value={form.maxPositionSize} onChange={(e) => set('maxPositionSize', e.target.value)} placeholder="No limit" disabled={saving} />
                </label>

                <label className="bt-field">
                  <span>Notes <i>optional</i></span>
                  <textarea className="bt-input" rows={2} maxLength={1000} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anything specific about this challenge" disabled={saving} />
                </label>
                <small className="bt-hint">If a loss limit is hit during replay the session ends automatically and any open position is closed.</small>
              </>
            )}

            {stepName === 'Review' && (
              <dl className="bt-review">
                <div><dt>Name</dt><dd>{form.name.trim()}</dd></div>
                <div><dt>Type</dt><dd>{form.type === 'prop' ? `Prop firm · ${cfgFirm}` : 'Standard'}</dd></div>
                <div><dt>Balance</dt><dd>{fmtMoney(num(form.balance), form.currency, { digits: 0 })}</dd></div>
                <div><dt>Range</dt><dd>{form.fromDate} → {form.toDate} ({days} days)</dd></div>
                <div><dt>Interval</dt><dd>{form.interval.toUpperCase()}</dd></div>
                <div><dt>Instruments</dt><dd>{form.instruments.join(', ')}</dd></div>
                {form.type === 'prop' && (
                  <>
                    <div><dt>Account size</dt><dd>{fmtMoney(num(form.accountSize), form.currency, { digits: 0 })}</dd></div>
                    <div><dt>Profit target</dt><dd>{form.profitTargetPct}% · {fmtMoney((num(form.accountSize) * num(form.profitTargetPct)) / 100, form.currency, { digits: 0 })}</dd></div>
                    <div><dt>Max daily loss</dt><dd>{form.maxDailyLossPct}% · {fmtMoney((num(form.accountSize) * num(form.maxDailyLossPct)) / 100, form.currency, { digits: 0 })}</dd></div>
                    <div><dt>Max total loss</dt><dd>{form.maxTotalLossPct}% · {fmtMoney((num(form.accountSize) * num(form.maxTotalLossPct)) / 100, form.currency, { digits: 0 })}</dd></div>
                    <div><dt>Min trading days</dt><dd>{form.minTradingDays}</dd></div>
                    <div><dt>Max position</dt><dd>{form.maxPositionSize || 'No limit'}</dd></div>
                  </>
                )}
              </dl>
            )}
          </div>

          <div className="bt-modal-foot">
            {step > 0 ? (
              <button type="button" className="bt-btn" onClick={back} disabled={saving}><ChevronLeft size={14} /> Back</button>
            ) : (
              <button type="button" className="bt-btn" onClick={onClose} disabled={saving}>Cancel</button>
            )}
            {stepName === 'Review' ? (
              <button type="submit" className="bt-btn is-primary" disabled={saving}>{saving ? 'Creating…' : 'Create & open chart'}</button>
            ) : (
              <button type="button" className="bt-btn is-primary" onClick={next} disabled={saving}>Next <ChevronRight size={14} /></button>
            )}
          </div>
        </form>
      </div>
    </Portal>
  );
}
