// apps/web/src/shared/trade-logs/AddTradeModal.jsx
//
// Single trade entry form. The field set depends on the account type:
//
//   Live / Demo : date*, entryTime*, exitTime*, direction*, symbol*,
//                 entryPrice, takeProfit, stopLoss, pnl*, quantity*, notes,
//                 then custom columns.
//
//   Backtest    : date*, entryTime*, exitTime*, direction*, symbol*,
//                 mae*, mfe*, sl* (ticks/points from account), pnl,
//                 quantity*, notes, then custom columns.
//
// (* = mandatory)
//
// CUSTOM COLUMN RENDERING
// -----------------------
// Each custom column's UI depends on its type in `account.columnConfigs`:
//
//   - type === 'dropdown' AND options.length > 0
//       → <select> populated from options, with an empty "—" first option
//   - anything else (text, number, dropdown with no options yet)
//       → <input type="text">
//
// The v1→v2 columnConfigs upgrade is handled by normalizeColumnConfigs()
// from @mavrix/shared.
//
// SYMBOL INPUT
// ------------
// Symbol uses <SymbolSelect>, a searchable dropdown sourced from the same
// /api/market-data/catalog used by the chart page. The trigger is a button,
// so the browser's native `required` no longer applies — symbol presence is
// validated explicitly in validate() below.

import { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaPlus, FaCheck } from 'react-icons/fa';

import Portal from '@/shared/components/Portal';
import { useCreateTrade, useUpdateTrade } from '@/shared/api/trades';
import { normalizeColumnConfigs } from '@mavrix/shared';
import { SymbolSelect } from '@/shared/symbols';

const TICKS_PER_POINT = 4;

/* ---------- helpers ---------- */

// Backtest: convert the SL value the user typed (in the account's native unit)
// into points for storage. Falls back to the account's default SL when blank.
function resolveSlPoints(rawSl, account) {
  const raw = rawSl === '' || rawSl == null ? null : Number(rawSl);
  const hasRaw = raw != null && !Number.isNaN(raw) && raw > 0;

  const acctDefault =
    account?.slValue != null && Number(account.slValue) > 0
      ? Number(account.slValue)
      : null;

  const effective = hasRaw ? raw : acctDefault;
  if (effective == null) return null;

  const pts =
    account?.slUnit === 'ticks' ? effective / TICKS_PER_POINT : effective;
  return +pts.toFixed(4);
}

// Prefill: convert stored points back into the account's native unit.
function slPointsToDisplay(slPoints, account) {
  if (slPoints == null) return '';
  const n = Number(slPoints);
  if (!Number.isFinite(n)) return '';
  return account?.slUnit === 'ticks'
    ? String(+(n * TICKS_PER_POINT).toFixed(4))
    : String(n);
}

const EMPTY = {
  date: '',
  entryTime: '',
  exitTime: '',
  direction: 'Long',
  symbol: '',
  // Backtest-only
  mae: '',
  mfe: '',
  sl: '',
  // Journal-only
  entryPrice: '',
  takeProfit: '',
  stopLoss: '',
  // Common
  pnl: '',
  quantity: '',
  notes: '',
};

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                        */
/* ------------------------------------------------------------------ */
const CSS = `
  .at-overlay {
    position: fixed; inset: 0;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 16px;
    animation: atFade .18s ease;
  }
  .at-modal {
    --accent: #F59E0B; --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    width: 100%; max-width: 620px; max-height: 90vh;
    display: flex; flex-direction: column;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95),
                0 0 0 1px var(--accent-soft);
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    overflow: hidden;
    animation: atModalIn .28s cubic-bezier(.2,.8,.25,1);
  }
  .at-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex; justify-content: space-between; align-items: center;
    position: relative; flex-shrink: 0;
  }
  .at-head::before {
    content: ''; position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent),
                var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: atGrad 4s linear infinite;
  }
  .at-title { font-size: 16px; font-weight: 700; margin: 0; letter-spacing: -.01em; }
  .at-sub {
    margin: 4px 0 0; font-size: 11.5px; color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .at-close {
    background: none; border: none; color: var(--ink-2);
    font-size: 15px; cursor: pointer; padding: 6px; border-radius: 8px;
    transition: all .2s;
  }
  .at-close:hover:not(:disabled) { color: var(--accent); background: rgba(245,158,11,.08); }
  .at-close:disabled { opacity: .35; cursor: not-allowed; }
  .at-body {
    padding: 20px 22px; overflow-y: auto; flex: 1;
    display: flex; flex-direction: column; gap: 14px;
  }
  .at-body::-webkit-scrollbar { width: 8px; }
  .at-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08); border-radius: 99px;
  }
  .at-label {
    display: block; margin-bottom: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--ink-3);
  }
  .at-label .req { color: var(--accent); margin-left: 3px; }
  .at-input, .at-select, .at-textarea {
    width: 100%; padding: 9px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: var(--ink-1);
    font-size: 13px; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    outline: none; box-sizing: border-box; transition: all .2s;
  }
  .at-input::placeholder, .at-textarea::placeholder { color: var(--ink-3); }
  .at-input:hover:not(:disabled), .at-select:hover:not(:disabled), .at-textarea:hover:not(:disabled) {
    border-color: rgba(255,255,255,.2);
  }
  .at-input:focus, .at-select:focus, .at-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .at-input:disabled, .at-select:disabled, .at-textarea:disabled {
    opacity: .55; cursor: not-allowed;
  }
  .at-select {
    appearance: none; -webkit-appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='%23545E6E'><path d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/></svg>");
    background-repeat: no-repeat; background-position: right 10px center;
    padding-right: 32px; cursor: pointer;
  }
  .at-textarea {
    resize: vertical; min-height: 62px;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  }
  .at-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .at-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .at-section {
    padding: 14px; border-radius: 12px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
    display: flex; flex-direction: column; gap: 12px;
  }
  .at-section-title {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--accent);
  }
  .at-error {
    padding: 10px 12px; border-radius: 10px;
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.28);
    color: #fca5a5;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; line-height: 1.55;
  }
  .at-foot {
    padding: 14px 22px; border-top: 1px solid var(--line-soft);
    display: flex; gap: 10px; align-items: center;
    background: rgba(0,0,0,.15); flex-shrink: 0;
  }
  .at-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03); color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer; transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .at-btn:hover:not(:disabled) {
    color: var(--ink-1); background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2); transform: translateY(-1px);
  }
  .at-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
  .at-btn-cancel {
    border-color: rgba(239,68,68,.28);
    background: rgba(239,68,68,.05); color: #f87171;
  }
  .at-btn-cancel:hover:not(:disabled) {
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55); color: #fca5a5;
  }
  .at-btn-primary {
    position: relative; padding: 9px 18px;
    border: none; overflow: hidden;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117; font-weight: 700;
    box-shadow: 0 10px 30px -8px rgba(245,158,11,.55),
                inset 0 1px 0 rgba(255,255,255,.4);
  }
  .at-btn-primary::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(105deg, transparent 32%,
                rgba(255,255,255,.3) 50%, transparent 68%);
    animation: atShine 4.2s ease-in-out infinite;
  }
  .at-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px rgba(245,158,11,.7),
                inset 0 1px 0 rgba(255,255,255,.5);
  }
  .at-btn-primary:disabled {
    background: linear-gradient(135deg,
                rgba(245,158,11,.32), rgba(253,230,138,.28));
    color: rgba(10,13,19,.55); box-shadow: none;
  }
  .at-btn-primary:disabled::after { display: none; }

  .at-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(13, 17, 23, .28);
    border-top-color: #0D1117;
    border-radius: 50%;
    animation: atSpin .7s linear infinite;
    display: inline-block;
    flex-shrink: 0;
  }

  @keyframes atFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes atModalIn {
    from { opacity: 0; transform: translateY(-12px) scale(.97); }
    to { opacity: 1; transform: none; }
  }
  @keyframes atGrad {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes atShine {
    0%,100% { transform: translateX(-130%) skewX(-18deg); }
    55% { transform: translateX(230%) skewX(-18deg); }
  }
  @keyframes atSpin { to { transform: rotate(360deg); } }
  @media (max-width: 560px) {
    .at-grid-2, .at-grid-3 { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    .at-head::before, .at-btn-primary::after { animation: none !important; }
    .at-spinner { animation-duration: 1.6s; }
    .at-btn, .at-btn-primary { transition: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Custom column field — renders <select> when the column is a        */
/*  dropdown with options, else <input type="text">.                   */
/* ------------------------------------------------------------------ */

function CustomColumnField({ name, config, value, onChange, disabled }) {
  const isDropdown =
    config?.type === 'dropdown' &&
    Array.isArray(config.options) &&
    config.options.length > 0;

  if (isDropdown) {
    return (
      <select
        className="at-select"
        value={value ?? ''}
        disabled={disabled}
        aria-label={name}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {config.options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        {/* Preserve the existing value if it's not in options (legacy data) */}
        {value && !config.options.includes(value) && (
          <option value={value}>{value} (legacy)</option>
        )}
      </select>
    );
  }

  return (
    <input
      type="text"
      className="at-input"
      value={value ?? ''}
      disabled={disabled}
      aria-label={name}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main modal                                                        */
/* ------------------------------------------------------------------ */

export default function AddTradeModal({ isOpen, onClose, account, trade = null }) {
  const isEdit = !!trade;
  const isBacktest = account?.type === 'Backtest';

  const [form, setForm] = useState(EMPTY);
  const [custom, setCustom] = useState({});
  const [error, setError] = useState('');

  const createTrade = useCreateTrade();
  const updateTrade = useUpdateTrade();
  const saving = createTrade.isPending || updateTrade.isPending;

  // Normalized columnConfigs — always v2 shape { type, options? }.
  const columnConfigs = useMemo(
    () => normalizeColumnConfigs(account?.columnConfigs || {}),
    [account]
  );

  const customKeys = useMemo(() => {
    const cfgKeys = Object.keys(columnConfigs);
    const tradeKeys = isEdit ? Object.keys(trade?.dynamic || {}) : [];
    // Union of both, so nothing is dropped when a trade has keys not yet in config
    const union = new Set([...cfgKeys, ...tradeKeys]);
    return [...union].sort();
  }, [columnConfigs, isEdit, trade]);

  // Prefill / reset whenever the modal opens or the target trade changes
  useEffect(() => {
    if (!isOpen) return;

    if (isEdit && trade) {
      setForm({
        date: trade.date || '',
        entryTime: trade.entry || '',
        exitTime: trade.exit || '',
        direction: trade.dir || 'Long',
        symbol: trade.symbol || '',
        // Backtest
        mae: trade.mae != null ? String(trade.mae) : '',
        mfe: trade.mfe != null ? String(trade.mfe) : '',
        sl: isBacktest ? slPointsToDisplay(trade.slPoints, account) : '',
        // Journal
        entryPrice: trade.entryPrice != null ? String(trade.entryPrice) : '',
        takeProfit: trade.takeProfit != null ? String(trade.takeProfit) : '',
        stopLoss: trade.stopLoss != null ? String(trade.stopLoss) : '',
        // Common
        pnl: trade.pnl != null ? String(trade.pnl) : '',
        quantity: trade.quantity != null ? String(trade.quantity) : '',
        notes: trade.notes || '',
      });

      const initialCustom = {};
      customKeys.forEach((k) => {
        const v = trade.dynamic?.[k];
        initialCustom[k] = v != null && v !== '—' ? String(v) : '';
      });
      setCustom(initialCustom);
    } else {
      setForm({
        ...EMPTY,
        sl: isBacktest && account?.slValue != null ? String(account.slValue) : '',
      });
      const initialCustom = {};
      customKeys.forEach((k) => { initialCustom[k] = ''; });
      setCustom(initialCustom);
    }

    setError('');
  }, [isOpen, isEdit, trade, account, customKeys, isBacktest]);

  if (!isOpen || !account) return null;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setC = (k, v) => setCustom((p) => ({ ...p, [k]: v }));

  const validate = () => {
    if (!form.date || !form.entryTime || !form.exitTime) {
      return 'Date, Entry Time and Exit Time are required.';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return 'Date must be YYYY-MM-DD.';
    if (!/^\d{2}:\d{2}$/.test(form.entryTime)) return 'Entry Time must be HH:MM.';
    if (!/^\d{2}:\d{2}$/.test(form.exitTime))  return 'Exit Time must be HH:MM.';

    // Symbol is required — enforced here (not via the input's `required`
    // attribute) because the field is now a button-triggered dropdown.
    if (!form.symbol || !String(form.symbol).trim()) {
      return 'Symbol is required.';
    }

    // Quantity is required for both modes.
    const q = Number(form.quantity);
    if (form.quantity === '' || !Number.isFinite(q) || q <= 0) {
      return 'Quantity must be a positive number.';
    }

    if (isBacktest) {
      if (form.mae === '' || Number.isNaN(Number(form.mae))) return 'MAE is required.';
      if (form.mfe === '' || Number.isNaN(Number(form.mfe))) return 'MFE is required.';
      const pts = resolveSlPoints(form.sl, account);
      if (pts == null) {
        return 'This Backtest account needs an SL value (or set a default in the account).';
      }
    } else {
      // Journal: P&L is required.
      if (form.pnl === '' || Number.isNaN(Number(form.pnl))) {
        return 'P&L is required.';
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    const v = validate();
    if (v) { setError(v); return; }

    const base = {
      date: form.date,
      entryTime: form.entryTime,
      exitTime: form.exitTime,
      direction: form.direction,
      symbol: form.symbol.trim(),
      pnl: form.pnl === '' ? 0 : Number(form.pnl) || 0,
      quantity: Number(form.quantity),
      notes: form.notes.trim(),
    };

    const payload = isBacktest
      ? {
          ...base,
          mae: Number(form.mae),
          mfe: Number(form.mfe),
          slPoints: resolveSlPoints(form.sl, account),
        }
      : {
          ...base,
          entryPrice: form.entryPrice === '' ? null : Number(form.entryPrice),
          takeProfit: form.takeProfit === '' ? null : Number(form.takeProfit),
          stopLoss: form.stopLoss === '' ? null : Number(form.stopLoss),
        };

    Object.entries(custom).forEach(([k, v]) => {
      payload[k] = v == null ? '' : String(v);
    });

    try {
      if (isEdit) {
        await updateTrade.mutateAsync({ tradeId: trade.id, data: payload });
      } else {
        await createTrade.mutateAsync({ accountId: account.id, data: payload });
      }
      onClose();
    } catch (err) {
      setError(err?.message || `Could not ${isEdit ? 'update' : 'save'} trade.`);
    }
  };

  const slUnitLabel = account?.slUnit === 'ticks' ? 'ticks' : 'points';

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="at-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) onClose();
        }}
      >
        <div className="at-modal">
          <div className="at-head">
            <div>
              <h2 className="at-title">{isEdit ? 'Edit Trade' : 'Add Trade'}</h2>
              <p className="at-sub">
                {isEdit ? (
                  <>Editing a trade on <b>{account.name}</b></>
                ) : (
                  <>Manually log a single {isBacktest ? 'test' : 'trade'} to <b>{account.name}</b></>
                )}
              </p>
            </div>
            <button
              className="at-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
            <div className="at-body">

              {error && <div className="at-error">{error}</div>}

              {/* ---------------- Execution ---------------- */}
              <div className="at-section">
                <span className="at-section-title">Execution</span>

                <div className="at-grid-3">
                  <div>
                    <label className="at-label">Date<span className="req">*</span></label>
                    <input
                      type="date"
                      className="at-input"
                      value={form.date}
                      onChange={(e) => set('date', e.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>
                  <div>
                    <label className="at-label">Entry Time<span className="req">*</span></label>
                    <input
                      type="time"
                      className="at-input"
                      value={form.entryTime}
                      onChange={(e) => set('entryTime', e.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>
                  <div>
                    <label className="at-label">Exit Time<span className="req">*</span></label>
                    <input
                      type="time"
                      className="at-input"
                      value={form.exitTime}
                      onChange={(e) => set('exitTime', e.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>
                </div>

                <div className="at-grid-2">
                  <div>
                    <label className="at-label">Direction<span className="req">*</span></label>
                    <select
                      className="at-select"
                      value={form.direction}
                      onChange={(e) => set('direction', e.target.value)}
                      disabled={saving}
                    >
                      <option value="Long">Long</option>
                      <option value="Short">Short</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="at-symbol"
                      className="at-label"
                    >
                      Symbol<span className="req">*</span>
                    </label>
                    <SymbolSelect
                      id="at-symbol"
                      value={form.symbol}
                      onChange={(code) => set('symbol', code)}
                      placeholder="Select symbol…"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              {/* ---------------- Outcomes ---------------- */}
              <div className="at-section">
                <span className="at-section-title">Outcome</span>

                {isBacktest ? (
                  <>
                    <div className="at-grid-3">
                      <div>
                        <label className="at-label">MAE<span className="req">*</span></label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="at-input"
                          placeholder="0.00"
                          value={form.mae}
                          onChange={(e) => set('mae', e.target.value)}
                          disabled={saving}
                          required
                        />
                      </div>
                      <div>
                        <label className="at-label">MFE<span className="req">*</span></label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="at-input"
                          placeholder="0.00"
                          value={form.mfe}
                          onChange={(e) => set('mfe', e.target.value)}
                          disabled={saving}
                          required
                        />
                      </div>
                      <div>
                        <label className="at-label">SL ({slUnitLabel})<span className="req">*</span></label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="at-input"
                          placeholder={
                            account.slValue != null
                              ? `default ${account.slValue}`
                              : 'required'
                          }
                          value={form.sl}
                          onChange={(e) => set('sl', e.target.value)}
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div className="at-grid-2">
                      <div>
                        <label className="at-label">Quantity<span className="req">*</span></label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="at-input"
                          placeholder="1"
                          value={form.quantity}
                          onChange={(e) => set('quantity', e.target.value)}
                          disabled={saving}
                          required
                        />
                      </div>
                      <div>
                        <label className="at-label">P&amp;L</label>
                        <input
                          type="number"
                          step="0.01"
                          className="at-input"
                          placeholder="0.00"
                          value={form.pnl}
                          onChange={(e) => set('pnl', e.target.value)}
                          disabled={saving}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="at-grid-3">
                      <div>
                        <label className="at-label">Entry Price</label>
                        <input
                          type="number"
                          step="any"
                          className="at-input"
                          placeholder="0.00"
                          value={form.entryPrice}
                          onChange={(e) => set('entryPrice', e.target.value)}
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="at-label">Take Profit</label>
                        <input
                          type="number"
                          step="any"
                          className="at-input"
                          placeholder="0.00"
                          value={form.takeProfit}
                          onChange={(e) => set('takeProfit', e.target.value)}
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="at-label">Stop Loss</label>
                        <input
                          type="number"
                          step="any"
                          className="at-input"
                          placeholder="0.00"
                          value={form.stopLoss}
                          onChange={(e) => set('stopLoss', e.target.value)}
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div className="at-grid-2">
                      <div>
                        <label className="at-label">P&amp;L<span className="req">*</span></label>
                        <input
                          type="number"
                          step="0.01"
                          className="at-input"
                          placeholder="0.00"
                          value={form.pnl}
                          onChange={(e) => set('pnl', e.target.value)}
                          disabled={saving}
                          required
                        />
                      </div>
                      <div>
                        <label className="at-label">Quantity<span className="req">*</span></label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="at-input"
                          placeholder="1"
                          value={form.quantity}
                          onChange={(e) => set('quantity', e.target.value)}
                          disabled={saving}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="at-label">Notes</label>
                <textarea
                  className="at-textarea"
                  placeholder="Optional — trade context, lessons learned…"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  disabled={saving}
                />
              </div>

              {customKeys.length > 0 && (
                <div className="at-section">
                  <span className="at-section-title">Custom Columns</span>
                  <div className="at-grid-2">
                    {customKeys.map((k) => (
                      <div key={k}>
                        <label className="at-label">{k}</label>
                        <CustomColumnField
                          name={k}
                          config={columnConfigs[k]}
                          value={custom[k] ?? ''}
                          onChange={(v) => setC(k, v)}
                          disabled={saving}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="at-foot">
              <button
                type="button"
                className="at-btn at-btn-cancel"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <div style={{ flex: 1 }} />
              <button
                type="submit"
                className="at-btn at-btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="at-spinner" />
                    <span>{isEdit ? 'Saving…' : 'Adding…'}</span>
                  </>
                ) : isEdit ? (
                  <>
                    <FaCheck size={11} />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <FaPlus size={11} />
                    <span>Add Trade</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}