
import { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaPlus, FaCheck } from 'react-icons/fa';

import Portal from '@/shared/components/Portal';
import { useCreateTrade, useUpdateTrade } from '@/shared/api/trades';
import { useStrategies } from '@/shared/api/strategies';
import { normalizeColumnConfigs } from '@mavrix/shared';
import { SymbolSelect } from '@/shared/symbols';


function resolveSLPoints(rawSl) {
  const raw = rawSl === '' || rawSl == null ? null : Number(rawSl);
  if (raw == null || Number.isNaN(raw) || raw <= 0) return null;
  return +raw.toFixed(4);
}

function slPointsToDisplay(slPoints) {
  if (slPoints == null) return '';
  const n = Number(slPoints);
  return Number.isFinite(n) ? String(n) : '';
}

// Live R preview for Backtest trades.
function RPreview({ form, initialR = 1 }) {
  const [targetR, setTargetR] = useState(initialR);
  useEffect(() => { setTargetR(initialR); }, [initialR]);

  const sl = Number(form.sl);
  const mae = Number(form.mae);
  const mfe = Number(form.mfe);
  const ready = Number.isFinite(sl) && sl > 0 && Number.isFinite(mae) && Number.isFinite(mfe);

  return (
    <div className="at-r-preview">
      <div className="at-r-head">
        <span className="at-r-head-label">Live R Preview</span>
        <div className="at-r-targets">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((r) => (
            <button
              key={r}
              type="button"
              className={`at-r-target${targetR === r ? ' is-active' : ''}`}
              onClick={() => setTargetR(r)}
              aria-pressed={targetR === r}
            >
              1:{r}
            </button>
          ))}
        </div>
      </div>

      {!ready && (
        <div className="at-r-hint">
          Fill SL, MAE and MFE to see how this trade scores at each R target.
        </div>
      )}

      {ready && (() => {
        const target = sl * targetR;
        const slHit = mae >= sl;
        const win = !slHit && mfe >= target;
        const rAchieved = slHit ? 0 : +(mfe / sl).toFixed(2);
        const result = slHit ? 'loss' : win ? 'win' : 'loss';
        const color = result === 'win' ? '#35C4A1' : '#FF5C5C';
        return (
          <div className="at-r-rows">
            <div className="at-r-row">
              <span className="at-r-label">At 1:{targetR} target</span>
              <span className="at-r-badge" style={{ color, borderColor: `${color}66`, background: `${color}15` }}>
                {result === 'win' ? 'WIN' : 'LOSS'}
              </span>
            </div>
            <div className="at-r-row">
              <span className="at-r-label">SL hit?</span>
              <span style={{ color: slHit ? '#FF5C5C' : 'var(--ink-2)' }}>
                {slHit ? `Yes (MAE ${mae} >= SL ${sl})` : `No (MAE ${mae} < SL ${sl})`}
              </span>
            </div>
            <div className="at-r-row">
              <span className="at-r-label">R achieved</span>
              <span style={{ color: 'var(--ink-1)', fontWeight: 700 }}>
                {rAchieved.toFixed(2)}R
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
// Auto-computed P&L hint -- shown when entry, exit, quantity and direction
// are all filled. Clicking copies the computed value into the P&L field.
function PnlHint({ form, setForm }) {
  const { entryPrice, exitPrice, quantity, direction, pnl } = form;
  const ep = Number(entryPrice), xp = Number(exitPrice), q = Number(quantity);
  if (!Number.isFinite(ep) || !Number.isFinite(xp) || !Number.isFinite(q) || q <= 0) {
    return null;
  }
  const raw = direction === 'Short' ? (ep - xp) * q : (xp - ep) * q;
  if (!Number.isFinite(raw) || raw === 0) return null;
  const computed = +raw.toFixed(2);
  const current = pnl === '' ? null : Number(pnl);
  const same = current != null && Math.abs(current - computed) < 0.01;
  const positive = computed > 0;
  return (
    <div
      className="at-pnl-hint"
      onClick={() => setForm((f) => ({ ...f, pnl: String(computed) }))}
      title="Click to copy into P&L"
    >
      <span style={{ color: 'var(--ink-3)' }}>Computed from prices:</span>{' '}
      <b style={{ color: positive ? '#35C4A1' : '#FF5C5C' }}>
        {positive ? '+' : ''}{computed.toFixed(2)}
      </b>
      {same
        ? <span style={{ color: '#35C4A1', marginLeft: 8 }}>matches P&L</span>
        : <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>click to fill</span>}
    </div>
  );
}
const EMPTY = {
  date: '',
  entryTime: '',
  exitTime: '',
  direction: 'Long',
  symbol: '',
  strategyId: '',
  mae: '',
  mfe: '',
  sl: '',
  entryPrice: '',
  exitPrice: '',
  takeProfit: '',
  stopLoss: '',
  pnl: '',
  quantity: '',
  commission: '',
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
     
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    width: 100%; max-width: 620px; max-height: 90vh; max-height: 90dvh;
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
  .at-close:hover:not(:disabled) { color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
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
  .at-label .opt {
    color: var(--ink-3); font-weight: 500;
    letter-spacing: 0; text-transform: none;
    margin-left: 6px; opacity: .7;
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
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
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
  .at-pnl-hint {
    margin-top: 6px;
    padding: 8px 11px;
    border-radius: 8px;
    background: rgba(255,255,255,.02);
    border: 1px dashed rgba(255,255,255,.12);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    color: var(--ink-2);
    cursor: pointer;
    transition: border-color .15s, background-color .15s;
  }
  .at-pnl-hint:hover {
    border-color: var(--accent-soft2);
    background: color-mix(in srgb, var(--accent) 4%, transparent);
  }
  .at-field-hint {
    margin: 6px 0 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    line-height: 1.55;
    letter-spacing: .01em;
  }
  .at-field-hint b { color: var(--ink-2); font-weight: 700; }

  .at-r-preview {
    padding: 12px 14px;
    border-radius: 12px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .at-r-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }
  .at-r-head-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .at-r-targets {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border-radius: 8px;
    background: rgba(0,0,0,.3);
    border: 1px solid rgba(255,255,255,.06);
  }
  .at-r-target {
    padding: 3px 8px;
    border-radius: 5px;
    border: none;
    background: transparent;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all .15s;
    white-space: nowrap;
  }
  .at-r-target:hover:not(.is-active) {
    color: var(--ink-1);
    background: rgba(255,255,255,.04);
  }
  .at-r-target.is-active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-weight: 700;
    box-shadow: 0 2px 8px -4px color-mix(in srgb, var(--accent) 60%, transparent);
  }
  .at-r-hint {
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(255,255,255,.015);
    border: 1px dashed rgba(255,255,255,.1);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--ink-3);
    line-height: 1.55;
    text-align: center;
  }
  .at-r-rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
  }
  .at-r-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .at-r-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .at-r-badge {
    padding: 3px 10px;
    border-radius: 99px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 700;
    border: 1px solid;
    letter-spacing: .04em;
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
    box-shadow: 0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent),
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
    box-shadow: 0 16px 42px -10px color-mix(in srgb, var(--accent) 70%, transparent),
                inset 0 1px 0 rgba(255,255,255,.5);
  }
  .at-btn-primary:disabled {
    background: linear-gradient(135deg,
                color-mix(in srgb, var(--accent) 32%, transparent), color-mix(in srgb, var(--accent-2) 28%, transparent));
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


export default function AddTradeModal({ isOpen, onClose, account, trade = null, currentR = 1 }) {
  const isEdit = !!trade;
  const isBacktest = account?.type === 'Backtest';

  const [form, setForm] = useState(EMPTY);
  const [custom, setCustom] = useState({});
  const [error, setError] = useState('');

  const createTrade = useCreateTrade();
  const updateTrade = useUpdateTrade();
  const saving = createTrade.isPending || updateTrade.isPending;

  const { data: allStrategies = [] } = useStrategies();

  const availableStrategies = useMemo(() => {
    const visible = allStrategies.filter((s) => s.status !== 'archived');
    if (isEdit && trade?.strategyId) {
      const current = allStrategies.find((s) => s.id === trade.strategyId);
      if (current && !visible.some((s) => s.id === current.id)) {
        visible.push(current);
      }
    }
    return visible.sort((a, b) => a.name.localeCompare(b.name));
  }, [allStrategies, isEdit, trade]);

  const columnConfigs = useMemo(
    () => normalizeColumnConfigs(account?.columnConfigs || {}),
    [account]
  );

  const customKeys = useMemo(() => {
    const cfgKeys = Object.keys(columnConfigs);
    const tradeKeys = isEdit ? Object.keys(trade?.dynamic || {}) : [];
    const union = new Set([...cfgKeys, ...tradeKeys]);
    return [...union].sort();
  }, [columnConfigs, isEdit, trade]);

  useEffect(() => {
    if (!isOpen) return;

    if (isEdit && trade) {
      setForm({
        date: trade.date || '',
        entryTime: trade.entry || '',
        exitTime: trade.exit || '',
        direction: trade.dir || 'Long',
        symbol: trade.symbol || '',
        strategyId: trade.strategyId || '',
        mae: trade.mae != null ? String(trade.mae) : '',
        mfe: trade.mfe != null ? String(trade.mfe) : '',
        sl: isBacktest ? slPointsToDisplay(trade.slPoints) : '',
        entryPrice: trade.entryPrice != null ? String(trade.entryPrice) : '',
        exitPrice: trade.exitPrice != null ? String(trade.exitPrice) : '',
        takeProfit: trade.takeProfit != null ? String(trade.takeProfit) : '',
        stopLoss: trade.stopLoss != null ? String(trade.stopLoss) : '',
        pnl: trade.pnl != null ? String(trade.pnl) : '',
        quantity: trade.quantity != null ? String(trade.quantity) : '',
        commission: trade.commission != null ? String(trade.commission) : '',
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
        sl: '',
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

    if (!form.symbol || !String(form.symbol).trim()) {
      return 'Symbol is required.';
    }

    const q = Number(form.quantity);
    if (form.quantity === '' || !Number.isFinite(q) || q <= 0) {
      return 'Quantity must be a positive number.';
    }

    if (isBacktest) {
      if (form.mae === '' || Number.isNaN(Number(form.mae))) return 'MAE is required.';
      if (form.mfe === '' || Number.isNaN(Number(form.mfe))) return 'MFE is required.';
      const pts = resolveSLPoints(form.sl);
      if (pts == null) {
        return 'SL is required for every Backtest trade (in points).';
      }
    } else {
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
      strategyId: form.strategyId || null,
      pnl: form.pnl === '' ? 0 : Number(form.pnl) || 0,
      quantity: Number(form.quantity),
      notes: form.notes.trim(),
    };
    const parsedCommission = form.commission === '' ? null : Number(form.commission);
    const commissionValue = Number.isFinite(parsedCommission) && parsedCommission >= 0 ? parsedCommission : null;


    const payload = isBacktest
      ? {
          ...base,
          mae: Number(form.mae),
          mfe: Number(form.mfe),
          slPoints: resolveSLPoints(form.sl),
          exitPrice: null,
          pnl: 0,
          commission: commissionValue,
        }
      : {
          ...base,
          entryPrice: form.entryPrice === '' ? null : Number(form.entryPrice),
          exitPrice: form.exitPrice === '' ? null : Number(form.exitPrice),
          takeProfit: form.takeProfit === '' ? null : Number(form.takeProfit),
          stopLoss: form.stopLoss === '' ? null : Number(form.stopLoss),
          commission: commissionValue,
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
  const showStrategyPicker = availableStrategies.length > 0;

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
                    <label htmlFor="at-symbol" className="at-label">
                      Symbol<span className="req">*</span>
                    </label>
                    <SymbolSelect
                      id="at-symbol"
                      value={form.symbol}
                      onChange={(code) => set('symbol', code)}
                      placeholder="Select symbol..."
                      disabled={saving}
                    />
                  </div>
                </div>

                {showStrategyPicker && (
                  <div>
                    <label className="at-label">
                      Strategy
                      <span className="opt">optional</span>
                    </label>
                    <select
                      className="at-select"
                      value={form.strategyId}
                      onChange={(e) => set('strategyId', e.target.value)}
                      disabled={saving}
                    >
                      <option value="">-- None --</option>
                      {availableStrategies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.status === 'archived' ? ' (archived)' : ''}
                          {s.status === 'paused' ? ' (paused)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="at-section">
                <span className="at-section-title">Outcome</span>

                {isBacktest ? (
                  <>
                    <div>
                      <label className="at-label">SL (points)<span className="req">*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="at-input"
                        placeholder="e.g. 12.5"
                        value={form.sl}
                        onChange={(e) => set('sl', e.target.value)}
                        disabled={saving}
                      />
                      <p className="at-field-hint">
                        Distance to the stop in <b>index points</b>. 1 tick = 0.25 pts on NQ/ES. This defines 1R.
                      </p>
                    </div>

                    <div className="at-grid-2">
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
                        <label className="at-label">
                          Commission
                          <span className="opt">optional</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="at-input"
                          placeholder="0.00"
                          value={form.commission}
                          onChange={(e) => set('commission', e.target.value)}
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <RPreview form={form} initialR={currentR} />
                  </>
                ) : (
                  <>
                    <div className="at-grid-2">
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
                        <label className="at-label">Exit Price</label>
                        <input
                          type="number"
                          step="any"
                          className="at-input"
                          placeholder="0.00"
                          value={form.exitPrice}
                          onChange={(e) => set('exitPrice', e.target.value)}
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div className="at-grid-2">
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
                    </div>

                    <PnlHint form={form} setForm={setForm} />

                    <div>
                      <label className="at-label">
                        Commission
                        <span className="opt">optional</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="at-input"
                        placeholder="0.00"
                        value={form.commission}
                        onChange={(e) => set('commission', e.target.value)}
                        disabled={saving}
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="at-label">Notes</label>
                <textarea
                  className="at-textarea"
                  placeholder="Optional - trade context, lessons learned..."
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
                className="at-btn at-btn"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="at-spinner" />
                    <span>{isEdit ? 'Saving...' : 'Adding...'}</span>
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