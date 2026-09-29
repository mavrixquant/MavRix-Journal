// apps/web/src/features/journal/trade-logs/AddTradeModal.jsx
import { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaPlus, FaCheck } from 'react-icons/fa';

import Portal from '@/shared/components/Portal';
import { useCreateTrade, useUpdateTrade } from '@/shared/api/trades';

const TICKS_PER_POINT = 4;

/* ---------- helpers ---------- */
function resolveSlPoints(rawSl, account) {
  const raw = rawSl === '' || rawSl == null ? null : Number(rawSl);
  const hasRaw = raw != null && !Number.isNaN(raw) && raw > 0;

  if (account?.type === 'Backtest') {
    const acctDefault =
      account.slValue != null && Number(account.slValue) > 0
        ? Number(account.slValue)
        : null;
    const effective = hasRaw ? raw : acctDefault;
    if (effective == null) return null;
    const pts =
      account.slUnit === 'ticks' ? effective / TICKS_PER_POINT : effective;
    return +pts.toFixed(4);
  }
  return hasRaw ? raw : null;
}

// Convert a stored points value back into the user-facing unit for prefill.
function slPointsToDisplay(slPoints, account) {
  if (slPoints == null) return '';
  if (account?.type !== 'Backtest') return '';
  const n = Number(slPoints);
  if (!Number.isFinite(n)) return '';
  return account.slUnit === 'ticks'
    ? String(+(n * TICKS_PER_POINT).toFixed(4))
    : String(n);
}

const EMPTY = {
  date: '',
  entryTime: '',
  exitTime: '',
  direction: 'Long',
  symbol: '',
  mae: '',
  mfe: '',
  pnl: '',
  sl: '',
  contracts: '',
  notes: '',
};

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

export default function AddTradeModal({ isOpen, onClose, account, trade = null }) {
  const isEdit = !!trade;

  const [form, setForm] = useState(EMPTY);
  const [custom, setCustom] = useState({});
  const [error, setError] = useState('');

  const createTrade = useCreateTrade();
  const updateTrade = useUpdateTrade();
  const saving = createTrade.isPending || updateTrade.isPending;

  const isBacktest = account?.type === 'Backtest';
  const perContract = account?.commissionMode === 'per_contract';
  const showPnl = !isBacktest || account?.commissionMode !== 'none';

  const customKeys = useMemo(() => {
    const cfgKeys = Object.keys(account?.columnConfigs || {});
    const tradeKeys = isEdit ? Object.keys(trade?.dynamic || {}) : [];
    // Union of both, so nothing is dropped when a trade has keys not yet in config
    const union = new Set([...cfgKeys, ...tradeKeys]);
    return [...union].sort();
  }, [account, isEdit, trade]);

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
        mae: trade.mae != null ? String(trade.mae) : '',
        mfe: trade.mfe != null ? String(trade.mfe) : '',
        pnl: trade.pnl != null ? String(trade.pnl) : '',
        sl: slPointsToDisplay(trade.slPoints, account),
        contracts: trade.contracts != null ? String(trade.contracts) : '',
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
        sl: account?.slValue != null ? String(account.slValue) : '',
      });
      const initialCustom = {};
      customKeys.forEach((k) => { initialCustom[k] = ''; });
      setCustom(initialCustom);
    }

    setError('');
  }, [isOpen, isEdit, trade, account, customKeys]);

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
    if (form.mae === '' || Number.isNaN(Number(form.mae))) return 'MAE is required.';
    if (form.mfe === '' || Number.isNaN(Number(form.mfe))) return 'MFE is required.';
    if (isBacktest) {
      const pts = resolveSlPoints(form.sl, account);
      if (pts == null) {
        return 'This Backtest account needs an SL value (or set a default in the account).';
      }
    }
    if (perContract) {
      if (form.contracts === '' || Number(form.contracts) <= 0) {
        return 'Contracts is required for per-contract commission.';
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

    const slPoints = isBacktest ? resolveSlPoints(form.sl, account) : null;

    const payload = {
      date: form.date,
      entryTime: form.entryTime,
      exitTime: form.exitTime,
      direction: form.direction,
      symbol: form.symbol.trim(),
      mae: Number(form.mae) || 0,
      mfe: Number(form.mfe) || 0,
      pnl: form.pnl === '' ? 0 : Number(form.pnl) || 0,
      notes: form.notes.trim(),
      slPoints,
      contracts:
        perContract && form.contracts !== ''
          ? Number(form.contracts)
          : null,
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
                  <>Manually log a single trade to <b>{account.name}</b></>
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

              <div className="at-section">
                <span className="at-section-title">Execution</span>

                <div className="at-grid-3">
                  <div>
                    <label className="at-label">Date</label>
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
                    <label className="at-label">Entry Time</label>
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
                    <label className="at-label">Exit Time</label>
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
                    <label className="at-label">Direction</label>
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
                    <label className="at-label">Symbol</label>
                    <input
                      type="text"
                      className="at-input"
                      placeholder="e.g. NQ, ES"
                      value={form.symbol}
                      onChange={(e) => set('symbol', e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              <div className="at-section">
                <span className="at-section-title">Outcome</span>

                <div className="at-grid-3">
                  <div>
                    <label className="at-label">MAE</label>
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
                    <label className="at-label">MFE</label>
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
                  {showPnl && (
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
                  )}
                </div>

                {(isBacktest || perContract) && (
                  <div className="at-grid-2">
                    {isBacktest && (
                      <div>
                        <label className="at-label">
                          SL ({account.slUnit === 'ticks' ? 'ticks' : 'points'})
                        </label>
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
                    )}
                    {perContract && (
                      <div>
                        <label className="at-label">Contracts</label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          className="at-input"
                          placeholder="1"
                          value={form.contracts}
                          onChange={(e) => set('contracts', e.target.value)}
                          disabled={saving}
                        />
                      </div>
                    )}
                  </div>
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
                        <input
                          type="text"
                          className="at-input"
                          value={custom[k] ?? ''}
                          onChange={(e) => setC(k, e.target.value)}
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