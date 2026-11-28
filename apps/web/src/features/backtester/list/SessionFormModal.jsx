import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, ChevronLeft, ChevronRight, Search, DatabaseZap, Grid3x3 } from 'lucide-react';
import { toast } from 'sonner';

import Portal from '@/shared/components/Portal';
import { useMarketCatalog } from '@/shared/api/marketData';
import { useBacktestAvailability, useCreateBacktestSession } from '@/shared/api/backtestSessions';
import {
  CURRENCIES, BACKTEST_INTERVALS, BACKTEST_INTERVAL_MAX_DAYS, BACKTEST_MAX_INSTRUMENTS,
  BACKTEST_DEFAULT_INSTRUMENT, PROP_DEFAULTS, backtestSessionSchema,
} from '@mavrix/shared';

import { daysBetweenIso } from '../lib/time';
import { fmtMoney } from '../lib/format';
import {
  indexAvailability, intervalsWithData, rangeFor, symbolsFor,
} from '../lib/availability';
import TemplatePicker from './TemplatePicker';

const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
const round2 = (n) => Math.round(n * 100) / 100;

const limit = (value) => ({ mode: 'pct', value: String(value) });

function initialForm() {
  return {
    type: 'standard',
    name: '',
    balance: '50000',
    currency: 'USD',
    interval: '5m',
    instruments: [],
    fromDate: '',
    toDate: '',
    datesTouched: false,
    firmName: 'Other',
    firmNameCustom: '',
    accountSize: '50000',
    sizeTouched: false,
    target: limit(PROP_DEFAULTS.profitTargetPct),
    daily: limit(PROP_DEFAULTS.maxDailyLossPct),
    total: limit(PROP_DEFAULTS.maxTotalLossPct),
    minTradingDays: String(PROP_DEFAULTS.minTradingDays),
    maxPositionSize: '',
    notes: '',
  };
}

/* Turns a template (firm + plan + account-size tier) into form fields. */
function templatePatch(firm, plan, tier) {
  const lim = (v) => ({ mode: tier.mode, value: String(v) });
  // Direct-funded models have no profit target → fall back to the app default (editable).
  const target = tier.target == null ? limit(PROP_DEFAULTS.profitTargetPct) : lim(tier.target);
  const total = tier.total == null ? limit(PROP_DEFAULTS.maxTotalLossPct) : lim(tier.total);
  // No daily limit → mirror the total limit so validation passes.
  const daily = tier.daily == null ? total : lim(tier.daily);
  return {
    type: 'prop',
    balance: String(tier.size),
    accountSize: String(tier.size),
    sizeTouched: true,
    firmName: 'Other',
    firmNameCustom: firm.name,
    target,
    daily,
    total,
    minTradingDays: String(plan.minDays ?? 0),
    notes: `${firm.name} · ${plan.name}`,
  };
}

/* What a limit is worth in currency / percent of the account, whichever way it was typed. */
function limitAmounts(l, size) {
  const v = num(l.value);
  if (v == null || !size) return { amount: null, pct: null };
  return l.mode === 'usd' ? { amount: v, pct: (v / size) * 100 } : { amount: (size * v) / 100, pct: v };
}

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
    const put = (key, l) => ({
      [`${key}Mode`]: l.mode,
      [l.mode === 'usd' ? `${key}Usd` : `${key}Pct`]: num(l.value),
    });
    payload.propFirmConfig = {
      firmName: f.firmName,
      ...(f.firmName === 'Other' ? { firmNameCustom: (f.firmNameCustom || '').trim() } : {}),
      accountSize: num(f.accountSize),
      ...put('profitTarget', f.target),
      ...put('maxDailyLoss', f.daily),
      ...put('maxTotalLoss', f.total),
      minTradingDays: num(f.minTradingDays) ?? 0,
      ...(num(f.maxPositionSize) ? { maxPositionSize: num(f.maxPositionSize) } : {}),
      ...(f.notes.trim() ? { notes: f.notes.trim() } : {}),
    };
  }
  return payload;
}

function checkBasics(f, range) {
  if (!f.name.trim()) return 'Give the session a name.';
  const bal = num(f.balance);
  if (!bal || bal <= 0) return 'Enter an account balance above zero.';
  if (f.instruments.length === 0) return 'Pick at least one instrument.';
  if (!range) return 'The selected instruments have no common date range. Remove one or pick another interval.';
  if (!f.fromDate || !f.toDate) return 'Pick a start and end date.';
  if (f.fromDate > f.toDate) return 'The end date must be after the start date.';
  if (f.fromDate < range.min || f.toDate > range.max) return `Data is only available from ${range.min} to ${range.max}.`;
  const max = BACKTEST_INTERVAL_MAX_DAYS[f.interval];
  const days = daysBetweenIso(f.fromDate, f.toDate);
  if (days > max) return `${f.interval.toUpperCase()} sessions can cover at most ${max} days (you picked ${days}). Shorten the range or use a higher interval.`;
  return null;
}

function checkProp(f) {
  if (f.firmName === 'Other' && !(f.firmNameCustom || '').trim()) return 'Enter the firm name.';
  const size = num(f.accountSize);
  if (!size || size <= 0) return 'Account size must be above zero.';
  const rows = [['Profit target', f.target], ['Max daily loss', f.daily], ['Max total loss', f.total]];
  for (const [label, l] of rows) {
    const v = num(l.value);
    if (v == null || v <= 0) return `${label} must be above zero.`;
    if (l.mode === 'pct' && v > 100) return `${label} can't exceed 100%.`;
  }
  const d = num(f.minTradingDays);
  if (d == null || d < 0 || !Number.isInteger(d)) return 'Minimum trading days must be a whole number (0 or more).';
  if (f.maxPositionSize !== '' && !(num(f.maxPositionSize) > 0)) return 'Max position size must be above zero (or leave it empty).';
  const daily = limitAmounts(f.daily, size).amount;
  const total = limitAmounts(f.total, size).amount;
  if (total >= size) return 'The total loss limit must be below the account size.';
  if (daily > total) return 'The daily loss limit cannot exceed the total loss limit.';
  return null;
}

/* ------------------------------ small pieces ------------------------------ */

function LimitField({ label, l, onChange, size, currency, disabled }) {
  const { amount, pct } = limitAmounts(l, size);
  const flip = (mode) => {
    if (mode === l.mode) return;
    const v = num(l.value);
    let next = l.value;
    if (v != null && size) next = String(round2(mode === 'usd' ? (size * v) / 100 : (v / size) * 100));
    onChange({ mode, value: next });
  };
  return (
    <div className="bt-field">
      <span>{label}</span>
      <div className="bt-unit">
        <input
          className="bt-input" type="number" min="0" step="any" value={l.value} aria-label={label}
          onChange={(e) => onChange({ ...l, value: e.target.value })} disabled={disabled}
        />
        <div className="bt-unit-seg" role="group" aria-label={`${label} unit`}>
          <button type="button" className={l.mode === 'pct' ? 'is-on' : ''} onClick={() => flip('pct')} disabled={disabled}>%</button>
          <button type="button" className={l.mode === 'usd' ? 'is-on' : ''} onClick={() => flip('usd')} disabled={disabled}>{currency === 'USD' ? '$' : currency}</button>
        </div>
      </div>
      <small>
        {amount == null ? '—' : l.mode === 'pct'
          ? `= ${fmtMoney(amount, currency, { digits: 0 })}`
          : `= ${round2(pct)}% of the account`}
      </small>
    </div>
  );
}

function InstrumentPicker({ symbols, names, interval, availability, selected, onToggle, disabled }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return symbols.filter((s) => !needle || s.toLowerCase().includes(needle) || (names[s] || '').toLowerCase().includes(needle));
  }, [symbols, names, q]);

  return (
    <div className="bt-picker">
      <div className="bt-picker-search">
        <Search size={13} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${symbols.length} instrument${symbols.length === 1 ? '' : 's'} with ${interval.toUpperCase()} data`} aria-label="Search instruments" disabled={disabled} />
      </div>
      <div className="bt-picker-list" role="listbox" aria-multiselectable="true" aria-label="Instruments with data">
        {list.length === 0 && <div className="bt-picker-empty">No matches.</div>}
        {list.map((s) => {
          const on = selected.includes(s);
          const w = availability.get(s)?.get(interval);
          return (
            <button
              key={s} type="button" role="option" aria-selected={on}
              className={`bt-picker-row${on ? ' is-on' : ''}`} onClick={() => onToggle(s)} disabled={disabled}
            >
              <span className="bt-picker-check">{on ? <Check size={11} /> : null}</span>
              <b>{s}</b>
              <em>{names[s] || ''}</em>
              {w && <i>{w.from} → {w.to}</i>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------- modal ---------------------------------- */

/**
 * planTemplate (optional, from the session list): { firm, plan, tier }
 * `tier` is one entry from plan.tiers; if omitted the plan's first tier is used.
 */
export default function SessionFormModal({ isOpen, onClose, planTemplate }) {
  const navigate = useNavigate();
  const createM = useCreateBacktestSession();
  const availQ = useBacktestAvailability({ enabled: isOpen });
  const catalogQ = useMarketCatalog();
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const saving = createM.isPending;

  const applyPlan = (firm, plan, tier) => {
    setForm((f) => ({ ...f, ...templatePatch(firm, plan, tier) }));
    setShowTemplatePicker(false);
    setError('');
    setStep(1); // Prop rules step
  };

  const idx = useMemo(() => indexAvailability(availQ.data), [availQ.data]);
  const catalogSymbols = catalogQ.data?.symbols;
  const names = useMemo(
    () => Object.fromEntries((catalogSymbols || []).map((s) => [s.code, s.name || s.label || ''])),
    [catalogSymbols],
  );
  const inCatalog = useMemo(() => (catalogSymbols ? new Set(catalogSymbols.map((s) => s.code)) : null), [catalogSymbols]);

  const intervals = useMemo(() => BACKTEST_INTERVALS.filter((i) => intervalsWithData(idx).has(i)), [idx]);
  const symbols = useMemo(
    () => symbolsFor(idx, form.interval).filter((s) => !inCatalog || inCatalog.has(s)),
    [idx, form.interval, inCatalog],
  );
  const range = useMemo(() => rangeFor(idx, form.interval, form.instruments), [idx, form.interval, form.instruments]);
  const noData = !availQ.isLoading && !availQ.isError && idx.size === 0;

  const steps = useMemo(
    () => (form.type === 'prop' ? ['Basics', 'Prop rules', 'Review'] : ['Basics', 'Review']),
    [form.type],
  );
  const stepName = steps[step];

  /* Reset on open; if a template came from the parent, apply it afterwards (same effect = no ordering bug). */
  useEffect(() => {
    if (!isOpen) return;
    let next = initialForm();
    let startStep = 0;
    const tpl = planTemplate;
    if (tpl?.firm && tpl?.plan?.tiers?.length) {
      const tier = tpl.tier || tpl.plan.tiers[0];
      next = { ...next, ...templatePatch(tpl.firm, tpl.plan, tier) };
      startStep = 1;
    }
    setForm(next);
    setStep(startStep);
    setError('');
    setShowTemplatePicker(false);
  }, [isOpen, planTemplate]);

  /* Keep interval / instruments / dates inside what actually has data. */
  useEffect(() => {
    if (!isOpen || idx.size === 0) return;
    setForm((f) => {
      let next = f;
      const patch = (p) => { next = { ...next, ...p }; };

      if (!intervals.includes(next.interval)) patch({ interval: intervals.includes('5m') ? '5m' : intervals[0] });

      const avail = symbolsFor(idx, next.interval).filter((s) => !inCatalog || inCatalog.has(s));
      let inst = next.instruments.filter((s) => avail.includes(s));
      if (inst.length === 0 && avail.length > 0) inst = [avail.includes(BACKTEST_DEFAULT_INSTRUMENT) ? BACKTEST_DEFAULT_INSTRUMENT : avail[0]];
      if (inst.length !== next.instruments.length || inst.some((s, i) => s !== next.instruments[i])) patch({ instruments: inst });

      const r = rangeFor(idx, next.interval, inst);
      if (r) {
        const maxDays = BACKTEST_INTERVAL_MAX_DAYS[next.interval];
        if (!next.datesTouched) {
          const to = r.max;
          const lo = addDays(to, -Math.min(29, maxDays - 1));
          const from = r.min > lo ? r.min : lo;
          if (next.toDate !== to || next.fromDate !== from) patch({ toDate: to, fromDate: from });
        } else {
          let from = next.fromDate; let to = next.toDate;
          if (from < r.min) from = r.min;
          if (from > r.max) from = r.max;
          if (to > r.max) to = r.max;
          if (to < r.min) to = r.min;
          if (from > to) from = to;
          if (from !== next.fromDate || to !== next.toDate) patch({ fromDate: from, toDate: to });
        }
      }
      return next;
    });
  }, [isOpen, idx, intervals, inCatalog, form.interval, form.instruments]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !saving && !showTemplatePicker) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, saving, showTemplatePicker, onClose]);

  if (!isOpen) return null;

  const set = (k, v) => setForm((p) => {
    const next = { ...p, [k]: v };
    if (k === 'balance' && !p.sizeTouched) next.accountSize = v;
    if (k === 'accountSize') next.sizeTouched = true;
    if (k === 'type' && v === 'prop' && !p.sizeTouched) next.accountSize = p.balance;
    if (k === 'fromDate' || k === 'toDate') next.datesTouched = true;
    return next;
  });

  const toggleInstrument = (code) => {
    setError('');
    setForm((p) => {
      const has = p.instruments.includes(code);
      if (has) return p.instruments.length === 1 ? p : { ...p, instruments: p.instruments.filter((s) => s !== code) };
      if (p.instruments.length >= BACKTEST_MAX_INSTRUMENTS) {
        setError(`You can add up to ${BACKTEST_MAX_INSTRUMENTS} instruments.`);
        return p;
      }
      return { ...p, instruments: [...p.instruments, code] };
    });
  };

  const validateCurrent = () => {
    if (stepName === 'Basics') return checkBasics(form, range);
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
    const err = checkBasics(form, range) || (form.type === 'prop' ? checkProp(form) : null);
    if (err) { setError(err); return; }

    const parsed = backtestSessionSchema.safeParse(toPayload(form));
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Check the form and try again.'); return; }

    try {
      const session = await createM.mutateAsync(parsed.data);
      toast.success(`Session "${session.name}" created`);
      onClose();
      navigate(`/backtester/${session.id}/replay`);
    } catch (ex) {
      setError(ex?.message || 'Could not create the session.');
    }
  };

  const days = form.fromDate && form.toDate && form.fromDate <= form.toDate ? daysBetweenIso(form.fromDate, form.toDate) : 0;
  const maxDays = BACKTEST_INTERVAL_MAX_DAYS[form.interval];
  const cfgFirm = form.firmName === 'Other' ? form.firmNameCustom || 'Other' : form.firmName;
  const size = num(form.accountSize);
  const amt = (l) => limitAmounts(l, size);

  return (
    <>
      <Portal>
        <div className="bt-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving && !showTemplatePicker) onClose(); }}>
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

              {stepName === 'Basics' && availQ.isLoading && <div className="bt-note">Checking which market data is available…</div>}
              {stepName === 'Basics' && availQ.isError && (
                <div className="bt-error" role="alert">Couldn't load the available market data. <button type="button" className="bt-link" onClick={() => availQ.refetch()}>Retry</button></div>
              )}
              {stepName === 'Basics' && noData && (
                <div className="bt-nodata">
                  <DatabaseZap size={20} />
                  <b>No market data is available yet</b>
                  <p>Backtests run on stored history. Ask an admin to import data (Admin → Market Data), then come back.</p>
                </div>
              )}

              {stepName === 'Basics' && !noData && (
                <>
                  <div className="bt-field">
                    <span>Session type</span>
                    <div className="bt-seg" role="group" aria-label="Session type">
                      <button type="button" className={form.type === 'standard' ? 'is-on' : ''} onClick={() => set('type', 'standard')}>Standard</button>
                      <button type="button" className={form.type === 'prop' ? 'is-on' : ''} onClick={() => set('type', 'prop')}>Prop firm</button>
                    </div>
                    <small>{form.type === 'prop' ? 'Trade against a prop firm profit target, loss limits and minimum days.' : 'A plain account with no rules — just replay and review.'}</small>
                  </div>

                  <label className="bt-field">
                    <span>Name <b>*</b></span>
                    <input className="bt-input" autoFocus maxLength={80} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. NQ opening range — Oct 2026" disabled={saving} />
                  </label>

                  {form.type === 'standard' && (
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
                  )}

                  <div className="bt-field">
                    <span>Interval <i>only intervals with stored data</i></span>
                    <div className="bt-pills">
                      {intervals.map((i) => (
                        <button key={i} type="button" className={form.interval === i ? 'is-on' : ''} onClick={() => set('interval', i)} disabled={saving}>{i.toUpperCase()}</button>
                      ))}
                    </div>
                  </div>

                  <div className="bt-field">
                    <span>Instruments <b>*</b> <i>{form.instruments.length}/{BACKTEST_MAX_INSTRUMENTS} · only instruments with {form.interval.toUpperCase()} data</i></span>
                    <InstrumentPicker
                      symbols={symbols} names={names} interval={form.interval} availability={idx}
                      selected={form.instruments} onToggle={toggleInstrument} disabled={saving}
                    />
                  </div>

                  <div className="bt-row">
                    <label className="bt-field">
                      <span>From <b>*</b></span>
                      <input className="bt-input" type="date" min={range?.min} max={range?.max} value={form.fromDate} onChange={(e) => set('fromDate', e.target.value)} disabled={saving || !range} />
                    </label>
                    <label className="bt-field">
                      <span>To <b>*</b></span>
                      <input className="bt-input" type="date" min={range?.min} max={range?.max} value={form.toDate} onChange={(e) => set('toDate', e.target.value)} disabled={saving || !range} />
                    </label>
                  </div>
                  <small className={`bt-hint${!range || days > maxDays ? ' is-bad' : ''}`}>
                    {range
                      ? `Data available ${range.min} → ${range.max}${form.instruments.length > 1 ? ' (common to all selected)' : ''}. ${days > 0 ? `${days} day${days === 1 ? '' : 's'} selected` : 'Pick a range'} · ${form.interval.toUpperCase()} allows up to ${maxDays} days.`
                      : 'The selected instruments don\'t share any dates.'}
                  </small>
                </>
              )}

              {stepName === 'Prop rules' && (
                <>
                  <div className="bt-row bt-row-firm">
                    <label className="bt-field">
                      <span>Firm</span>
                      <input
                        className="bt-input"
                        maxLength={60}
                        value={form.firmName === 'Other' ? (form.firmNameCustom || 'Custom') : form.firmName}
                        disabled
                        readOnly
                      />
                    </label>

                    <button
                      type="button"
                      className="bt-btn is-sm is-ghost bt-load-tpl"
                      onClick={() => setShowTemplatePicker(true)}
                      disabled={saving}
                    >
                      <Grid3x3 size={16} />
                      Load template
                    </button>
                  </div>

                  <label className="bt-field">
                    <span>Account size <i>{form.currency}</i></span>
                    <input className="bt-input" type="number" min="0" step="any" value={form.accountSize} onChange={(e) => set('accountSize', e.target.value)} disabled={saving} />
                  </label>

                  <div className="bt-row">
                    <LimitField label="Profit target" l={form.target} onChange={(v) => set('target', v)} size={size} currency={form.currency} disabled={saving} />
                    <label className="bt-field"><span>Min trading days</span>
                      <input className="bt-input" type="number" min="0" step="1" value={form.minTradingDays} onChange={(e) => set('minTradingDays', e.target.value)} disabled={saving} /></label>
                  </div>
                  <div className="bt-row">
                    <LimitField label="Max daily loss" l={form.daily} onChange={(v) => set('daily', v)} size={size} currency={form.currency} disabled={saving} />
                    <LimitField label="Max total loss" l={form.total} onChange={(v) => set('total', v)} size={size} currency={form.currency} disabled={saving} />
                  </div>

                  <label className="bt-field">
                    <span>Max position size <i>contracts · optional</i></span>
                    <input className="bt-input" type="number" min="0" step="any" value={form.maxPositionSize} onChange={(e) => set('maxPositionSize', e.target.value)} placeholder="No limit" disabled={saving} />
                  </label>

                  <label className="bt-field">
                    <span>Notes <i>optional</i></span>
                    <textarea className="bt-input" rows={2} maxLength={1000} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anything specific about this challenge" disabled={saving} />
                  </label>
                  <small className="bt-hint">Each limit can be a % of the account or a fixed amount — use the toggle next to the value. If a loss limit is hit during replay the session ends automatically and open positions are closed.</small>
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
                      <div><dt>Account size</dt><dd>{fmtMoney(size, form.currency, { digits: 0 })}</dd></div>
                      <div><dt>Profit target</dt><dd>{fmtMoney(amt(form.target).amount, form.currency, { digits: 0 })} · {round2(amt(form.target).pct)}%</dd></div>
                      <div><dt>Max daily loss</dt><dd>{fmtMoney(amt(form.daily).amount, form.currency, { digits: 0 })} · {round2(amt(form.daily).pct)}%</dd></div>
                      <div><dt>Max total loss</dt><dd>{fmtMoney(amt(form.total).amount, form.currency, { digits: 0 })} · {round2(amt(form.total).pct)}%</dd></div>
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
                <button type="button" className="bt-btn is-primary" onClick={next} disabled={saving || (stepName === 'Basics' && (noData || availQ.isLoading))}>Next <ChevronRight size={14} /></button>
              )}
            </div>
          </form>
        </div>
      </Portal>

      {showTemplatePicker && (
        <Portal>
          <TemplatePicker onClose={() => setShowTemplatePicker(false)} onApply={applyPlan} />
        </Portal>
      )}
    </>
  );
}