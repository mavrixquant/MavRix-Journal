// apps/web/src/shared/trade-logs/UploadModal.jsx
//
// Bulk-import from Excel. The required/expected column set depends on the
// account type:
//
//   Live / Demo : Date*, Entry Time*, Exit Time*, Direction*, Symbol*,
//                 Entry Price, Take Profit, Stop Loss, P&L*, Quantity*,
//                 Notes, [custom columns]
//
//   Backtest    : Date*, Entry Time*, Exit Time*, Direction*, Symbol*,
//                 MAE*, MFE*, SL* (or fall back to account default),
//                 P&L, Quantity*, Notes, [custom columns]
//
// (* = mandatory)
//
// CUSTOM COLUMN EDITOR
// --------------------
// After parsing, each detected custom column is presented as an editable
// draft. The user can:
//   - Rename the column (inline input, validated for collisions)
//   - Delete the column (removes its data from every trade in the batch)
//   - Choose type (Text / Dropdown / Number) — or accept an inferred lock
//   - When type is Dropdown: edit the option list (remove chips, add new)
//
// On upload, a single transform pass applies all renames, deletions, and
// dropdown-option filters to parseResult.trades, and the account's
// columnConfigs is persisted in the v2 shape:
//   { "Setup": { "type": "dropdown", "options": ["A", "B"] } }
//
// The v1→v2 upgrade path is handled by normalizeColumnConfigs() from
// @mavrix/shared (Phase 6).

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FaFileUpload,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEdit,
  FaTrash,
  FaPlus,
  FaCheck,
} from 'react-icons/fa';
import Portal from '@/shared/components/Portal';
import { createTrades, generateTradeId } from '@/shared/api/trades';
import { updateAccountColumnConfigs } from '@/shared/api/accounts';
import { queryClient } from '@/shared/api/queryClient';
import { normalizeColumnConfigs } from '@mavrix/shared';

const TICKS_PER_POINT = 4;
const MAX_DROPDOWN_UNIQUES = 10;

// Reserved names that can't be used as custom column names.
// Mirrors the API's RESERVED set in apps/api/src/services/trades.service.js.
const RESERVED_NAMES = new Set([
  'date', 'entryTime', 'exitTime', 'direction', 'symbol',
  'mae', 'mfe', 'slPoints',
  'entryPrice', 'takeProfit', 'stopLoss',
  'pnl', 'quantity', 'notes',
]);

/* ---------- Header → key maps, one per account type ---------- */

const RESERVED_MAP_BACKTEST = {
  'Date': 'date',
  'Entry Time': 'entryTime',
  'Exit Time': 'exitTime',
  'Direction': 'direction',
  'Symbol': 'symbol',
  'MAE': 'mae',
  'MFE': 'mfe',
  'SL': 'sl',
  'Stop Loss': 'sl',    // accept either
  'P&L': 'pnl',
  'Quantity': 'quantity',
  'Notes': 'notes',
};

const RESERVED_MAP_JOURNAL = {
  'Date': 'date',
  'Entry Time': 'entryTime',
  'Exit Time': 'exitTime',
  'Direction': 'direction',
  'Symbol': 'symbol',
  'Entry Price': 'entryPrice',
  'Take Profit': 'takeProfit',
  'Stop Loss': 'stopLoss',
  'P&L': 'pnl',
  'Quantity': 'quantity',
  'Notes': 'notes',
};

function getReservedMap(account) {
  return account?.type === 'Backtest' ? RESERVED_MAP_BACKTEST : RESERVED_MAP_JOURNAL;
}

/* ---------- SL conversion (Backtest only) ---------- */

function resolveSLPoints(rawSl, account) {
  const raw = (rawSl === '' || rawSl === undefined || rawSl === null) ? null : Number(rawSl);
  const hasRaw = raw !== null && !isNaN(raw) && raw > 0;

  const acctDefault = (account.slValue !== null && account.slValue !== undefined && Number(account.slValue) > 0)
    ? Number(account.slValue)
    : null;

  const effective = hasRaw ? raw : acctDefault;
  if (effective === null) return null;

  const pts = account.slUnit === 'ticks' ? effective / TICKS_PER_POINT : effective;
  return +pts.toFixed(4);
}

/* ---------- Excel cell formatters ---------- */

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

/* ---------- Parse ---------- */

function parseFile(workbook, account, existingTrades) {
  const isBacktest = account.type === 'Backtest';
  const RESERVED_MAP = getReservedMap(account);

  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  if (rows.length === 0) return { errors: ['The file is empty.'] };

  const originalHeaders = Object.keys(rows[0]);
  const headerMap = {};
  const customHeaderNames = [];
  let hasSLColumn = false;

  originalHeaders.forEach((h) => {
    const trimmed = h.trim();

    // Silently skip the template's "Custom Columns" placeholder header when
    // it has no values in any data row.
    if (trimmed === 'Custom Columns') {
      const hasAnyValueInFile = rows.some((r) => {
        const v = r[h];
        return v !== '' && v !== null && v !== undefined;
      });
      if (!hasAnyValueInFile) return;
    }

    const mapped = RESERVED_MAP[trimmed];

    if (mapped) {
      headerMap[trimmed] = mapped;
      if (mapped === 'sl') hasSLColumn = true;
    } else {
      headerMap[trimmed] = trimmed;
      customHeaderNames.push(trimmed);
    }
  });

  const missingSlRows = [];
  const invalidQuantityRows = [];
  const invalidMaeMfeRows = [];
  const invalidPnlRows = [];
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

      const mapped = RESERVED_MAP[trimmed];
      if (!mapped) rawCustomValues[mappedKey] = value;
      trade[mappedKey] = value;
    });

    // Skip completely blank rows
    if (!trade.date && !trade.entryTime && !trade.exitTime && !trade.direction) return;

    // ---- Common required fields ----
    if (!trade.date || !trade.entryTime || !trade.exitTime) return;

    // ---- Quantity (required in both modes) ----
    let quantityNum = null;
    if (trade.quantity !== undefined && trade.quantity !== '' && trade.quantity !== null) {
      const q = parseFloat(trade.quantity);
      if (!isNaN(q) && q > 0) quantityNum = q;
    }
    if (quantityNum === null) {
      invalidQuantityRows.push(excelRowNum);
    }
    trade.quantity = quantityNum;

    // ---- Mode-specific validation ----
    if (isBacktest) {
      const maeNum = parseFloat(trade.mae);
      const mfeNum = parseFloat(trade.mfe);
      const maeOk = !isNaN(maeNum) && maeNum >= 0;
      const mfeOk = !isNaN(mfeNum) && mfeNum >= 0;
      if (!maeOk || !mfeOk) invalidMaeMfeRows.push(excelRowNum);

      trade.mae = maeOk ? maeNum : null;
      trade.mfe = mfeOk ? mfeNum : null;
      trade.pnl = (trade.pnl !== undefined && trade.pnl !== '') ? (parseFloat(trade.pnl) || 0) : 0;

      const slPoints = resolveSLPoints(trade.sl, account);
      if (slPoints === null) missingSlRows.push(excelRowNum);
      trade.slPoints = slPoints;
      delete trade.sl;

      delete trade.entryPrice;
      delete trade.takeProfit;
      delete trade.stopLoss;
    } else {
      if (trade.pnl === undefined || trade.pnl === '' || isNaN(parseFloat(trade.pnl))) {
        invalidPnlRows.push(excelRowNum);
      }
      trade.pnl = (trade.pnl !== undefined && trade.pnl !== '') ? (parseFloat(trade.pnl) || 0) : 0;

      const ep = trade.entryPrice === '' || trade.entryPrice == null ? null : Number(trade.entryPrice);
      const tp = trade.takeProfit === '' || trade.takeProfit == null ? null : Number(trade.takeProfit);
      const sl = trade.stopLoss === '' || trade.stopLoss == null ? null : Number(trade.stopLoss);
      trade.entryPrice = Number.isFinite(ep) ? ep : null;
      trade.takeProfit = Number.isFinite(tp) ? tp : null;
      trade.stopLoss = Number.isFinite(sl) ? sl : null;

      delete trade.mae;
      delete trade.mfe;
      delete trade.slPoints;
    }

    trade.notes = trade.notes ? String(trade.notes).trim() : '';

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
    const requiredCommon = 'Date, Entry Time, Exit Time, Direction, Symbol, Quantity';
    const requiredMode = isBacktest ? ', MAE, MFE' : ', P&L';
    return { errors: [`No valid trades found. Ensure columns: ${requiredCommon}${requiredMode}`] };
  }

  const errors = [];

  if (isBacktest && missingSlRows.length > 0) {
    const list = missingSlRows.slice(0, 10).join(', ');
    const extra = missingSlRows.length > 10 ? ` and ${missingSlRows.length - 10} more` : '';
    errors.push(`Rows ${list}${extra} have no SL value and the account has no default SL set.`);
  }
  if (invalidQuantityRows.length > 0) {
    const list = invalidQuantityRows.slice(0, 10).join(', ');
    const extra = invalidQuantityRows.length > 10 ? ` and ${invalidQuantityRows.length - 10} more` : '';
    errors.push(`Rows ${list}${extra} have a missing or non-positive Quantity.`);
  }
  if (isBacktest && invalidMaeMfeRows.length > 0) {
    const list = invalidMaeMfeRows.slice(0, 10).join(', ');
    const extra = invalidMaeMfeRows.length > 10 ? ` and ${invalidMaeMfeRows.length - 10} more` : '';
    errors.push(`Rows ${list}${extra} have an invalid MAE or MFE value.`);
  }
  if (!isBacktest && invalidPnlRows.length > 0) {
    const list = invalidPnlRows.slice(0, 10).join(', ');
    const extra = invalidPnlRows.length > 10 ? ` and ${invalidPnlRows.length - 10} more` : '';
    errors.push(`Rows ${list}${extra} have a missing or invalid P&L value.`);
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
      return { name: col, type: 'text', locked: true, reason: 'No data — defaults to Text', uniqueCount: 0, sampleValues: [], options: [] };
    }

    const allNumeric = unionVals.every(isNumericValue);
    if (allNumeric) {
      return { name: col, type: 'number', locked: true, reason: 'All values numeric', uniqueCount: new Set(unionVals.map((v) => String(v).trim())).size, sampleValues: [], options: [] };
    }

    const uniqueSet = new Set(unionVals.map((v) => String(v).trim()));
    const uniqueCount = uniqueSet.size;

    if (uniqueCount > MAX_DROPDOWN_UNIQUES) {
      return { name: col, type: 'text', locked: true, reason: `${uniqueCount} unique values (over ${MAX_DROPDOWN_UNIQUES}) — Text required`, uniqueCount, sampleValues: [...uniqueSet].slice(0, 5), options: [] };
    }

    const stored = storedConfigs[col];
    // stored may be legacy string or v2 object — check both
    const storedType =
      typeof stored === 'string' ? stored :
      stored && typeof stored === 'object' ? stored.type :
      null;

    const initial = (storedType === 'text' || storedType === 'dropdown') ? storedType : 'dropdown';
    const sortedValues = [...uniqueSet].sort();

    return {
      name: col,
      type: initial,
      locked: false,
      reason: `${uniqueCount} unique value${uniqueCount === 1 ? '' : 's'}`,
      uniqueCount,
      sampleValues: sortedValues.slice(0, 5),
      options: sortedValues,
    };
  });

  return { trades: tradesData, customColumns, errors, hasSLColumn, tradesCount: tradesData.length };
}

/* ---------- Build drafts from parsed result ---------- */

function buildDrafts(customColumns) {
  return customColumns.map((col) => ({
    originalName: col.name,
    name: col.name,
    type: col.type,
    locked: col.locked,
    reason: col.reason,
    uniqueCount: col.uniqueCount,
    sampleValues: col.sampleValues || [],
    options: col.options || [],
  }));
}

/* ---------- Apply drafts to parsed trades (rename / delete / filter) ---------- */

function applyDraftsToTrades(trades, drafts, deletedOriginalNames) {
  const deletedSet = new Set(deletedOriginalNames);

  return trades.map((trade) => {
    const next = { ...trade };

    // Rename pass
    for (const d of drafts) {
      if (d.originalName !== d.name) {
        if (d.originalName in next) {
          next[d.name] = next[d.originalName];
          delete next[d.originalName];
        }
      }
    }

    // Dropdown option filter — if a trade's value isn't in the (possibly
    // edited) options list, blank it out so AddTradeModal's <select>
    // always shows a valid value.
    for (const d of drafts) {
      if (d.type === 'dropdown') {
        const v = next[d.name];
        if (hasAnyValue(v) && !d.options.includes(String(v).trim())) {
          next[d.name] = '';
        }
      }
    }

    // Deletion pass
    for (const origName of deletedSet) {
      delete next[origName];
    }

    return next;
  });
}

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                        */
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
    max-width: 720px;
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

  /* ---------- Custom column card ---------- */
  .upl-col-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .upl-col-row {
    padding: 12px 14px;
    border: 1px solid var(--line-soft);
    border-radius: 12px;
    background: rgba(255,255,255,.02);
    transition: border-color .2s;
  }
  .upl-col-row:hover { border-color: rgba(255,255,255,.12); }
  .upl-col-row.is-renaming {
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.04);
  }

  .upl-col-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .upl-col-name-wrap {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
    flex: 1;
    flex-wrap: wrap;
  }
  .upl-col-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-1);
    word-break: break-word;
  }
  .upl-col-reason {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-2);
  }
  .upl-col-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
  .upl-col-action {
    width: 26px;
    height: 26px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025);
    color: var(--ink-2);
    cursor: pointer;
    transition: all .18s cubic-bezier(.2,.8,.25,1);
  }
  .upl-col-action:hover {
    color: var(--accent);
    background: rgba(245,158,11,.10);
    border-color: var(--accent-soft2);
  }
  .upl-col-action.is-danger:hover {
    color: #f87171;
    background: rgba(239,68,68,.10);
    border-color: rgba(239,68,68,.42);
  }
  .upl-col-action.is-ok {
    color: #4ade80;
    background: rgba(34,197,94,.08);
    border-color: rgba(34,197,94,.35);
  }
  .upl-col-action.is-ok:hover {
    color: #86efac;
    background: rgba(34,197,94,.14);
    border-color: rgba(34,197,94,.55);
  }

  .upl-rename-input {
    flex: 1;
    min-width: 120px;
    padding: 6px 10px;
    background: rgba(10,13,19,.7);
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 8px;
    color: var(--ink-1);
    font-size: 13px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    outline: none;
  }
  .upl-rename-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .upl-rename-error {
    margin-top: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: #f87171;
    letter-spacing: .01em;
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
    flex-wrap: wrap;
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
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  /* ---------- Dropdown option chips editor ---------- */
  .upl-options {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--line-soft);
  }
  .upl-options-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-bottom: 8px;
    display: block;
  }
  .upl-options-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }
  .upl-opt-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 4px 4px 10px;
    border-radius: 99px;
    background: var(--accent-soft);
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .01em;
    max-width: 240px;
  }
  .upl-opt-chip-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .upl-opt-chip-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: none;
    background: rgba(245,158,11,.18);
    color: inherit;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: all .15s;
  }
  .upl-opt-chip-remove:hover {
    background: rgba(245,158,11,.38);
    color: #fff;
  }
  .upl-options-empty {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    padding: 6px 0 10px;
    font-style: italic;
  }
  .upl-options-add {
    display: flex;
    gap: 6px;
    align-items: stretch;
  }
  .upl-options-add input {
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
  .upl-options-add input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .upl-options-add button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 7px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .15s;
    white-space: nowrap;
  }
  .upl-options-add button:hover:not(:disabled) {
    color: var(--accent);
    background: rgba(245,158,11,.08);
    border-color: var(--accent-soft2);
  }
  .upl-options-add button:disabled {
    opacity: .35;
    cursor: not-allowed;
  }

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
    .upl-btn, .upl-btn-primary, .upl-drop, .upl-drop-icon,
    .upl-col-action, .upl-opt-chip-remove, .upl-options-add button {
      transition: none !important;
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Per-column card component                                          */
/* ------------------------------------------------------------------ */

function ColumnCard({
  draft,
  index,
  allDrafts,
  disabled,
  onRename,
  onDelete,
  onTypeChange,
  onOptionRemove,
  onOptionAdd,
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(draft.name);
  const [renameError, setRenameError] = useState('');
  const [newOption, setNewOption] = useState('');

  // Reset internal state if the underlying draft changes identity
  useEffect(() => {
    if (!renaming) setRenameDraft(draft.name);
  }, [draft.name, renaming]);

  const startRename = () => {
    setRenameDraft(draft.name);
    setRenameError('');
    setRenaming(true);
  };

  const cancelRename = () => {
    setRenameDraft(draft.name);
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
    if (RESERVED_NAMES.has(next)) {
      setRenameError(`"${next}" is a reserved column name.`);
      return;
    }
    // Collision check against other drafts (by their CURRENT names)
    const collision = allDrafts.some(
      (d, i) => i !== index && d.name === next
    );
    if (collision) {
      setRenameError(`"${next}" is already used by another column.`);
      return;
    }
    onRename(next);
    setRenameError('');
    setRenaming(false);
  };

  const handleAddOption = () => {
    const val = newOption.trim();
    if (!val) return;
    if (draft.options.includes(val)) {
      setNewOption('');
      return;
    }
    onOptionAdd(val);
    setNewOption('');
  };

  const isDropdown = draft.type === 'dropdown';
  const canEdit = !disabled;

  return (
    <div className={`upl-col-row ${renaming ? 'is-renaming' : ''}`}>
      {/* ---------- Header row: name + actions ---------- */}
      <div className="upl-col-head">
        {renaming ? (
          <>
            <input
              type="text"
              className="upl-rename-input"
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
            <div className="upl-col-actions">
              <button
                type="button"
                className="upl-col-action is-ok"
                onClick={commitRename}
                disabled={disabled}
                title="Save name"
                aria-label="Save name"
              >
                <FaCheck size={11} />
              </button>
              <button
                type="button"
                className="upl-col-action"
                onClick={cancelRename}
                disabled={disabled}
                title="Cancel"
                aria-label="Cancel rename"
              >
                <FaTimes size={11} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="upl-col-name-wrap">
              <span className="upl-col-name">{draft.name}</span>
              <span className="upl-col-reason">{draft.reason}</span>
            </div>
            <div className="upl-col-actions">
              <button
                type="button"
                className="upl-col-action"
                onClick={startRename}
                disabled={!canEdit}
                title="Rename column"
                aria-label="Rename column"
              >
                <FaEdit size={11} />
              </button>
              <button
                type="button"
                className="upl-col-action is-danger"
                onClick={onDelete}
                disabled={!canEdit}
                title="Remove this column from the import"
                aria-label="Delete column"
              >
                <FaTrash size={11} />
              </button>
            </div>
          </>
        )}
      </div>

      {renameError && <div className="upl-rename-error">{renameError}</div>}

      {/* ---------- Sample values ---------- */}
      {!renaming && draft.sampleValues?.length > 0 && (
        <div className="upl-col-sample">
          Sample: {draft.sampleValues.join(', ')}
        </div>
      )}

      {/* ---------- Type selector ---------- */}
      <div className="upl-col-types">
        {draft.locked ? (
          <span className="upl-locked-pill">
            🔒 {draft.type === 'number' ? 'Number' : draft.type === 'dropdown' ? 'Dropdown' : 'Text'} (locked)
          </span>
        ) : (
          <>
            <label>
              <input
                type="radio"
                name={`col-type-${index}`}
                checked={draft.type === 'text'}
                disabled={disabled}
                onChange={() => onTypeChange('text')}
              />
              Text
            </label>
            <label>
              <input
                type="radio"
                name={`col-type-${index}`}
                checked={draft.type === 'dropdown'}
                disabled={disabled}
                onChange={() => onTypeChange('dropdown')}
              />
              Dropdown
            </label>
          </>
        )}
      </div>

      {/* ---------- Dropdown options editor ---------- */}
      {isDropdown && (
        <div className="upl-options">
          <span className="upl-options-label">
            Dropdown options ({draft.options.length})
          </span>

          {draft.options.length > 0 ? (
            <div className="upl-options-chips">
              {draft.options.map((opt) => (
                <span key={opt} className="upl-opt-chip">
                  <span className="upl-opt-chip-text" title={opt}>{opt}</span>
                  <button
                    type="button"
                    className="upl-opt-chip-remove"
                    onClick={() => onOptionRemove(opt)}
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
            <div className="upl-options-empty">
              No options yet. Add at least one, or switch to Text.
            </div>
          )}

          <div className="upl-options-add">
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
              disabled={disabled || !newOption.trim() || draft.options.includes(newOption.trim())}
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
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function UploadModal({ isOpen, onClose, account, existingTrades, onSuccess }) {
  const [parseResult, setParseResult] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [deletedOriginalNames, setDeletedOriginalNames] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const isBacktest = account?.type === 'Backtest';

  const reset = useCallback(() => {
    setParseResult(null);
    setDrafts([]);
    setDeletedOriginalNames([]);
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
    setDrafts([]);
    setDeletedOriginalNames([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const result = parseFile(wb, account, existingTrades);
        setParseResult(result);
        setDrafts(buildDrafts(result.customColumns || []));
      } catch (err) {
        setParseResult({ errors: ['Error parsing file: ' + err.message] });
      } finally { setIsParsing(false); }
    };
    reader.onerror = () => { setParseResult({ errors: ['Failed to read file.'] }); setIsParsing(false); };
    reader.readAsArrayBuffer(file);
  };

  /* ---------- Draft mutations ---------- */

  const handleRename = (index, newName) => {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, name: newName } : d))
    );
  };

  const handleDelete = (index) => {
    setDrafts((prev) => {
      const target = prev[index];
      if (target) {
        setDeletedOriginalNames((names) =>
          names.includes(target.originalName) ? names : [...names, target.originalName]
        );
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleTypeChange = (index, type) => {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, type } : d))
    );
  };

  const handleOptionRemove = (index, option) => {
    setDrafts((prev) =>
      prev.map((d, i) =>
        i === index
          ? { ...d, options: d.options.filter((o) => o !== option) }
          : d
      )
    );
  };

  const handleOptionAdd = (index, option) => {
    setDrafts((prev) =>
      prev.map((d, i) =>
        i === index
          ? { ...d, options: [...d.options, option] }
          : d
      )
    );
  };

  /* ---------- Upload ---------- */

  const handleUpload = async () => {
    if (!parseResult || (parseResult.errors && parseResult.errors.length > 0)) return;

    // Safety: every unlocked dropdown must have at least one option.
    const emptyDropdowns = drafts.filter(
      (d) => d.type === 'dropdown' && d.options.length === 0 && !d.locked
    );
    if (emptyDropdowns.length > 0) {
      setParseResult((prev) => ({
        ...prev,
        errors: [
          ...(prev?.errors || []),
          `Dropdown column${emptyDropdowns.length > 1 ? 's' : ''} ` +
          emptyDropdowns.map((d) => `"${d.name}"`).join(', ') +
          ' need at least one option (or switch to Text).',
        ],
      }));
      return;
    }

    setIsSaving(true);
    try {
      // Build the transformed trades array
      const finalTrades = applyDraftsToTrades(
        parseResult.trades,
        drafts,
        deletedOriginalNames
      );

      // Build the v2 columnConfigs — start from normalized existing config,
      // then remove deleted columns and add/update surviving ones.
      const baseConfigs = normalizeColumnConfigs(account.columnConfigs || {});
      for (const origName of deletedOriginalNames) {
        delete baseConfigs[origName];
      }
      for (const d of drafts) {
        baseConfigs[d.name] =
          d.type === 'dropdown'
            ? { type: 'dropdown', options: [...d.options] }
            : { type: d.type };
      }

      await createTrades(account.id, finalTrades);
      queryClient.invalidateQueries({ queryKey: ['trades', account.id] });
      await updateAccountColumnConfigs(account.id, baseConfigs);

      if (onSuccess) onSuccess(finalTrades.length);
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
              <h2 className="upl-title">
                Upload {isBacktest ? 'Test Logs' : 'Trades'}
              </h2>
              <p className="upl-sub">
                Import records from your Excel file, then adjust the custom columns below
              </p>
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
                  <span className="req-list">Symbol</span>
                  <span className="req-list">Quantity</span>
                  {isBacktest && (
                    <>
                      <span className="req-list">MAE</span>
                      <span className="req-list">MFE</span>
                      <span className="req-list">SL</span>
                    </>
                  )}
                  {!isBacktest && (
                    <span className="req-list">P&amp;L</span>
                  )}
                  <br />
                  Optional:
                  {!isBacktest && (
                    <>
                      <span className="req-list">Entry Price</span>
                      <span className="req-list">Take Profit</span>
                      <span className="req-list">Stop Loss</span>
                    </>
                  )}
                  {isBacktest && (
                    <span className="req-list">P&amp;L</span>
                  )}
                  <span className="req-list">Notes</span>
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
                      {parseResult.tradesCount ?? 0} {isBacktest ? 'tests' : 'trades'} detected
                    </span>
                    {isBacktest && parseResult.hasSLColumn && (
                      <span className="upl-chip ok">
                        <FaCheckCircle /> SL column found
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
                {!hasErrors && drafts.length > 0 && (
                  <div>
                    <div className="upl-section-title">
                      Custom Columns
                      <span className="upl-section-count">({drafts.length})</span>
                    </div>
                    <div className="upl-col-list">
                      {drafts.map((draft, i) => (
                        <ColumnCard
                          key={draft.originalName}
                          draft={draft}
                          index={i}
                          allDrafts={drafts}
                          disabled={isSaving}
                          onRename={(name) => handleRename(i, name)}
                          onDelete={() => handleDelete(i)}
                          onTypeChange={(type) => handleTypeChange(i, type)}
                          onOptionRemove={(opt) => handleOptionRemove(i, opt)}
                          onOptionAdd={(opt) => handleOptionAdd(i, opt)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* No custom columns */}
                {!hasErrors && drafts.length === 0 && (
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
                  {isSaving ? 'Uploading…' : `Upload ${parseResult.tradesCount || 0} ${isBacktest ? 'Tests' : 'Trades'}`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}