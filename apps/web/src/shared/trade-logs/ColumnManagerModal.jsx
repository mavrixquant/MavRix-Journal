
// apps/web/src/shared/trade-logs/ColumnManagerModal.jsx
//
// Column manager modal — full CRUD on an account's custom columns.
//
// A "custom column" is any column name that appears in a trade's `dynamic`
// JSON blob, or in the account's `columnConfigs`. This modal lets the user
// add / rename / delete columns, and edit the type + dropdown options.
//
// TYPE INFERENCE + LOCKING
// ------------------------
// The type of each column is INFERRED from the union of values across the
// account's trades, then the type selector is LOCKED for cases where the
// data leaves no choice:
//
//   - No values anywhere        → LOCKED text
//   - All values numeric        → LOCKED number
//   - >10 unique values         → LOCKED text (dropdowns must be small enums)
//   - 1–10 unique, mixed types  → UNLOCKED (user picks text / dropdown)
//
// Locking stops the user from silently breaking the data contract — e.g.
// turning a numeric column into a dropdown of strings.

import { useEffect, useMemo, useState } from 'react';
import {
  FaTimes,
  FaPlus,
  FaTrash,
  FaEdit,
  FaCheck,
} from 'react-icons/fa';

import Portal from '@/shared/components/Portal';
import Alert from '@/shared/components/Alert';
import { useUpdateColumnConfigs } from '@/shared/api/accounts';
import {
  useAddCustomColumn,
  useRenameCustomColumn,
  useDeleteCustomColumn,
} from '@/shared/api/trades';
import { normalizeColumnConfigs } from '@mavrix/shared';

const TYPES = [
  { value: 'text',     label: 'Text' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'number',   label: 'Number' },
];

const MAX_DROPDOWN_UNIQUES = 10;

// Reserved column names — cannot be used as custom column names.
// Kept in sync with the API's RESERVED set in
// apps/api/src/services/trades.service.js.
const RESERVED = new Set([
  'date', 'entryTime', 'exitTime', 'direction', 'symbol',
  'mae', 'mfe', 'slPoints',
  'entryPrice', 'takeProfit', 'stopLoss',
  'pnl', 'quantity', 'notes',
]);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isNumericValue(v) {
  if (v === '' || v === null || v === undefined) return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return true;
    return /^-?\d+(\.\d+)?$/.test(t);
  }
  return false;
}

function hasAnyValue(v) {
  return v !== '' && v !== null && v !== undefined;
}

/**
 * Compute inferred type + lock + unique values for a column name.
 *
 * `trades` is the raw trades array (from useTrades — NOT enriched).
 * Values are read from `trade[name]` because custom column values live
 * at the top level of the raw DB payload, not under a nested key.
 */
function inferColumnMeta(name, trades) {
  const values = [];
  for (const t of trades) {
    const v = t?.[name];
    if (hasAnyValue(v)) values.push(String(v));
  }

  if (values.length === 0) {
    return {
      lockedType: 'text',
      locked: true,
      reason: 'No values yet — defaults to Text',
      unique: [],
    };
  }

  const allNumeric = values.every(isNumericValue);
  if (allNumeric) {
    return {
      lockedType: 'number',
      locked: true,
      reason: 'All values numeric',
      unique: [],
    };
  }

  const uniqueSet = new Set(values.map((v) => v.trim()).filter(Boolean));
  const unique = [...uniqueSet].sort();

  if (unique.length > MAX_DROPDOWN_UNIQUES) {
    return {
      lockedType: 'text',
      locked: true,
      reason: `${unique.length} unique values (over ${MAX_DROPDOWN_UNIQUES}) — Text required`,
      unique,
    };
  }

  return {
    lockedType: null,           // user picks
    locked: false,
    reason: `${unique.length} unique value${unique.length === 1 ? '' : 's'}`,
    unique,
  };
}

/* ------------------------------------------------------------------ */
/*  Local spinner                                                      */
/* ------------------------------------------------------------------ */
function Spinner({ size = 12, variant = 'dark' }) {
  return (
    <span
      className={`cm-spinner ${variant === 'light' ? 'is-light' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                         */
/* ------------------------------------------------------------------ */
const CSS = `
  .cm-overlay {
    position: fixed; inset: 0;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 16px;
    animation: cmFade .18s ease;
  }
  .cm-modal {
    --accent: #F59E0B; --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    --win: #22c55e; --loss: #ef4444;
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
    animation: cmModalIn .28s cubic-bezier(.2,.8,.25,1);
  }
  .cm-head {
    padding: 18px 22px 14px; border-bottom: 1px solid var(--line-soft);
    display: flex; justify-content: space-between; align-items: center;
    position: relative; flex-shrink: 0;
  }
  .cm-head::before {
    content: ''; position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent),
                var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: cmGrad 4s linear infinite;
    transition: background .3s ease;
  }
  .cm-modal.is-busy .cm-head::before {
    animation-duration: .9s;
  }
  .cm-title { font-size: 16px; font-weight: 700; margin: 0; letter-spacing: -.01em; }
  .cm-sub {
    margin: 4px 0 0; font-size: 11.5px; color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .cm-close {
    background: none; border: none; color: var(--ink-2);
    font-size: 15px; cursor: pointer; padding: 6px; border-radius: 8px;
    transition: all .2s;
  }
  .cm-close:hover:not(:disabled) {
    color: var(--accent); background: rgba(245,158,11,.08);
  }
  .cm-close:disabled { opacity: .35; cursor: not-allowed; }
  .cm-body {
    padding: 20px 22px; overflow-y: auto; flex: 1;
    display: flex; flex-direction: column; gap: 16px;
  }
  .cm-body::-webkit-scrollbar { width: 8px; }
  .cm-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08); border-radius: 99px;
  }
  .cm-section-title {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--accent);
    display: flex; align-items: center; gap: 8px;
  }
  .cm-count { color: var(--ink-3); font-weight: 600; }
  .cm-addrow {
    display: grid; grid-template-columns: 1fr 130px auto;
    gap: 8px; align-items: stretch;
  }
  .cm-label {
    display: block; margin-bottom: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--ink-3);
  }
  .cm-input, .cm-select {
    width: 100%; padding: 9px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: var(--ink-1);
    font-size: 12.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    outline: none; box-sizing: border-box; transition: all .2s;
  }
  .cm-input::placeholder { color: var(--ink-3); }
  .cm-input:hover:not(:disabled), .cm-select:hover:not(:disabled) {
    border-color: rgba(255,255,255,.2);
  }
  .cm-input:focus, .cm-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .cm-input:disabled, .cm-select:disabled {
    opacity: .55; cursor: not-allowed;
  }
  .cm-select {
    appearance: none; -webkit-appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='%23545E6E'><path d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/></svg>");
    background-repeat: no-repeat; background-position: right 10px center;
    padding-right: 32px; cursor: pointer;
  }
  .cm-select:disabled { cursor: not-allowed; }
  .cm-addbtn {
    padding: 0 16px; border-radius: 10px; border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117; font-weight: 700; font-size: 11.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .02em; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    box-shadow: 0 8px 20px -10px rgba(245,158,11,.6),
                inset 0 1px 0 rgba(255,255,255,.4);
    transition: all .2s; white-space: nowrap; min-width: 84px;
  }
  .cm-addbtn:hover:not(:disabled) { transform: translateY(-1px); }
  .cm-addbtn:disabled { opacity: .5; cursor: not-allowed; }

  /* ---------- Column list ---------- */
  .cm-list {
    display: flex; flex-direction: column; gap: 10px;
  }
  .cm-row {
    padding: 12px 14px;
    border-radius: 12px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
    transition: border-color .2s, background-color .2s;
  }
  .cm-row:hover { border-color: rgba(255,255,255,.12); }
  .cm-row.is-busy {
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.05);
  }
  .cm-row.is-renaming {
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.04);
  }

  .cm-row-head {
    display: flex; justify-content: space-between; align-items: center;
    gap: 10px; flex-wrap: wrap;
  }
  .cm-row-name-wrap {
    display: flex; align-items: baseline; gap: 8px;
    min-width: 0; flex: 1; flex-wrap: wrap;
  }
  .cm-row-name {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px; font-weight: 600; color: var(--ink-1);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .cm-row-reason {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: var(--ink-2);
  }
  .cm-row-actions { display: flex; gap: 6px; flex-shrink: 0; }

  .cm-icon-btn {
    width: 30px; height: 30px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2); cursor: pointer;
    transition: all .18s;
  }
  .cm-icon-btn:hover:not(:disabled) {
    color: var(--accent); background: rgba(245,158,11,.08);
    border-color: var(--accent-soft2);
  }
  .cm-icon-btn:disabled { opacity: .5; cursor: not-allowed; }
  .cm-icon-btn.is-danger:hover:not(:disabled) {
    color: #f87171; background: rgba(239,68,68,.08);
    border-color: rgba(239,68,68,.4);
  }
  .cm-icon-btn.is-ok {
    color: #4ade80;
    background: rgba(34,197,94,.08);
    border-color: rgba(34,197,94,.35);
  }
  .cm-icon-btn.is-ok:hover:not(:disabled) {
    color: #86efac;
    background: rgba(34,197,94,.14);
    border-color: rgba(34,197,94,.55);
  }

  .cm-rename-input {
    flex: 1; min-width: 120px;
    padding: 6px 10px;
    background: rgba(10,13,19,.7);
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 8px;
    color: var(--ink-1);
    font-size: 13px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    outline: none;
  }
  .cm-rename-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .cm-rename-error {
    margin-top: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: #f87171;
    letter-spacing: .01em;
  }

  /* ---------- Type + lock row ---------- */
  .cm-type-row {
    margin-top: 10px;
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .cm-type-select {
    padding: 6px 28px 6px 10px;
    font-size: 11px;
    max-width: 160px;
  }
  .cm-lock-pill {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; padding: 4px 10px;
    border-radius: 6px;
    background: rgba(255,255,255,.05);
    border: 1px solid var(--line);
    color: var(--ink-2);
    display: inline-flex; align-items: center; gap: 6px;
  }

  /* ---------- Dropdown options editor ---------- */
  .cm-options {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--line-soft);
  }
  .cm-options-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-bottom: 8px;
    display: block;
  }
  .cm-options-chips {
    display: flex; flex-wrap: wrap; gap: 6px;
    margin-bottom: 10px;
  }
  .cm-opt-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 4px 4px 10px;
    border-radius: 99px;
    background: var(--accent-soft);
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 600;
    letter-spacing: .01em;
    max-width: 240px;
  }
  .cm-opt-chip-text {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .cm-opt-chip-remove {
    display: inline-flex; align-items: center; justify-content: center;
    width: 16px; height: 16px;
    border-radius: 50%;
    border: none;
    background: rgba(245,158,11,.18);
    color: inherit;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: all .15s;
  }
  .cm-opt-chip-remove:hover:not(:disabled) {
    background: rgba(245,158,11,.38); color: #fff;
  }
  .cm-opt-chip-remove:disabled {
    opacity: .4; cursor: not-allowed;
  }
  .cm-options-empty {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    padding: 6px 0 10px;
    font-style: italic;
  }
  .cm-options-add {
    display: flex; gap: 6px; align-items: stretch;
  }
  .cm-options-add input {
    flex: 1;
    padding: 7px 10px;
    background: rgba(10,13,19,.7);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 8px;
    color: var(--ink-1);
    font-size: 12px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    outline: none;
    transition: border-color .15s;
  }
  .cm-options-add input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .cm-options-add button {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 7px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer;
    transition: all .15s;
    white-space: nowrap;
  }
  .cm-options-add button:hover:not(:disabled) {
    color: var(--accent);
    background: rgba(245,158,11,.08);
    border-color: var(--accent-soft2);
  }
  .cm-options-add button:disabled {
    opacity: .35; cursor: not-allowed;
  }

  .cm-empty {
    padding: 40px 20px; text-align: center;
    color: var(--ink-3);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    border: 1px dashed rgba(255,255,255,.08);
    border-radius: 12px;
    background: rgba(255,255,255,.015);
  }
  .cm-empty b { color: var(--accent); }
  .cm-error {
    padding: 10px 12px; border-radius: 10px;
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.28);
    color: #fca5a5;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; line-height: 1.55;
  }
  .cm-hint {
    margin: 0; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; line-height: 1.6; color: var(--ink-2);
  }
  .cm-foot {
    padding: 14px 22px; border-top: 1px solid var(--line-soft);
    display: flex; gap: 10px; align-items: center;
    background: rgba(0,0,0,.15); flex-shrink: 0;
  }
  .cm-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03); color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer; transition: all .22s; white-space: nowrap;
  }
  .cm-btn:hover:not(:disabled) {
    color: var(--ink-1); background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
  }
  .cm-btn:disabled { opacity: .5; cursor: not-allowed; }

  /* ---------- spinner ---------- */
  .cm-spinner {
    display: inline-block;
    border-radius: 50%;
    border: 2px solid rgba(13, 17, 23, .3);
    border-top-color: #0D1117;
    animation: cmSpin .7s linear infinite;
    flex-shrink: 0;
    vertical-align: middle;
  }
  .cm-spinner.is-light {
    border-color: rgba(255, 255, 255, .2);
    border-top-color: var(--accent);
  }

  @keyframes cmFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cmModalIn {
    from { opacity: 0; transform: translateY(-12px) scale(.97); }
    to { opacity: 1; transform: none; }
  }
  @keyframes cmGrad {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes cmSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .cm-head::before { animation: none !important; }
    .cm-spinner { animation-duration: 1.6s; }
    .cm-btn, .cm-icon-btn, .cm-opt-chip-remove, .cm-options-add button {
      transition: none !important;
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Column row component                                              */
/* ------------------------------------------------------------------ */

function ColumnRow({
  name,
  config,
  meta,
  disabled,
  allNames,
  onRename,
  onDeleteRequest,
  onTypeChange,
  onOptionsChange,
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(name);
  const [renameError, setRenameError] = useState('');
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    if (!renaming) setRenameDraft(name);
  }, [name, renaming]);

  const startRename = () => {
    setRenameDraft(name);
    setRenameError('');
    setRenaming(true);
  };

  const cancelRename = () => {
    setRenameDraft(name);
    setRenameError('');
    setRenaming(false);
  };

  const commitRename = () => {
    const next = renameDraft.trim();
    if (!next) {
      setRenameError('Name cannot be empty.');
      return;
    }
    if (next.length > 40) {
      setRenameError('Name must be 40 chars or fewer.');
      return;
    }
    if (RESERVED.has(next)) {
      setRenameError(`"${next}" is a reserved column name.`);
      return;
    }
    if (next !== name && allNames.includes(next)) {
      setRenameError(`"${next}" is already used by another column.`);
      return;
    }
    onRename(next);
    setRenameError('');
    setRenaming(false);
  };

  const type = config.type;
  const locked = meta.locked;
  const lockedType = meta.lockedType;
  const isDropdown = type === 'dropdown';

  const handleAddOption = () => {
    const val = newOption.trim();
    if (!val) return;
    if (config.options?.includes(val)) {
      setNewOption('');
      return;
    }
    const nextOptions = [...(config.options || []), val];
    onOptionsChange(nextOptions);
    setNewOption('');
  };

  const handleRemoveOption = (opt) => {
    const nextOptions = (config.options || []).filter((o) => o !== opt);
    onOptionsChange(nextOptions);
  };

  return (
    <div className={`cm-row ${renaming ? 'is-renaming' : ''}`}>
      {/* ---------- Header row: name + actions ---------- */}
      <div className="cm-row-head">
        {renaming ? (
          <>
            <input
              type="text"
              className="cm-rename-input"
              value={renameDraft}
              maxLength={40}
              autoFocus
              disabled={disabled}
              onChange={(e) => { setRenameDraft(e.target.value); setRenameError(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                else if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
              }}
            />
            <div className="cm-row-actions">
              <button
                type="button"
                className="cm-icon-btn is-ok"
                onClick={commitRename}
                disabled={disabled}
                title="Save name"
              >
                <FaCheck size={11} />
              </button>
              <button
                type="button"
                className="cm-icon-btn"
                onClick={cancelRename}
                disabled={disabled}
                title="Cancel"
              >
                <FaTimes size={11} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="cm-row-name-wrap">
              <span className="cm-row-name" title={name}>{name}</span>
              <span className="cm-row-reason">{meta.reason}</span>
            </div>
            <div className="cm-row-actions">
              <button
                type="button"
                className="cm-icon-btn"
                onClick={startRename}
                disabled={disabled}
                title="Rename"
              >
                <FaEdit size={11} />
              </button>
              <button
                type="button"
                className="cm-icon-btn is-danger"
                onClick={onDeleteRequest}
                disabled={disabled}
                title="Delete column"
              >
                <FaTrash size={11} />
              </button>
            </div>
          </>
        )}
      </div>

      {renameError && <div className="cm-rename-error">{renameError}</div>}

      {/* ---------- Type row ---------- */}
      {!renaming && (
        <div className="cm-type-row">
          {locked ? (
            <span className="cm-lock-pill">
              🔒{' '}
              {lockedType === 'number' ? 'Number'
                : lockedType === 'dropdown' ? 'Dropdown'
                : 'Text'}{' '}
              (locked)
            </span>
          ) : (
            <select
              className="cm-select cm-type-select"
              value={type}
              disabled={disabled}
              onChange={(e) => onTypeChange(e.target.value)}
            >
              <option value="text">Text</option>
              <option value="dropdown">Dropdown</option>
            </select>
          )}
        </div>
      )}

      {/* ---------- Dropdown options editor ---------- */}
      {!renaming && isDropdown && (
        <div className="cm-options">
          <span className="cm-options-label">
            Options ({config.options?.length || 0})
          </span>

          {(config.options?.length || 0) > 0 ? (
            <div className="cm-options-chips">
              {config.options.map((opt) => (
                <span key={opt} className="cm-opt-chip">
                  <span className="cm-opt-chip-text" title={opt}>{opt}</span>
                  <button
                    type="button"
                    className="cm-opt-chip-remove"
                    onClick={() => handleRemoveOption(opt)}
                    disabled={disabled}
                    aria-label={`Remove option ${opt}`}
                    title={`Remove "${opt}"`}
                  >
                    <FaTimes size={8} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="cm-options-empty">
              No options yet. Add at least one.
            </div>
          )}

          <div className="cm-options-add">
            <input
              type="text"
              placeholder="Add new option…"
              value={newOption}
              maxLength={60}
              disabled={disabled}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAddOption(); }
              }}
            />
            <button
              type="button"
              onClick={handleAddOption}
              disabled={
                disabled ||
                !newOption.trim() ||
                (config.options || []).includes(newOption.trim())
              }
            >
              <FaPlus size={9} /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main modal                                                        */
/* ------------------------------------------------------------------ */

export default function ColumnManagerModal({ isOpen, onClose, account, trades = [] }) {
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('text');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Local draft of the account's columnConfigs — edited inline, persisted
  // on each change via updateCfg.mutateAsync().
  const [configs, setConfigs] = useState({});

  const addCol    = useAddCustomColumn();
  const renameCol = useRenameCustomColumn();
  const deleteCol = useDeleteCustomColumn();
  const updateCfg = useUpdateColumnConfigs();

  const busy = pending !== null;
  const isPending = (op, key) =>
    pending?.op === op && (key === undefined || pending?.key === key);

  // Sync from account whenever the modal opens or the account changes.
  useEffect(() => {
    if (!isOpen) return;
    setConfigs(normalizeColumnConfigs(account?.columnConfigs || {}));
    setNewName('');
    setNewType('text');
    setError('');
    setPending(null);
    setDeleteTarget(null);
  }, [isOpen, account]);

  const columnNames = useMemo(
    () => Object.keys(configs).sort((a, b) => a.localeCompare(b)),
    [configs]
  );

  // Infer lock + unique values per column, memoized on (names, trades).
  const columnMeta = useMemo(() => {
    const map = {};
    for (const name of columnNames) {
      map[name] = inferColumnMeta(name, trades);
    }
    return map;
  }, [columnNames, trades]);

  if (!isOpen || !account) return null;

  /* ---------------------------------------------------------------- */
  /*  Add                                                              */
  /* ---------------------------------------------------------------- */
  const handleAdd = async () => {
    setError('');
    const name = newName.trim();
    if (!name) { setError('Column name is required.'); return; }
    if (name.length > 40) { setError('Column name must be 40 chars or fewer.'); return; }
    if (configs[name]) { setError(`"${name}" already exists.`); return; }
    if (RESERVED.has(name)) { setError(`"${name}" is a reserved column name.`); return; }

    setPending({ op: 'add' });
    try {
      await addCol.mutateAsync({ accountId: account.id, name });
      const next = {
        ...configs,
        [name]: newType === 'dropdown'
          ? { type: 'dropdown', options: [] }
          : { type: newType },
      };
      await updateCfg.mutateAsync({ accountId: account.id, columnConfigs: next });
      setConfigs(next);
      setNewName('');
      setNewType('text');
    } catch (err) {
      setError(err?.message || 'Could not add column.');
    } finally {
      setPending(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Rename                                                           */
  /* ---------------------------------------------------------------- */
  const handleRename = async (oldName, newNameStr) => {
    if (!newNameStr || newNameStr === oldName) return;

    setPending({ op: 'rename', key: oldName });
    try {
      await renameCol.mutateAsync({
        accountId: account.id,
        oldName,
        newName: newNameStr,
      });
      const next = { ...configs };
      const cfg = next[oldName];
      delete next[oldName];
      next[newNameStr] = cfg;
      await updateCfg.mutateAsync({ accountId: account.id, columnConfigs: next });
      setConfigs(next);
    } catch (err) {
      setError(err?.message || 'Could not rename column.');
      throw err;
    } finally {
      setPending(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Change type                                                      */
  /* ---------------------------------------------------------------- */
  const handleTypeChange = async (name, type) => {
    setPending({ op: 'type', key: name });
    try {
      const next = {
        ...configs,
        [name]: type === 'dropdown'
          ? { type: 'dropdown', options: configs[name]?.options || [] }
          : { type },
      };
      await updateCfg.mutateAsync({ accountId: account.id, columnConfigs: next });
      setConfigs(next);
    } catch (err) {
      setError(err?.message || 'Could not update column type.');
    } finally {
      setPending(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Dropdown options change                                          */
  /* ---------------------------------------------------------------- */
  const handleOptionsChange = async (name, options) => {
    setPending({ op: 'options', key: name });
    try {
      const next = {
        ...configs,
        [name]: { type: 'dropdown', options },
      };
      await updateCfg.mutateAsync({ accountId: account.id, columnConfigs: next });
      setConfigs(next);
    } catch (err) {
      setError(err?.message || 'Could not update options.');
    } finally {
      setPending(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Delete                                                           */
  /* ---------------------------------------------------------------- */
  const requestDelete = (name) => {
    setDeleteTarget(name);
    setError('');
  };

  const confirmDelete = async () => {
    const name = deleteTarget;
    if (!name) return;
    setDeleteTarget(null);
    setPending({ op: 'delete', key: name });
    try {
      await deleteCol.mutateAsync({ accountId: account.id, name });
      const next = { ...configs };
      delete next[name];
      await updateCfg.mutateAsync({ accountId: account.id, columnConfigs: next });
      setConfigs(next);
    } catch (err) {
      setError(err?.message || 'Could not delete column.');
    } finally {
      setPending(null);
    }
  };

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="cm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy) onClose();
        }}
      >
        <div className={`cm-modal ${busy ? 'is-busy' : ''}`}>
          <div className="cm-head">
            <div>
              <h2 className="cm-title">Custom Columns</h2>
              <p className="cm-sub">
                Manage extra fields on <b>{account.name}</b>
              </p>
            </div>
            <button
              className="cm-close"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>

          <div className="cm-body">
            {error && <div className="cm-error">{error}</div>}

            {/* ---- Add new ---- */}
            <div>
              <span className="cm-section-title">Add a column</span>
              <div style={{ marginTop: 10 }} className="cm-addrow">
                <input
                  type="text"
                  className="cm-input"
                  placeholder="e.g. Setup, Confidence, Session"
                  value={newName}
                  maxLength={40}
                  disabled={busy}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                />
                <select
                  className="cm-select"
                  value={newType}
                  disabled={busy}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="cm-addbtn"
                  onClick={handleAdd}
                  disabled={busy || !newName.trim()}
                >
                  {isPending('add') ? (
                    <>
                      <Spinner size={11} />
                      <span>Adding…</span>
                    </>
                  ) : (
                    <>
                      <FaPlus size={10} />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </div>
              <p className="cm-hint" style={{ marginTop: 8 }}>
                The column is added to every existing trade as an empty cell.
              </p>
            </div>

            {/* ---- Existing ---- */}
            <div>
              <span className="cm-section-title">
                Existing columns
                <span className="cm-count">({columnNames.length})</span>
              </span>

              <div style={{ marginTop: 10 }} className="cm-list">
                {columnNames.length === 0 ? (
                  <div className="cm-empty">
                    No custom columns yet. Add one above — it will appear as an
                    extra column on <b>Trade Logs</b>.
                  </div>
                ) : (
                  columnNames.map((name) => (
                    <ColumnRow
                      key={name}
                      name={name}
                      config={configs[name]}
                      meta={columnMeta[name] || { locked: false, reason: '' }}
                      allNames={columnNames}
                      disabled={busy}
                      onRename={(next) => handleRename(name, next)}
                      onDeleteRequest={() => requestDelete(name)}
                      onTypeChange={(type) => handleTypeChange(name, type)}
                      onOptionsChange={(opts) => handleOptionsChange(name, opts)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="cm-foot">
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="cm-btn"
              onClick={onClose}
              disabled={busy}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ---- Modern delete confirmation ---- */}
      <Alert
        isOpen={!!deleteTarget}
        type="confirm"
        title="Delete column?"
        message={`Delete column "${deleteTarget}" from every trade? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Portal>
  );
}