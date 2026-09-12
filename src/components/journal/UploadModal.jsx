// src/components/journal/UploadModal.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { FaFileUpload, FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import Portal from '../common/Portal';
import { createTrades, generateTradeId } from '../../firebase/tradesService';
import { updateAccountColumnConfigs } from '../../firebase/accountsService';

const TICKS_PER_POINT = 4;
const MAX_DROPDOWN_UNIQUES = 10;

function resolveSLPoints(rawSl, account) {
  const raw = (rawSl === '' || rawSl === undefined || rawSl === null) ? null : Number(rawSl);
  const hasRaw = raw !== null && !isNaN(raw) && raw > 0;
  if (account?.type === 'Backtest') {
    const acctDefault = (account.slValue !== null && account.slValue !== undefined && Number(account.slValue) > 0)
      ? Number(account.slValue)
      : null;
    const effective = hasRaw ? raw : acctDefault;
    if (effective === null) return { points: null };
    const pts = account.slUnit === 'ticks' ? effective / TICKS_PER_POINT : effective;
    return { points: +pts.toFixed(4) };
  }
  if (hasRaw) return { points: raw };
  return { points: null };
}

function validateCommission(account, contracts) {
  const mode = account?.commissionMode || 'none';
  if (mode === 'none' || mode === 'flat') return 0;
  if (mode === 'per_contract') {
    const c = Number(contracts);
    if (!c || c <= 0) return null;
    return 1;
  }
  return 0;
}

function formatExcelDate(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  const parsed = new Date(value);
  if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
  return String(value);
}

function formatExcelTime(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  if (typeof value === 'number') {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  if (value instanceof Date) return value.toTimeString().slice(0, 5);
  const parsed = new Date(`2000-01-01T${value}`);
  if (!isNaN(parsed)) return parsed.toTimeString().slice(0, 5);
  return String(value);
}

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

const RESERVED_MAP = {
  'Date': 'date',
  'Entry Time': 'entryTime',
  'Exit Time': 'exitTime',
  'Direction': 'direction',
  'Symbol': 'symbol',
  'MAE': 'mae',
  'MFE': 'mfe',
  'P&L': 'pnl',
  'Notes': 'notes',
  'Contracts': 'contracts',
};

function classifyHeader(trimmed) {
  if (RESERVED_MAP[trimmed]) return { key: RESERVED_MAP[trimmed], reserved: true };
  if (/^sl$/i.test(trimmed) || /^stop\s*loss$/i.test(trimmed) || /^stop$/i.test(trimmed)) {
    return { key: 'sl', reserved: true };
  }
  return { key: trimmed, reserved: false };
}

function parseFile(workbook, account, existingTrades) {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  if (rows.length === 0) return { errors: ['The file is empty.'] };

  const originalHeaders = Object.keys(rows[0]);
  const headerMap = {};
  const customHeaderNames = [];
  let hasSLColumn = false;
  let hasContractsColumn = false;

  originalHeaders.forEach((h) => {
    const trimmed = h.trim();
    const cls = classifyHeader(trimmed);
    headerMap[trimmed] = cls.key;
    if (cls.reserved) {
      if (cls.key === 'sl') hasSLColumn = true;
      if (cls.key === 'contracts') hasContractsColumn = true;
    } else {
      customHeaderNames.push(trimmed);
    }
  });

  if (account.commissionMode === 'per_contract' && !hasContractsColumn) {
    return { errors: ['This account uses per-contract commission but your Excel has no Contracts column.'] };
  }

  const missingSLRows = [];
  const missingContractsRows = [];
  const tradesData = [];

  rows.forEach((row, idx) => {
    const excelRowNum = idx + 2;
    const trade = {};
    const rawCustomValues = {};

    Object.keys(row).forEach((origKey) => {
      const trimmed = origKey.trim();
      const mappedKey = headerMap[trimmed] || trimmed;
      let value = row[origKey];
      if (mappedKey === 'date') value = formatExcelDate(value);
      else if (mappedKey === 'entryTime' || mappedKey === 'exitTime') value = formatExcelTime(value);
      const cls = classifyHeader(trimmed);
      if (!cls.reserved) rawCustomValues[mappedKey] = value;
      trade[mappedKey] = value;
    });

    if (!trade.date || !trade.entryTime || !trade.exitTime) return;

    trade.mae = parseFloat(trade.mae) || 0;
    trade.mfe = parseFloat(trade.mfe) || 0;
    trade.pnl = (trade.pnl !== undefined && trade.pnl !== '') ? (parseFloat(trade.pnl) || 0) : 0;
    trade.notes = trade.notes ? String(trade.notes).trim() : '';

    const { points: slPoints } = resolveSLPoints(trade.sl, account);
    if (account.type === 'Backtest' && slPoints === null) missingSLRows.push(excelRowNum);
    trade.slPoints = slPoints;
    delete trade.sl;

    let contractsNum = null;
    if (trade.contracts !== undefined && trade.contracts !== '' && trade.contracts !== null) {
      const c = parseFloat(trade.contracts);
      if (!isNaN(c) && c > 0) contractsNum = c;
    }
    if (account.commissionMode === 'per_contract' && contractsNum === null) {
      missingContractsRows.push(excelRowNum);
    }
    trade.contracts = contractsNum;

    customHeaderNames.forEach((col) => {
      const raw = rawCustomValues[col];
      trade[col] = raw !== undefined && raw !== null ? String(raw) : '';
    });

    Object.keys(trade).forEach((k) => {
      if (trade[k] === undefined || trade[k] === null) delete trade[k];
    });

    tradesData.push(trade);
  });

  if (tradesData.length === 0) {
    return { errors: ['No valid trades found. Ensure columns: Date, Entry Time, Exit Time, Direction, MAE, MFE'] };
  }

  const errors = [];
  if (missingSLRows.length > 0) {
    const list = missingSLRows.slice(0, 10).join(', ');
    const extra = missingSLRows.length > 10 ? ` and ${missingSLRows.length - 10} more` : '';
    errors.push(`Rows ${list}${extra} have no SL value and the account has no default SL set.`);
  }
  if (missingContractsRows.length > 0) {
    const list = missingContractsRows.slice(0, 10).join(', ');
    const extra = missingContractsRows.length > 10 ? ` and ${missingContractsRows.length - 10} more` : '';
    errors.push(`Rows ${list}${extra} have no Contracts value. Every row must have a contract count.`);
  }

  const existingIds = new Set(existingTrades.map((t) => t.tradeId));
  const dupes = [];
  tradesData.forEach((t) => {
    const tid = generateTradeId(t);
    if (existingIds.has(tid)) dupes.push(tid);
  });
  if (dupes.length > 0) {
    errors.push(`${dupes.length} trade(s) already exist. First duplicate ID: ${dupes[0]}.`);
  }

  const storedConfigs = account.columnConfigs || {};
  const existingValuesByCol = {};
  customHeaderNames.forEach((col) => {
    existingValuesByCol[col] = existingTrades.map((t) => t[col]).filter(hasAnyValue).map(String);
  });

  const customColumns = customHeaderNames.map((col) => {
    const fileVals = tradesData.map((t) => t[col]).filter(hasAnyValue).map(String);
    const existingVals = existingValuesByCol[col] || [];
    const unionVals = [...fileVals, ...existingVals].filter(hasAnyValue);

    if (unionVals.length === 0) {
      return { name: col, type: 'text', locked: true, reason: 'No data — defaults to Text', uniqueCount: 0, sampleValues: [] };
    }

    const allNumeric = unionVals.every(isNumericValue);
    if (allNumeric) {
      return { name: col, type: 'number', locked: true, reason: 'All values numeric', uniqueCount: new Set(unionVals.map((v) => String(v).trim())).size, sampleValues: [] };
    }

    const uniqueSet = new Set(unionVals.map((v) => String(v).trim()));
    const uniqueCount = uniqueSet.size;

    if (uniqueCount > MAX_DROPDOWN_UNIQUES) {
      return { name: col, type: 'text', locked: true, reason: `${uniqueCount} unique values (over ${MAX_DROPDOWN_UNIQUES}) — Text required`, uniqueCount, sampleValues: [...uniqueSet].slice(0, 5) };
    }

    const stored = storedConfigs[col];
    const initial = (stored === 'text' || stored === 'dropdown') ? stored : 'dropdown';
    return { name: col, type: initial, locked: false, reason: `${uniqueCount} unique value${uniqueCount === 1 ? '' : 's'}`, uniqueCount, sampleValues: [...uniqueSet].slice(0, 5) };
  });

  return { trades: tradesData, customColumns, errors, hasSLColumn, hasContractsColumn, tradesCount: tradesData.length };
}

/* ------------------------------------------------------------------ */
/*  Scoped CSS — matches JournalMain / DashboardHeader                 */
/* ------------------------------------------------------------------ */
const UPL_CSS = `
  .upl-overlay {
    position: fixed;
    inset: 0;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
    animation: uplFade .18s ease;
  }

  .upl-modal {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --win: #22c55e;
    --loss: #ef4444;

    width: 100%;
    max-width: 620px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95), 0 0 0 1px var(--accent-soft);
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    overflow: hidden;
    animation: uplModalIn .28s cubic-bezier(.2,.8,.25,1);
  }

  /* ---------- Header ---------- */
  .upl-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
  }
  .upl-head::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: uplGrad 4s linear infinite;
  }
  .upl-title {
    font-size: 16px;
    font-weight: 700;
    margin: 0;
    letter-spacing: -.01em;
  }
  .upl-sub {
    margin: 4px 0 0;
    font-size: 11.5px;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .upl-close {
    background: none;
    border: none;
    color: var(--ink-2);
    font-size: 15px;
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    transition: all .2s;
  }
  .upl-close:hover { color: var(--accent); background: rgba(245,158,11,.08); }
  .upl-close:disabled { opacity: .4; cursor: not-allowed; }

  /* ---------- Body ---------- */
  .upl-body {
    padding: 20px 22px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .upl-body::-webkit-scrollbar { width: 8px; }
  .upl-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  /* ---------- Dropzone ---------- */
  .upl-drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 44px 20px;
    border: 1.5px dashed rgba(255,255,255,.14);
    border-radius: 14px;
    background: rgba(255,255,255,.018);
    cursor: pointer;
    transition: all .25s cubic-bezier(.2,.8,.25,1);
    position: relative;
    overflow: hidden;
  }
  .upl-drop:hover {
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.04);
    box-shadow: 0 0 30px -12px rgba(245,158,11,.5);
  }
  .upl-drop-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(245,158,11,.05));
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    box-shadow: 0 0 30px -10px rgba(245,158,11,.6);
    font-size: 22px;
    transition: transform .3s cubic-bezier(.2,.8,.25,1);
  }
  .upl-drop:hover .upl-drop-icon { transform: translateY(-2px) scale(1.05); }
  .upl-drop-title {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.01em;
    text-align: center;
  }
  .upl-drop-hint {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--ink-2);
    text-align: center;
    line-height: 1.7;
    letter-spacing: .01em;
  }
  .upl-drop-hint b { color: var(--accent); font-weight: 700; }
  .upl-drop-hint .req-list {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(255,255,255,.04);
    border: 1px solid var(--line-soft);
    color: var(--ink-1);
    margin: 1px 2px;
  }

  /* ---------- Parsing ---------- */
  .upl-parsing {
    padding: 48px 20px;
    text-align: center;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }
  .upl-spinner {
    width: 28px;
    height: 28px;
    border: 2.5px solid var(--line);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: uplSpin .8s linear infinite;
  }

  /* ---------- File summary card ---------- */
  .upl-summary {
    padding: 12px 14px;
    border-radius: 12px;
    background: rgba(255,255,255,.025);
    border: 1px solid var(--line-soft);
  }
  .upl-filename {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--ink-3);
    margin-bottom: 8px;
    word-break: break-all;
    letter-spacing: .02em;
  }
  .upl-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .upl-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 99px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .02em;
    border: 1px solid;
  }
  .upl-chip.ok {
    color: #4ade80;
    background: rgba(34,197,94,.08);
    border-color: rgba(34,197,94,.28);
  }
  .upl-chip.warn {
    color: #f87171;
    background: rgba(239,68,68,.08);
    border-color: rgba(239,68,68,.28);
  }
  .upl-chip svg { font-size: 10px; }

  /* ---------- Error block ---------- */
  .upl-error {
    padding: 12px 14px;
    border-radius: 12px;
    background: rgba(239,68,68,.06);
    border: 1px solid rgba(239,68,68,.25);
  }
  .upl-error-title {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    color: #f87171;
    letter-spacing: .14em;
    text-transform: uppercase;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .upl-error ul {
    margin: 0;
    padding-left: 18px;
    color: #fca5a5;
    font-size: 12px;
    line-height: 1.65;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }

  /* ---------- Section header ---------- */
  .upl-section-title {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .upl-section-count {
    color: var(--ink-3);
    font-weight: 600;
  }

  /* ---------- Custom column rows ---------- */
  .upl-col-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .upl-col-row {
    padding: 12px 14px;
    border: 1px solid var(--line-soft);
    border-radius: 12px;
    background: rgba(255,255,255,.02);
    transition: border-color .2s;
  }
  .upl-col-row:hover { border-color: rgba(255,255,255,.12); }
  .upl-col-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }
  .upl-col-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-1);
  }
  .upl-col-reason {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-2);
  }
  .upl-col-sample {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    margin-top: 5px;
    line-height: 1.5;
    word-break: break-word;
  }
  .upl-col-types {
    display: flex;
    gap: 16px;
    margin-top: 10px;
    align-items: center;
    font-size: 12px;
    color: #cbd5e1;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .upl-col-types label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: color .15s;
  }
  .upl-col-types label:hover { color: var(--accent); }
  .upl-col-types input[type="radio"] { accent-color: #F59E0B; }
  .upl-locked-pill {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(255,255,255,.05);
    border: 1px solid var(--line);
    color: var(--ink-2);
  }

  /* ---------- Ready block ---------- */
  .upl-ready {
    padding: 14px;
    border-radius: 12px;
    background: rgba(34,197,94,.06);
    border: 1px solid rgba(34,197,94,.22);
    color: #86efac;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    text-align: center;
    letter-spacing: .02em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  /* ---------- Footer ---------- */
  .upl-foot {
    padding: 14px 22px;
    border-top: 1px solid var(--line-soft);
    display: flex;
    gap: 10px;
    align-items: center;
    background: rgba(0,0,0,.15);
  }

  .upl-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 16px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .upl-btn:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .upl-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }

  .upl-btn-cancel {
    border-color: rgba(239,68,68,.28);
    background: rgba(239,68,68,.05);
    color: #f87171;
  }
  .upl-btn-cancel:hover {
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55);
    color: #fca5a5;
  }

  .upl-btn-primary {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 10px;
    border: none;
    overflow: hidden;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: .02em;
    cursor: pointer;
    box-shadow:
      0 10px 30px -8px rgba(245,158,11,.55),
      inset 0 1px 0 rgba(255,255,255,.4);
    transition: transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s;
  }
  .upl-btn-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,.3) 50%, transparent 68%);
    animation: uplShine 4.2s ease-in-out infinite;
  }
  .upl-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px rgba(245,158,11,.7), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .upl-btn-primary:active:not(:disabled) { transform: translateY(0) scale(.98); }
  .upl-btn-primary:disabled {
    background: linear-gradient(135deg, rgba(245,158,11,.32), rgba(253,230,138,.28));
    color: rgba(10,13,19,.55);
    box-shadow: none;
    cursor: not-allowed;
  }
  .upl-btn-primary:disabled::after { display: none; }

  @keyframes uplGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes uplShine {
    0%,100% { transform: translateX(-130%) skewX(-18deg); }
    55%     { transform: translateX(230%) skewX(-18deg); }
  }
  @keyframes uplSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes uplFade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes uplModalIn {
    from { opacity: 0; transform: translateY(-12px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .upl-head::before,
    .upl-btn-primary::after,
    .upl-spinner { animation: none !important; }
    .upl-btn, .upl-btn-primary, .upl-drop, .upl-drop-icon { transition: none !important; }
  }
`;

export default function UploadModal({ isOpen, onClose, account, existingTrades, onSuccess }) {
  const [parseResult, setParseResult] = useState(null);
  const [columnTypes, setColumnTypes] = useState({});
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const reset = useCallback(() => {
    setParseResult(null);
    setColumnTypes({});
    setFileName('');
    setIsParsing(false);
    setIsSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  useEffect(() => { if (!isOpen) reset(); }, [isOpen, reset]);
  if (!isOpen) return null;

  const handleClose = () => { if (isSaving) return; reset(); onClose(); };

  const handleFile = (file) => {
    if (!file) return;
    const isXlsx = /\.(xlsx|xls)$/i.test(file.name);
    if (!isXlsx) { setParseResult({ errors: ['Please select an .xlsx or .xls file.'] }); return; }
    setFileName(file.name);
    setIsParsing(true);
    setParseResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const result = parseFile(wb, account, existingTrades);
        setParseResult(result);
        const types = {};
        (result.customColumns || []).forEach((col) => { types[col.name] = col.type; });
        setColumnTypes(types);
      } catch (err) {
        setParseResult({ errors: ['Error parsing file: ' + err.message] });
      } finally { setIsParsing(false); }
    };
    reader.onerror = () => { setParseResult({ errors: ['Failed to read file.'] }); setIsParsing(false); };
    reader.readAsArrayBuffer(file);
  };

  const handleTypeChange = (colName, type) => setColumnTypes((prev) => ({ ...prev, [colName]: type }));

  const handleUpload = async () => {
    if (!parseResult || (parseResult.errors && parseResult.errors.length > 0)) return;
    setIsSaving(true);
    try {
      const newConfigs = { ...(account.columnConfigs || {}), ...columnTypes };
      await createTrades(account.id, parseResult.trades);
      await updateAccountColumnConfigs(account.id, newConfigs);
      if (onSuccess) onSuccess(parseResult.trades.length);
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      setParseResult((prev) => ({ ...prev, errors: [...(prev?.errors || []), 'Save failed: ' + err.message] }));
    } finally { setIsSaving(false); }
  };

  const errors = parseResult?.errors || [];
  const hasErrors = errors.length > 0;
  const canUpload = !!parseResult && !hasErrors && !isParsing && !isSaving;

  return (
    <Portal>
      <style>{UPL_CSS}</style>
      <div className="upl-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="upl-modal">

          {/* Header */}
          <div className="upl-head">
            <div>
              <h2 className="upl-title">Upload Trades</h2>
              <p className="upl-sub">Import trades from your Excel file</p>
            </div>
            <button className="upl-close" onClick={handleClose} disabled={isSaving} aria-label="Close">
              <FaTimes />
            </button>
          </div>

          {/* Body */}
          <div className="upl-body">

            {/* Dropzone */}
            {!parseResult && !isParsing && (
              <label htmlFor="upload-modal-file" className="upl-drop">
                <div className="upl-drop-icon">
                  <FaFileUpload />
                </div>
                <div className="upl-drop-title">
                  Drop an <b style={{ color: 'var(--accent)' }}>.xlsx</b> file here, or click to browse
                </div>
                <div className="upl-drop-hint">
                  Required:
                  <span className="req-list">Date</span>
                  <span className="req-list">Entry Time</span>
                  <span className="req-list">Exit Time</span>
                  <span className="req-list">Direction</span>
                  <span className="req-list">MAE</span>
                  <span className="req-list">MFE</span>
                  <br />
                  {account?.type === 'Backtest' && (
                    <>
                      <span className="req-list">SL</span>
                      {account?.slValue ? 'or use account default' : 'column required'}
                      <br />
                    </>
                  )}
                  {account?.commissionMode === 'per_contract' && (
                    <>
                      <span className="req-list">Contracts</span> column required
                    </>
                  )}
                </div>
                <input
                  id="upload-modal-file"
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  style={{ display: 'none' }}
                />
              </label>
            )}

            {/* Parsing */}
            {isParsing && (
              <div className="upl-parsing">
                <div className="upl-spinner" />
                <div>Parsing file…</div>
              </div>
            )}

            {/* Result */}
            {parseResult && !isParsing && (
              <>
                {/* File summary */}
                <div className="upl-summary">
                  <div className="upl-filename">{fileName}</div>
                  <div className="upl-chips">
                    <span className={`upl-chip ${hasErrors ? 'warn' : 'ok'}`}>
                      {hasErrors ? <FaExclamationTriangle /> : <FaCheckCircle />}
                      {parseResult.tradesCount ?? 0} trades detected
                    </span>
                    {parseResult.hasSLColumn && (
                      <span className="upl-chip ok">
                        <FaCheckCircle /> SL column found
                      </span>
                    )}
                    {parseResult.hasContractsColumn && (
                      <span className="upl-chip ok">
                        <FaCheckCircle /> Contracts column found
                      </span>
                    )}
                  </div>
                </div>

                {/* Errors */}
                {hasErrors && (
                  <div className="upl-error">
                    <div className="upl-error-title">
                      <FaExclamationTriangle /> Upload Blocked
                    </div>
                    <ul>
                      {errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}

                {/* Custom columns */}
                {!hasErrors && parseResult.customColumns?.length > 0 && (
                  <div>
                    <div className="upl-section-title">
                      Custom Columns
                      <span className="upl-section-count">
                        ({parseResult.customColumns.length})
                      </span>
                    </div>
                    <div className="upl-col-list">
                      {parseResult.customColumns.map((col) => (
                        <div key={col.name} className="upl-col-row">
                          <div className="upl-col-head">
                            <span className="upl-col-name">{col.name}</span>
                            <span className="upl-col-reason">{col.reason}</span>
                          </div>
                          {col.sampleValues?.length > 0 && (
                            <div className="upl-col-sample">
                              Sample: {col.sampleValues.join(', ')}
                            </div>
                          )}
                          <div className="upl-col-types">
                            {col.locked ? (
                              <span className="upl-locked-pill">
                                {col.type === 'number' ? 'Number' : col.type === 'dropdown' ? 'Dropdown' : 'Text'} (locked)
                              </span>
                            ) : (
                              <>
                                <label>
                                  <input
                                    type="radio"
                                    name={`col-type-${col.name}`}
                                    checked={columnTypes[col.name] === 'text'}
                                    onChange={() => handleTypeChange(col.name, 'text')}
                                  />
                                  Text
                                </label>
                                <label>
                                  <input
                                    type="radio"
                                    name={`col-type-${col.name}`}
                                    checked={columnTypes[col.name] === 'dropdown'}
                                    onChange={() => handleTypeChange(col.name, 'dropdown')}
                                  />
                                  Dropdown
                                </label>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No custom columns */}
                {!hasErrors && (!parseResult.customColumns || parseResult.customColumns.length === 0) && (
                  <div className="upl-ready">
                    <FaCheckCircle />
                    No custom columns to configure — ready to upload.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="upl-foot">
            {!parseResult && (
              <>
                <div style={{ flex: 1 }} />
                <button className="upl-btn upl-btn-cancel" onClick={handleClose}>
                  Cancel
                </button>
              </>
            )}
            {parseResult && (
              <>
                <button className="upl-btn" onClick={reset} disabled={isSaving}>
                  Choose different file
                </button>
                <div style={{ flex: 1 }} />
                <button className="upl-btn upl-btn-cancel" onClick={handleClose} disabled={isSaving}>
                  Cancel
                </button>
                <button
                  className="upl-btn-primary"
                  onClick={handleUpload}
                  disabled={!canUpload}
                >
                  {isSaving ? 'Uploading…' : `Upload ${parseResult.tradesCount || 0} Trades`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}