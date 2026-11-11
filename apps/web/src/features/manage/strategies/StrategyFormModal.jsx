import { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaPlus, FaCheck } from 'react-icons/fa';

import Portal from '@/shared/components/Portal';
import { useCreateStrategy, useUpdateStrategy } from '@/shared/api/strategies';
import {
  STRATEGY_COLORS, STRATEGY_STATUSES, STRATEGY_DEFAULT_COLOR,
  STRATEGY_SESSIONS, STRATEGY_TIMEFRAMES, PLAYBOOK_SECTIONS,
} from '@mavrix/shared';

import ChipInput from './components/ChipInput';
import PlaybookEditor from './components/PlaybookEditor';

const EMPTY_PLAYBOOK = Object.fromEntries(PLAYBOOK_SECTIONS.map((s) => [s.key, []]));

const EMPTY = {
  name: '', description: '', rules: '', status: 'active', color: STRATEGY_DEFAULT_COLOR,
  direction: '', timeframe: '', tags: [], sessions: [], symbols: [],
  targetRR: '', riskPerTrade: '', maxTradesPerDay: '', playbook: EMPTY_PLAYBOOK,
};

const TABS = [
  { id: 'basics', label: 'Basics' },
  { id: 'plan', label: 'Trade plan' },
  { id: 'playbook', label: 'Playbook' },
];

function toForm(s) {
  if (!s) return { ...EMPTY, playbook: { ...EMPTY_PLAYBOOK } };
  return {
    name: s.name || '', description: s.description || '', rules: s.rules || '',
    status: s.status || 'active', color: s.color || STRATEGY_DEFAULT_COLOR,
    direction: s.direction || '', timeframe: s.timeframe || '',
    tags: [...(s.tags || [])], sessions: [...(s.sessions || [])], symbols: [...(s.symbols || [])],
    targetRR: s.targetRR ?? '', riskPerTrade: s.riskPerTrade ?? '', maxTradesPerDay: s.maxTradesPerDay ?? '',
    playbook: { ...EMPTY_PLAYBOOK, ...(s.playbook || {}) },
  };
}

const numOrNull = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));

/** `strategy` edits an existing one; `seed` pre-fills a NEW one (templates). */
export default function StrategyFormModal({ isOpen, onClose, strategy = null, seed = null, onSaved }) {
  const isEdit = !!strategy;
  const [form, setForm] = useState(EMPTY);
  const [tab, setTab] = useState('basics');
  const [error, setError] = useState('');

  const createM = useCreateStrategy();
  const updateM = useUpdateStrategy();
  const saving = createM.isPending || updateM.isPending;

  useEffect(() => {
    if (!isOpen) return;
    setForm(toForm(strategy || seed));
    setTab('basics');
    setError('');
  }, [isOpen, strategy, seed]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, saving, onClose]);

  const ruleCount = useMemo(
    () => PLAYBOOK_SECTIONS.reduce((n, s) => n + (form.playbook[s.key] || []).filter((r) => r.text.trim()).length, 0),
    [form.playbook],
  );

  if (!isOpen) return null;
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleSession = (s) =>
    set('sessions', form.sessions.includes(s) ? form.sessions.filter((x) => x !== s) : [...form.sessions, s]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const name = form.name.trim();
    if (!name) { setTab('basics'); setError('Give the strategy a name.'); return; }

    const rr = numOrNull(form.targetRR), risk = numOrNull(form.riskPerTrade), cap = numOrNull(form.maxTradesPerDay);
    if ((rr != null && rr <= 0) || (risk != null && (risk <= 0 || risk > 100)) || (cap != null && (cap < 1 || !Number.isInteger(cap)))) {
      setTab('plan');
      setError('Check the trade plan: R:R and risk must be positive, risk ≤ 100%, daily cap a whole number.');
      return;
    }

    const playbook = Object.fromEntries(
      PLAYBOOK_SECTIONS.map((s) => [
        s.key,
        (form.playbook[s.key] || []).map((r) => ({ id: r.id, text: r.text.trim() })).filter((r) => r.text),
      ]),
    );

    const payload = {
      name,
      description: form.description.trim(),
      rules: form.rules,
      status: form.status,
      color: form.color,
      direction: form.direction || null,
      timeframe: form.timeframe.trim() || null,
      tags: form.tags,
      sessions: form.sessions,
      symbols: form.symbols,
      targetRR: rr,
      riskPerTrade: risk,
      maxTradesPerDay: cap,
      playbook,
    };

    try {
      const saved = isEdit
        ? await updateM.mutateAsync({ id: strategy.id, patch: payload })
        : await createM.mutateAsync(payload);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err?.message || `Could not ${isEdit ? 'update' : 'save'} strategy.`);
    }
  };

  return (
    <Portal>
      <div className="sx-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
        <form className="sx-modal" onSubmit={submit} style={{ '--sx-c': form.color }}>
          <div className="sx-modal-head">
            <span className="sx-modal-dot" />
            <div className="sx-modal-titles">
              <h2>{isEdit ? 'Edit strategy' : 'New strategy'}</h2>
              <p>{form.name.trim() || 'Untitled playbook'}</p>
            </div>
            <button type="button" className="sx-icon-btn" onClick={onClose} disabled={saving} aria-label="Close"><FaTimes /></button>
          </div>

          <div className="sx-modal-tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)}>
                {t.label}
                {t.id === 'playbook' && ruleCount > 0 && <em>{ruleCount}</em>}
              </button>
            ))}
          </div>

          <div className="sx-modal-body">
            {error && <div className="sx-error" role="alert">{error}</div>}

            {tab === 'basics' && (
              <>
                <div className="sx-field">
                  <label>Name <b>*</b></label>
                  <input className="sx-input" autoFocus maxLength={80} value={form.name} disabled={saving} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Opening Range Breakout" />
                </div>
                <div className="sx-field">
                  <label>Summary <span>one or two lines</span></label>
                  <textarea className="sx-input" rows={2} maxLength={2000} value={form.description} disabled={saving} onChange={(e) => set('description', e.target.value)} placeholder="What is the edge, in plain words?" />
                </div>

                <div className="sx-row">
                  <div className="sx-field">
                    <label>Direction</label>
                    <div className="sx-seg">
                      {[['', 'Both'], ['Long', 'Long'], ['Short', 'Short']].map(([v, l]) => (
                        <button key={l} type="button" className={form.direction === v ? 'is-active' : ''} onClick={() => set('direction', v)} disabled={saving}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="sx-field">
                    <label>Status</label>
                    <div className="sx-seg">
                      {STRATEGY_STATUSES.map((s) => (
                        <button key={s} type="button" className={form.status === s ? 'is-active' : ''} onClick={() => set('status', s)} disabled={saving}>{s}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sx-field">
                  <label>Timeframe</label>
                  <div className="sx-pills">
                    {STRATEGY_TIMEFRAMES.map((t) => (
                      <button key={t} type="button" className={form.timeframe === t ? 'is-active' : ''} onClick={() => set('timeframe', form.timeframe === t ? '' : t)} disabled={saving}>{t}</button>
                    ))}
                  </div>
                </div>

                <div className="sx-field">
                  <label>Colour</label>
                  <div className="sx-colors">
                    {STRATEGY_COLORS.map((c) => (
                      <button key={c.hex} type="button" title={c.label} aria-label={c.label} aria-pressed={form.color === c.hex}
                        className={form.color === c.hex ? 'is-active' : ''} style={{ background: c.hex }} onClick={() => set('color', c.hex)} disabled={saving} />
                    ))}
                  </div>
                </div>

                <div className="sx-field">
                  <label>Tags <span>Enter to add · {form.tags.length}/20</span></label>
                  <ChipInput value={form.tags} onChange={(v) => set('tags', v)} max={20} placeholder="momentum, news-free…" disabled={saving} />
                </div>
              </>
            )}

            {tab === 'plan' && (
              <>
                <p className="sx-hint">These are measured against your real trades on the strategy page, so the plan stays honest.</p>
                <div className="sx-field">
                  <label>Sessions <span>blank = any</span></label>
                  <div className="sx-pills">
                    {STRATEGY_SESSIONS.map((s) => (
                      <button key={s} type="button" className={form.sessions.includes(s) ? 'is-active' : ''} onClick={() => toggleSession(s)} disabled={saving}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="sx-field">
                  <label>Instruments <span>Enter to add</span></label>
                  <ChipInput value={form.symbols} onChange={(v) => set('symbols', v)} max={15} maxLen={20} transform={(v) => v.toUpperCase()} placeholder="NQ, ES, EURUSD…" disabled={saving} />
                </div>
                <div className="sx-row three">
                  <div className="sx-field">
                    <label>Target R:R</label>
                    <input className="sx-input" type="number" inputMode="decimal" min="0" step="0.1" value={form.targetRR} disabled={saving} onChange={(e) => set('targetRR', e.target.value)} placeholder="2" />
                  </div>
                  <div className="sx-field">
                    <label>Risk / trade %</label>
                    <input className="sx-input" type="number" inputMode="decimal" min="0" max="100" step="0.1" value={form.riskPerTrade} disabled={saving} onChange={(e) => set('riskPerTrade', e.target.value)} placeholder="0.5" />
                  </div>
                  <div className="sx-field">
                    <label>Max trades / day</label>
                    <input className="sx-input" type="number" inputMode="numeric" min="1" step="1" value={form.maxTradesPerDay} disabled={saving} onChange={(e) => set('maxTradesPerDay', e.target.value)} placeholder="3" />
                  </div>
                </div>
              </>
            )}

            {tab === 'playbook' && (
              <>
                <PlaybookEditor value={form.playbook} onChange={(v) => set('playbook', v)} disabled={saving} />
                <div className="sx-field">
                  <label>Extra notes <span>free text</span></label>
                  <textarea className="sx-input" rows={4} maxLength={5000} value={form.rules} disabled={saving} onChange={(e) => set('rules', e.target.value)} placeholder="Anything that does not fit a checklist: context, examples, reminders." />
                </div>
              </>
            )}
          </div>

          <div className="sx-modal-foot">
            <button type="button" className="sx-btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="sx-btn-primary" disabled={saving}>
              {saving ? <><span className="sx-spin" />{isEdit ? 'Saving…' : 'Creating…'}</> : <>{isEdit ? <FaCheck size={11} /> : <FaPlus size={11} />}{isEdit ? 'Save changes' : 'Create strategy'}</>}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
