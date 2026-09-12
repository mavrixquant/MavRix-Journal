// src/components/journal/JournalMain.jsx
import { useState, useEffect, useMemo } from 'react';
import {
  FaEdit, FaTrash, FaDownload, FaPlus, FaColumns, FaFileUpload,
  FaSearch, FaTimes, FaSortAmountUp, FaSortAmountDown
} from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { useAuth } from '../../context/AuthContext';
import { subscribeToAccounts, updateAccountColumnConfigs } from '../../firebase/accountsService';
import {
  subscribeToTrades, createTrade, updateTrade, deleteTrade,
  generateTradeId, deleteCustomColumn, addCustomColumn
} from '../../firebase/tradesService';
import Portal from '../common/Portal';
import Alert from '../common/Alert';
import LoadingOverlay from '../common/LoadingOverlay';
import UploadModal from './UploadModal';
import * as XLSX from 'xlsx';

const DIRECTIONS = ['Long', 'Short'];
const MAX_DROPDOWN_UNIQUES = 10;

const DEFAULT_COLUMNS = [
  'tradeId', 'date', 'entryTime', 'exitTime', 'direction', 'symbol',
  'mae', 'mfe', 'pnl', 'netPnl', 'slPoints', 'contracts', 'commission', 'notes'
];

const BASE_COLUMNS = ['tradeId', 'date', 'entryTime', 'exitTime', 'direction', 'symbol', 'mae', 'mfe'];

const TEMPLATE_HEADERS = ['Date', 'Entry Time', 'Exit Time', 'Direction', 'Symbol', 'MAE', 'MFE', 'SL', 'Contracts', 'P&L', 'Notes'];
const SAMPLE_TRADE = {
  'Date': '2026-09-07', 'Entry Time': '09:30', 'Exit Time': '10:15',
  'Direction': 'Long', 'Symbol': 'NQ', 'MAE': 8.20, 'MFE': 15.40,
  'SL': 50, 'Contracts': 3, 'P&L': 12.34,
  'Notes': 'Breakout above resistance level'
};

const TICKS_PER_POINT = 4;

function resolveSLPoints(rawSl, account) {
  const raw = (rawSl === '' || rawSl === undefined || rawSl === null) ? null : Number(rawSl);
  const hasRaw = raw !== null && !isNaN(raw) && raw > 0;
  if (account?.type === 'Backtest') {
    const acctDefault = (account.slValue !== null && account.slValue !== undefined && Number(account.slValue) > 0)
      ? Number(account.slValue) : null;
    const effective = hasRaw ? raw : acctDefault;
    if (effective === null) return { points: null };
    const pts = account.slUnit === 'ticks' ? effective / TICKS_PER_POINT : effective;
    return { points: +pts.toFixed(4) };
  }
  if (hasRaw) return { points: raw };
  return { points: null };
}

function pointsToRawInput(slPoints, account) {
  if (slPoints === undefined || slPoints === null) return '';
  if (account?.type === 'Backtest' && account.slUnit === 'ticks') {
    return +(slPoints * TICKS_PER_POINT).toFixed(4);
  }
  return slPoints;
}

function computeCommission(account, contracts) {
  const mode = account?.commissionMode || 'none';
  if (mode === 'none') return 0;
  const value = Number(account?.commissionValue) || 0;
  if (value <= 0) return 0;
  if (mode === 'flat') return value;
  if (mode === 'per_contract') {
    const c = Number(contracts);
    if (!c || c <= 0) return 0;
    return +(value * c).toFixed(4);
  }
  return 0;
}

function isStrictNumeric(v) {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return true;
    return /^-?\d+(\.\d+)?$/.test(t);
  }
  return false;
}

function computeColumnMeta(colName, trades, accountConfigs) {
  const values = trades
    .map(t => t[colName])
    .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
    .map(String);

  if (values.length === 0) return { locked: false, autoType: 'text', reason: 'No data yet' };

  const allNumeric = values.every(isStrictNumeric);
  if (allNumeric) return { locked: true, autoType: 'number', reason: 'All values numeric' };

  const uniqueCount = new Set(values.map(v => v.trim())).size;
  if (uniqueCount > MAX_DROPDOWN_UNIQUES) {
    return { locked: true, autoType: 'text', reason: `${uniqueCount} unique values — Text required` };
  }
  return { locked: false, autoType: 'dropdown', reason: `${uniqueCount} unique value${uniqueCount === 1 ? '' : 's'}` };
}

const formatColumnHeader = (key) => {
  if (key === 'pnl') return 'P&L';
  if (key === 'netPnl') return 'Net P&L';
  if (key === 'slPoints') return 'SL';
  if (key === 'mae') return 'MAE';
  if (key === 'mfe') return 'MFE';
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
};

const formatTimeWithAMPM = (timeStr) => {
  if (!timeStr) return '—';
  if (/^\d{2}:\d{2}/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  }
  return timeStr;
};

function resolveColumnInputType(colName, accountConfigs, options) {
  const cfg = accountConfigs?.[colName];
  if (cfg === 'number' || cfg === 'dropdown' || cfg === 'text') return cfg;
  return (options?.length <= 10) ? 'dropdown' : 'text';
}

const darkDatePickerStyles = `
  .react-datepicker-wrapper { width: 100%; }
  .react-datepicker { background-color: #12161f !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; border-radius: 12px !important; font-family: inherit !important; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6) !important; overflow: hidden; }
  .react-datepicker__header { background-color: #0d1017 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important; padding-top: 10px !important; }
  .react-datepicker__current-month, .react-datepicker__day-name { color: #f8fafc !important; font-weight: 600 !important; }
  .react-datepicker__day { color: #cbd5e1 !important; border-radius: 6px !important; transition: all 0.15s ease !important; }
  .react-datepicker__day:hover { background-color: rgba(255, 176, 32, 0.2) !important; color: #ffb020 !important; }
  .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected { background-color: #ffb020 !important; color: #0a0d13 !important; font-weight: 700 !important; }
  .react-datepicker__day--outside-month { color: #475569 !important; }
  .react-datepicker__navigation-icon::before { border-color: #94a3b8 !important; }
  .custom-date-input { width: 100%; padding: 9px 12px; background: #0d1017; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #ffffff; font-size: 13px; outline: none; box-sizing: border-box; font-family: 'Inter', sans-serif; }
  .custom-date-input:focus { border-color: #ffb020; box-shadow: 0 0 0 3px rgba(245,158,11,.15); }
`;

const JRN_CSS = `
  .jrn-root {
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

    padding: 24px;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 1600px;
    margin: 0 auto;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }

  .jrn-card {
    position: relative;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow:
      0 20px 50px -30px rgba(0,0,0,.9),
      inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
  }

  .jrn-header {
    padding: 18px 22px 16px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }
  .jrn-header::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    border-radius: 18px 18px 0 0;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: jrnGrad 4s linear infinite;
    pointer-events: none;
  }

  .jrn-header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .jrn-acct-block {
    display: flex;
    flex-direction: column;
  }
  .jrn-acct-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
    font-weight: 700;
    margin-bottom: 6px;
  }
  .jrn-acct-select {
    padding: 9px 32px 9px 14px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: var(--ink-1);
    font-size: 13px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-weight: 600;
    cursor: pointer;
    outline: none;
    min-width: 180px;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='%23545E6E'><path d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/></svg>");
    background-repeat: no-repeat;
    background-position: right 12px center;
    transition: all .2s ease;
  }
  .jrn-acct-select:hover {
    border-color: rgba(255,255,255,.22);
    background-color: rgba(15,18,25,.85);
  }
  .jrn-acct-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }

  .jrn-divider {
    width: 1px;
    height: 40px;
    background: var(--line);
    margin: 0 4px;
  }

  .jrn-stats {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .jrn-stat {
    min-width: 130px;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(255,255,255,.025);
    border: 1px solid var(--line-soft);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .jrn-stat-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
    font-weight: 700;
    margin-bottom: 4px;
  }
  .jrn-stat-value {
    font-size: 16px;
    font-weight: 700;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    line-height: 1.1;
    color: var(--ink-1);
  }
  .jrn-stat-value.pos { color: var(--win); }
  .jrn-stat-value.neg { color: var(--loss); }

  .jrn-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .jrn-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 14px;
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
  .jrn-btn:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .jrn-btn:active { transform: translateY(0) scale(.98); }
  .jrn-btn svg { flex-shrink: 0; }

  .jrn-btn.is-upload {
    border-color: rgba(96,165,250,.35);
    background: rgba(96,165,250,.08);
    color: #93c5fd;
  }
  .jrn-btn.is-upload:hover {
    background: rgba(96,165,250,.14);
    border-color: rgba(96,165,250,.6);
    color: #bfdbfe;
    box-shadow: 0 0 20px -6px rgba(96,165,250,.5);
  }

  .jrn-btn-primary {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 16px;
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
    white-space: nowrap;
  }
  .jrn-btn-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,.3) 50%, transparent 68%);
    animation: jrnShine 4.2s ease-in-out infinite;
  }
  .jrn-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px rgba(245,158,11,.7), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .jrn-btn-primary:active:not(:disabled) { transform: translateY(0) scale(.98); }
  .jrn-btn-primary:disabled {
    opacity: .45;
    cursor: not-allowed;
    box-shadow: none;
  }
  .jrn-btn-primary:disabled::after { display: none; }

  .jrn-tablecard {
    display: flex;
    flex-direction: column;
  }
  .jrn-tablehead {
    padding: 14px 18px;
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .jrn-search-wrap {
    position: relative;
    width: 340px;
    max-width: 100%;
  }
  .jrn-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink-3);
    font-size: 12px;
    pointer-events: none;
  }
  .jrn-search {
    width: 100%;
    padding: 9px 34px 9px 34px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: var(--ink-1);
    font-size: 12.5px;
    outline: none;
    box-sizing: border-box;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    transition: all .2s ease;
  }
  .jrn-search::placeholder { color: var(--ink-3); }
  .jrn-search:hover { border-color: rgba(255,255,255,.2); }
  .jrn-search:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .jrn-search-clear {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--ink-3);
    cursor: pointer;
    font-size: 11px;
    padding: 3px;
    border-radius: 4px;
  }
  .jrn-search-clear:hover { color: var(--accent); }

  .jrn-count {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    color: var(--ink-2);
    letter-spacing: .02em;
  }
  .jrn-count b { color: var(--ink-1); font-weight: 700; }

  .jrn-table-scroll {
    width: 100%;
    overflow-x: auto;
    max-height: calc(100vh - 340px);
    overflow-y: auto;
  }
  .jrn-table-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
  .jrn-table-scroll::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }
  .jrn-table-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(245,158,11,.35);
  }

  table.jrn-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    min-width: 800px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }

  table.jrn-table thead th {
    background: rgba(255,255,255,.02);
    border-bottom: 1px solid var(--line);
    padding: 12px 16px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--ink-2);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 2;
    backdrop-filter: blur(10px);
    transition: color .15s;
  }
  table.jrn-table thead th:hover { color: var(--accent); }
  table.jrn-table thead th.is-sorted { color: var(--accent); }

  table.jrn-table thead th .th-inner {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  table.jrn-table tbody tr {
    border-bottom: 1px solid rgba(255,255,255,.03);
    transition: background .15s;
  }
  table.jrn-table tbody tr:hover {
    background: rgba(255,255,255,.025);
  }
  table.jrn-table tbody td {
    padding: 11px 16px;
    font-size: 12.5px;
    color: #cbd5e1;
    white-space: nowrap;
  }
  table.jrn-table tbody td.mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
  table.jrn-table tbody td.dim { color: var(--ink-2); }
  table.jrn-table tbody td.faint { color: var(--ink-3); }
  table.jrn-table tbody td.symbol { color: var(--ink-1); font-weight: 700; }
  table.jrn-table tbody td.pnl { font-weight: 600; }
  table.jrn-table tbody td.pnl.net { font-weight: 700; }
  table.jrn-table tbody td.pnl.pos { color: var(--win); }
  table.jrn-table tbody td.pnl.neg { color: var(--loss); }
  table.jrn-table tbody td.pnl.zero { color: var(--ink-2); }

  .jrn-dir-pill {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
  }
  .jrn-dir-pill.is-long {
    background: rgba(34,197,94,.12);
    color: #4ade80;
    border: 1px solid rgba(34,197,94,.28);
  }
  .jrn-dir-pill.is-short {
    background: rgba(239,68,68,.12);
    color: #f87171;
    border: 1px solid rgba(239,68,68,.28);
  }

  .jrn-row-actions {
    padding: 11px 16px;
    text-align: right;
    white-space: nowrap;
  }
  .jrn-icon-btn {
    background: none;
    border: none;
    color: var(--ink-2);
    cursor: pointer;
    padding: 6px 8px;
    border-radius: 6px;
    transition: all .15s;
    font-size: 12px;
  }
  .jrn-icon-btn:hover { color: var(--accent); background: rgba(245,158,11,.08); }
  .jrn-icon-btn.is-delete:hover { color: var(--loss); background: rgba(239,68,68,.08); }

  .jrn-empty {
    padding: 56px 20px;
    text-align: center;
    color: var(--ink-3);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }

  .jrn-overlay {
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

    position: fixed;
    inset: 0;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
    overflow-y: auto;
    animation: jrnFade .18s ease;
  }
  .jrn-modal {
    width: 100%;
    max-height: calc(100vh - 32px);
    margin: auto;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95), 0 0 0 1px var(--accent-soft);
    color: var(--ink-1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: jrnModalIn .28s cubic-bezier(.2,.8,.25,1);
  }
  .jrn-modal-head {
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    flex-shrink: 0;
  }
  .jrn-modal-head::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: jrnGrad 4s linear infinite;
  }
  .jrn-modal-title {
    font-size: 16px;
    font-weight: 700;
    margin: 0;
    letter-spacing: -.01em;
  }
  .jrn-modal-sub {
    margin: 4px 0 0;
    font-size: 11.5px;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .jrn-modal-close {
    background: none;
    border: none;
    color: var(--ink-2);
    font-size: 15px;
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    transition: all .2s;
  }
  .jrn-modal-close:hover {
    color: var(--accent);
    background: rgba(245,158,11,.08);
  }
  .jrn-modal-body {
    padding: 20px 22px;
    overflow-y: auto;
    flex: 1 1 0%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .jrn-modal-foot {
    padding: 14px 22px;
    border-top: 1px solid var(--line-soft);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: rgba(0,0,0,.15);
    flex-shrink: 0;
  }

  .jrn-label {
    display: block;
    margin-bottom: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .jrn-input {
    width: 100%;
    padding: 9px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: var(--ink-1);
    font-size: 13px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    outline: none;
    box-sizing: border-box;
    transition: all .2s;
  }
  .jrn-input::placeholder { color: var(--ink-3); }
  .jrn-input:hover { border-color: rgba(255,255,255,.2); }
  .jrn-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  select.jrn-input {
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='%23545E6E'><path d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/></svg>");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 32px;
  }

  .jrn-field-group {
    padding: 14px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
    border-radius: 12px;
  }
  .jrn-field-group-title {
    display: block;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 12px;
  }

  .jrn-grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }
  .jrn-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .jrn-col-row {
    padding: 12px 14px;
    border: 1px solid var(--line-soft);
    border-radius: 12px;
    background: rgba(255,255,255,.02);
  }
  .jrn-col-row-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .jrn-col-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-1);
  }
  .jrn-col-reason {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-2);
  }
  .jrn-col-types {
    display: flex;
    gap: 16px;
    margin-top: 10px;
    align-items: center;
    font-size: 12px;
    color: #cbd5e1;
  }
  .jrn-col-types label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
  .jrn-col-types input[type="radio"] { accent-color: #F59E0B; }
  .jrn-locked-pill {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(255,255,255,.05);
    border: 1px solid var(--line);
    color: var(--ink-2);
  }

  .jrn-unsaved {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--ink-3);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .jrn-unsaved.is-dirty { color: var(--accent); }

  @keyframes jrnGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes jrnShine {
    0%,100% { transform: translateX(-130%) skewX(-18deg); }
    55%     { transform: translateX(230%) skewX(-18deg); }
  }
  @keyframes jrnFade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes jrnModalIn {
    from { opacity: 0; transform: translateY(-12px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .jrn-header::before, .jrn-btn-primary::after, .jrn-modal-head::before { animation: none !important; }
    .jrn-btn, .jrn-btn-primary, .jrn-icon-btn { transition: none !important; }
  }
`;

export default function JournalMain() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    date: null, entryTime: '', exitTime: '', direction: 'Long',
    symbol: '', mae: '', mfe: '', sl: '', contracts: '', pnl: '', notes: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState(-1);

  const [successAlert, setSuccessAlert] = useState({ show: false, message: '' });
  const [errorAlert, setErrorAlert] = useState({ show: false, message: '' });
  const [deleteAlert, setDeleteAlert] = useState({ show: false, tradeId: null });

  // ---- Custom columns modal state (draft-based) ----
  const [customColumnsModalOpen, setCustomColumnsModalOpen] = useState(false);
  const [draftColumns, setDraftColumns] = useState([]);       // columns shown in modal (existing + new)
  const [originalColumns, setOriginalColumns] = useState([]); // snapshot at modal open
  const [originalConfigs, setOriginalConfigs] = useState({}); // snapshot of configs at modal open
  const [pendingConfigs, setPendingConfigs] = useState({});   // working copy of configs
  const [deleteColumnAlert, setDeleteColumnAlert] = useState({ show: false, columnName: '' });
  const [loadingCustomColumn, setLoadingCustomColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [customSelectValues, setCustomSelectValues] = useState({});
  const [customTextValues, setCustomTextValues] = useState({});

  const selectedAccount = useMemo(
    () => accounts.find(a => a.id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToAccounts(user.uid, (fetched) => {
      setAccounts(fetched);
      if (fetched.length > 0 && !selectedAccountId) setSelectedAccountId(fetched[0].id);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!selectedAccountId) return;
    const unsubscribe = subscribeToTrades(selectedAccountId, (fetched) => setTrades(fetched));
    return unsubscribe;
  }, [selectedAccountId]);

  const tradesWithComputed = useMemo(() => {
    return trades.map((t) => {
      const commission = computeCommission(selectedAccount, t.contracts);
      const grossPnl = Number(t.pnl) || 0;
      const netPnl = +(grossPnl - commission).toFixed(4);
      return { ...t, commission, netPnl };
    });
  }, [trades, selectedAccount]);

  const dynamicColumns = useMemo(() => {
    const keys = new Set();
    const isCustomKey = (key) =>
      !DEFAULT_COLUMNS.includes(key) &&
      key !== 'id' &&
      key !== 'accountId' &&
      key !== 'createdAt' &&
      key !== 'updatedAt';

    // 1) Column names present on any trade
    if (trades && trades.length > 0) {
      trades.forEach((trade) => {
        Object.keys(trade).forEach((key) => {
          if (isCustomKey(key)) keys.add(key);
        });
      });
    }

    // 2) Column names declared in the account config
    //    (so a newly-added column shows up even when there are no trades yet)
    const configs = selectedAccount?.columnConfigs || {};
    Object.keys(configs).forEach((key) => {
      if (isCustomKey(key)) keys.add(key);
    });

    return Array.from(keys).sort();
  }, [trades, selectedAccount]);

  const columnMeta = useMemo(() => {
    const meta = {};
    dynamicColumns.forEach(col => {
      meta[col] = computeColumnMeta(col, trades, selectedAccount?.columnConfigs);
    });
    return meta;
  }, [dynamicColumns, trades, selectedAccount]);

  const customColumnOptions = useMemo(() => {
    const options = {};
    dynamicColumns.forEach(col => {
      const values = new Set();
      trades.forEach(trade => {
        const val = trade[col];
        if (val !== undefined && val !== null && String(val).trim() !== '') values.add(String(val).trim());
      });
      options[col] = Array.from(values).sort();
    });
    return options;
  }, [dynamicColumns, trades]);

  const visibleColumns = useMemo(() => {
    const cols = [...BASE_COLUMNS];
    if (selectedAccount?.type === 'Backtest') cols.push('slPoints');
    if (selectedAccount?.commissionMode === 'per_contract') cols.push('contracts');
    cols.push('pnl', 'netPnl', 'notes');
    return [...cols, ...dynamicColumns];
  }, [selectedAccount, dynamicColumns]);

  const stats = useMemo(() => {
    let totalNet = 0;
    let winCount = 0;
    let lossCount = 0;
    tradesWithComputed.forEach((t) => {
      const netVal = Number(t.netPnl) || 0;
      totalNet += netVal;
      if (netVal > 0) winCount++;
      else if (netVal < 0) lossCount++;
    });
    const totalClosed = winCount + lossCount;
    const winRate = totalClosed > 0 ? ((winCount / totalClosed) * 100).toFixed(1) : '0.0';
    return { totalNet, winRate, totalTrades: tradesWithComputed.length };
  }, [tradesWithComputed]);

  const filteredAndSortedTrades = useMemo(() => {
    let result = [...tradesWithComputed];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(trade => {
        for (const col of DEFAULT_COLUMNS) {
          const val = trade[col];
          if (val !== undefined && val !== null && String(val).toLowerCase().includes(q)) return true;
        }
        for (const col of dynamicColumns) {
          const val = trade[col];
          if (val !== undefined && val !== null && String(val).toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }
    result.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === 'date') { va = new Date(va); vb = new Date(vb); }
      else if (['mae', 'mfe', 'pnl', 'netPnl', 'slPoints', 'contracts', 'commission'].includes(sortKey)) {
        va = Number(va) || 0; vb = Number(vb) || 0;
      } else if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
    return result;
  }, [tradesWithComputed, searchQuery, sortKey, sortDir, dynamicColumns]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(prev => -prev);
    else { setSortKey(key); setSortDir(1); }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ date: null, entryTime: '', exitTime: '', direction: 'Long', symbol: '', mae: '', mfe: '', sl: '', contracts: '', pnl: '', notes: '' });
    setCustomSelectValues({});
    setCustomTextValues({});
    setModalOpen(true);
  };

  const openEditModal = (trade) => {
    setEditingId(trade.id);
    setFormData({
      date: trade.date ? new Date(trade.date + 'T00:00:00') : null,
      entryTime: trade.entryTime || '',
      exitTime: trade.exitTime || '',
      direction: trade.direction || 'Long',
      symbol: trade.symbol || '',
      mae: trade.mae || '',
      mfe: trade.mfe || '',
      sl: pointsToRawInput(trade.slPoints, selectedAccount),
      contracts: trade.contracts !== undefined && trade.contracts !== null ? trade.contracts : '',
      pnl: trade.pnl !== undefined ? trade.pnl : '',
      notes: trade.notes || '',
    });
    const selects = {}, texts = {};
    dynamicColumns.forEach(col => {
      const val = trade[col] !== undefined && trade[col] !== null ? String(trade[col]) : '';
      const options = customColumnOptions[col] || [];
      const inputType = resolveColumnInputType(col, selectedAccount?.columnConfigs, options);
      if (inputType === 'dropdown') {
        if (val && options.includes(val)) selects[col] = val;
        else if (val) { selects[col] = '__other__'; texts[col] = val; }
        else selects[col] = '';
      } else texts[col] = val;
    });
    setCustomSelectValues(selects);
    setCustomTextValues(texts);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setCustomSelectValues({});
    setCustomTextValues({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomSelectChange = (columnName, value) => {
    setCustomSelectValues(prev => ({ ...prev, [columnName]: value }));
    if (value !== '__other__') {
      setCustomTextValues(prev => { const n = { ...prev }; delete n[columnName]; return n; });
    }
  };

  const handleCustomTextChange = (columnName, value) => {
    setCustomTextValues(prev => ({ ...prev, [columnName]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { date, entryTime, exitTime, direction, symbol, mae, mfe, sl, contracts, pnl, notes } = formData;
    if (!date || !entryTime || !exitTime) return;

    let formattedDate = date;
    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      formattedDate = `${year}-${month}-${day}`;
    }

    const { points: slPoints } = resolveSLPoints(sl, selectedAccount);
    if (selectedAccount?.type === 'Backtest' && slPoints === null) {
      setErrorAlert({ show: true, message: 'Please enter an SL value, or set a default SL on the account.' });
      return;
    }

    let contractsNum = null;
    if (contracts !== '' && contracts !== undefined && contracts !== null) {
      contractsNum = Number(contracts);
      if (isNaN(contractsNum) || contractsNum <= 0) contractsNum = null;
    }
    if (selectedAccount?.commissionMode === 'per_contract' && contractsNum === null) {
      setErrorAlert({ show: true, message: 'Contracts field is required (must be a number ≥ 1) for this account.' });
      return;
    }

    const tradeData = {
      date: formattedDate, entryTime, exitTime, direction,
      symbol: symbol || '',
      mae: Number(mae) || 0,
      mfe: Number(mfe) || 0,
      pnl: pnl !== '' ? Number(pnl) : 0,
      slPoints,
      contracts: contractsNum,
      notes: notes ? notes.trim() : '',
    };

    dynamicColumns.forEach(col => {
      const options = customColumnOptions[col] || [];
      const inputType = resolveColumnInputType(col, selectedAccount?.columnConfigs, options);
      if (inputType === 'dropdown') {
        const selected = customSelectValues[col];
        if (selected === '__other__') tradeData[col] = (customTextValues[col] || '').trim();
        else if (selected) tradeData[col] = selected;
        else tradeData[col] = '';
      } else if (inputType === 'number') {
        const raw = customTextValues[col];
        tradeData[col] = (raw !== undefined && raw !== '') ? Number(raw) : '';
      } else {
        tradeData[col] = (customTextValues[col] || '').trim();
      }
    });

    const duplicates = checkDuplicateTradeIds([tradeData], editingId ? editingId : null);
    if (duplicates.length > 0) {
      setErrorAlert({ show: true, message: `Trade ID already exists: ${duplicates[0]}. Please change date, times, or direction.` });
      return;
    }

    try {
      if (editingId) await updateTrade(editingId, tradeData);
      else await createTrade(selectedAccountId, tradeData);
      closeModal();
    } catch (err) {
      console.error(err);
      setErrorAlert({ show: true, message: 'Failed to save trade: ' + err.message });
    }
  };

  const handleDelete = (tradeId) => setDeleteAlert({ show: true, tradeId });

  const confirmDelete = async () => {
    const { tradeId } = deleteAlert;
    if (!tradeId) return;
    try {
      await deleteTrade(tradeId);
      setDeleteAlert({ show: false, tradeId: null });
    } catch (err) {
      console.error(err);
      setDeleteAlert({ show: false, tradeId: null });
      setErrorAlert({ show: true, message: 'Failed to delete trade: ' + err.message });
    }
  };

  const checkDuplicateTradeIds = (tradeArray, excludeId = null) => {
    const existingIds = new Set(trades.filter(t => t.id !== excludeId).map(t => t.tradeId));
    const duplicates = [];
    for (const trade of tradeArray) {
      const tid = generateTradeId(trade);
      if (existingIds.has(tid)) duplicates.push(tid);
    }
    return duplicates;
  };

  // ==========================================================
  //  Custom Columns modal — draft-only, Save commits everything
  // ==========================================================
  const openCustomColumnsModal = () => {
    // Build the working config: start from committed configs, then fill in
    // auto-detected types for any visible column that has no explicit config yet.
    const seeded = { ...(selectedAccount?.columnConfigs || {}) };
    dynamicColumns.forEach(col => {
      const meta = columnMeta[col] || { locked: false, autoType: 'text' };
      if (meta.locked) seeded[col] = meta.autoType;
      else if (!seeded[col]) seeded[col] = meta.autoType;
    });

    setPendingConfigs(seeded);
    setOriginalConfigs({ ...seeded });
    setOriginalColumns([...dynamicColumns]);
    setDraftColumns([...dynamicColumns]);
    setNewColumnName('');
    setCustomColumnsModalOpen(true);
  };

  const closeCustomColumnsModal = () => {
    setCustomColumnsModalOpen(false);
    setDraftColumns([]);
    setOriginalColumns([]);
    setOriginalConfigs({});
    setPendingConfigs({});
    setNewColumnName('');
  };

  const handlePendingTypeChange = (colName, type) => {
    setPendingConfigs(prev => ({ ...prev, [colName]: type }));
  };

  // Add is DRAFT-ONLY. No Firestore writes.
  const handleAddColumn = () => {
    const name = newColumnName.trim();
    if (!name) {
      setErrorAlert({ show: true, message: 'Column name cannot be empty.' });
      return;
    }
    if (DEFAULT_COLUMNS.includes(name) || draftColumns.includes(name)) {
      setErrorAlert({ show: true, message: 'Column name already exists or is reserved.' });
      return;
    }
    setDraftColumns(prev => [...prev, name]);
    setPendingConfigs(prev => ({ ...prev, [name]: 'text' }));
    setNewColumnName('');
  };

  // Delete is DRAFT-ONLY too. Firestore deletion happens on Save.
  const confirmDeleteColumn = () => {
    const { columnName } = deleteColumnAlert;
    if (!columnName) return;
    setDraftColumns(prev => prev.filter(c => c !== columnName));
    setPendingConfigs(prev => {
      const next = { ...prev };
      delete next[columnName];
      return next;
    });
    setDeleteColumnAlert({ show: false, columnName: '' });
  };

  const hasPendingChanges = useMemo(() => {
    if (!customColumnsModalOpen) return false;

    const added = draftColumns.filter(c => !originalColumns.includes(c));
    const removed = originalColumns.filter(c => !draftColumns.includes(c));
    if (added.length > 0 || removed.length > 0) return true;

    // Type changes on surviving columns
    for (const col of draftColumns) {
      const before = originalConfigs[col] ?? undefined;
      const after = pendingConfigs[col] ?? undefined;
      if (before !== after) return true;
    }
    return false;
  }, [
    customColumnsModalOpen,
    draftColumns,
    originalColumns,
    originalConfigs,
    pendingConfigs,
  ]);

  // Save commits EVERYTHING: new columns, deleted columns, and type changes.
  const handleSaveConfigs = async () => {
    if (!selectedAccountId) return;
    setLoadingCustomColumn(true);
    try {
      const added = draftColumns.filter(c => !originalColumns.includes(c));
      const removed = originalColumns.filter(c => !draftColumns.includes(c));

      // 1. Add new columns — writes '' on every existing trade.
      for (const name of added) {
        await addCustomColumn(selectedAccountId, name);
      }

      // 2. Remove deleted columns — strips the field from every trade.
      for (const name of removed) {
        await deleteCustomColumn(selectedAccountId, name);
      }

      // 3. Persist the final config map — ONLY the columns currently visible.
      const cleaned = {};
      draftColumns.forEach(col => {
        const meta = columnMeta[col] || { locked: false, autoType: 'text' };
        const val = pendingConfigs[col] ?? meta.autoType;
        if (val === 'text' || val === 'dropdown' || val === 'number') {
          cleaned[col] = val;
        }
      });
      await updateAccountColumnConfigs(selectedAccountId, cleaned);

      setSuccessAlert({ show: true, message: 'Column changes saved.' });
      closeCustomColumnsModal();
    } catch (err) {
      console.error(err);
      setErrorAlert({ show: true, message: 'Failed to save column changes: ' + err.message });
    } finally {
      setLoadingCustomColumn(false);
    }
  };

  const handleDownloadTemplate = () => {
    const data = [TEMPLATE_HEADERS, Object.values(SAMPLE_TRADE)];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Trades');
    XLSX.writeFile(wb, 'trade_template.xlsx');
  };

  const handleUploadSuccess = (count) => {
    setSuccessAlert({ show: true, message: `Successfully added ${count} trades.` });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <LoadingOverlay message="Loading journal..." />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <>
        <style>{JRN_CSS}</style>
        <style>{darkDatePickerStyles}</style>
        <div className="jrn-root">
          <div className="jrn-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--ink-1)', margin: '0 0 8px', fontSize: '18px' }}>No Accounts Found</h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
              Create an account in the Accounts section to start logging and tracking your trades.
            </p>
          </div>
        </div>
      </>
    );
  }

  const isBacktest = selectedAccount?.type === 'Backtest';
  const isPerContract = selectedAccount?.commissionMode === 'per_contract';

  return (
    <>
      <style>{JRN_CSS}</style>
      <style>{darkDatePickerStyles}</style>

      <div className="jrn-root">
        {/* Header card */}
        <div className="jrn-card jrn-header">
          <div className="jrn-header-left">
            <div className="jrn-acct-block">
              <span className="jrn-acct-label">Active Account</span>
              <select
                className="jrn-acct-select"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="jrn-divider" />

            <div className="jrn-stats">
              <div className="jrn-stat">
                <span className="jrn-stat-label">Net P&L</span>
                <span className={`jrn-stat-value ${stats.totalNet >= 0 ? 'pos' : 'neg'}`}>
                  {stats.totalNet >= 0
                    ? `+$${stats.totalNet.toFixed(2)}`
                    : `-$${Math.abs(stats.totalNet).toFixed(2)}`}
                </span>
              </div>
              <div className="jrn-stat">
                <span className="jrn-stat-label">Win Rate</span>
                <span className="jrn-stat-value">{stats.winRate}%</span>
              </div>
              <div className="jrn-stat">
                <span className="jrn-stat-label">Trades</span>
                <span className="jrn-stat-value">{stats.totalTrades}</span>
              </div>
            </div>
          </div>

          <div className="jrn-actions">
            <button type="button" className="jrn-btn" onClick={openCustomColumnsModal}>
              <FaColumns size={12} /> Columns
            </button>
            <button type="button" className="jrn-btn" onClick={handleDownloadTemplate}>
              <FaDownload size={12} /> Template
            </button>
            <button type="button" className="jrn-btn is-upload" onClick={() => setUploadModalOpen(true)}>
              <FaFileUpload size={12} /> Upload
            </button>
            <button type="button" className="jrn-btn-primary" onClick={openCreateModal}>
              <FaPlus size={11} /> Add Trade
            </button>
          </div>
        </div>

        {/* Table card */}
        <div className="jrn-card jrn-tablecard">
          <div className="jrn-tablehead">
            <div className="jrn-search-wrap">
              <FaSearch className="jrn-search-icon" />
              <input
                className="jrn-search"
                placeholder="Search symbol, notes, columns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="jrn-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                  <FaTimes />
                </button>
              )}
            </div>
            <div className="jrn-count">
              Showing <b>{filteredAndSortedTrades.length}</b> of {trades.length} trades
            </div>
          </div>

          <div className="jrn-table-scroll">
            <table className="jrn-table">
              <thead>
                <tr>
                  {visibleColumns.map((col) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className={sortKey === col ? 'is-sorted' : ''}
                      style={{ textAlign: col === 'direction' ? 'center' : 'left' }}
                    >
                      <span className="th-inner">
                        {formatColumnHeader(col)}
                        {sortKey === col
                          ? (sortDir === 1 ? <FaSortAmountUp /> : <FaSortAmountDown />)
                          : null}
                      </span>
                    </th>
                  ))}
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTrades.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1}>
                      <div className="jrn-empty">No trades matching your criteria.</div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedTrades.map((trade) => (
                    <tr key={trade.id}>
                      {visibleColumns.map((col) => {
                        const value = trade[col];

                        if (col === 'direction') {
                          const isLong = value === 'Long';
                          return (
                            <td key={col} style={{ textAlign: 'center' }}>
                              <span className={`jrn-dir-pill ${isLong ? 'is-long' : 'is-short'}`}>
                                {value ? value.toUpperCase() : '—'}
                              </span>
                            </td>
                          );
                        }

                        if (col === 'pnl' || col === 'netPnl') {
                          const pnlVal = value !== undefined && value !== '' && value !== null ? Number(value) : null;
                          const emphasize = col === 'netPnl';
                          let cls = 'mono pnl';
                          if (emphasize) cls += ' net';
                          if (pnlVal === null || isNaN(pnlVal)) cls += ' zero';
                          else if (pnlVal > 0) cls += ' pos';
                          else if (pnlVal < 0) cls += ' neg';
                          else cls += ' zero';
                          return (
                            <td key={col} className={cls}>
                              {pnlVal !== null && !isNaN(pnlVal)
                                ? `${pnlVal >= 0 ? '+' : ''}${pnlVal.toFixed(2)}`
                                : '—'}
                            </td>
                          );
                        }

                        if (col === 'mae' || col === 'mfe' || col === 'slPoints' || col === 'commission') {
                          return (
                            <td key={col} className="mono dim">
                              {value !== undefined && value !== '' && value !== null
                                ? Number(value).toFixed(2)
                                : '—'}
                            </td>
                          );
                        }

                        if (col === 'contracts') {
                          return (
                            <td key={col} className="mono dim">
                              {value !== undefined && value !== null ? value : '—'}
                            </td>
                          );
                        }

                        if (col === 'symbol') {
                          return <td key={col} className="symbol">{value || '—'}</td>;
                        }

                        if (col === 'entryTime' || col === 'exitTime') {
                          return <td key={col} className="mono dim">{formatTimeWithAMPM(value)}</td>;
                        }

                        if (col === 'tradeId') {
                          return <td key={col} className="mono faint">{value || '—'}</td>;
                        }

                        return <td key={col}>{value !== undefined && value !== null ? String(value) : '—'}</td>;
                      })}
                      <td className="jrn-row-actions">
                        <button className="jrn-icon-btn" onClick={() => openEditModal(trade)} title="Edit Trade">
                          <FaEdit />
                        </button>
                        <button className="jrn-icon-btn is-delete" onClick={() => handleDelete(trade.id)} title="Delete Trade">
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trade Entry Modal */}
        {modalOpen && (
          <Portal>
            <div
              className="jrn-overlay"
              onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
            >
              <div className="jrn-modal" style={{ maxWidth: '560px', maxHeight: '90vh' }}>
                <div className="jrn-modal-head">
                  <div>
                    <h2 className="jrn-modal-title">
                      {editingId ? 'Edit Trade Execution' : 'Log New Trade'}
                    </h2>
                    <p className="jrn-modal-sub">
                      {editingId ? 'Modify recorded position details' : 'Enter trade performance and metadata'}
                    </p>
                  </div>
                  <button className="jrn-modal-close" onClick={closeModal} aria-label="Close">
                    <FaTimes />
                  </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <div className="jrn-modal-body">
                    <div className="jrn-grid-3">
                      <div>
                        <label className="jrn-label">Date</label>
                        <DatePicker
                          selected={formData.date}
                          onChange={(d) => setFormData(prev => ({ ...prev, date: d }))}
                          dateFormat="yyyy-MM-dd"
                          placeholderText="Select Date"
                          className="custom-date-input"
                        />
                      </div>
                      <div>
                        <label className="jrn-label">Entry Time</label>
                        <input
                          type="time"
                          value={formData.entryTime}
                          onChange={(e) => setFormData(prev => ({ ...prev, entryTime: e.target.value }))}
                          className="jrn-input"
                        />
                      </div>
                      <div>
                        <label className="jrn-label">Exit Time</label>
                        <input
                          type="time"
                          value={formData.exitTime}
                          onChange={(e) => setFormData(prev => ({ ...prev, exitTime: e.target.value }))}
                          className="jrn-input"
                        />
                      </div>
                    </div>

                    <div className="jrn-grid-2">
                      <div>
                        <label className="jrn-label">Direction</label>
                        <select
                          name="direction"
                          value={formData.direction}
                          onChange={handleChange}
                          className="jrn-input"
                        >
                          {DIRECTIONS.map((dir) => (
                            <option key={dir} value={dir}>{dir}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="jrn-label">Symbol</label>
                        <input
                          type="text"
                          name="symbol"
                          value={formData.symbol}
                          onChange={handleChange}
                          placeholder="e.g., NQ, ES, AAPL"
                          className="jrn-input"
                        />
                      </div>
                    </div>

                    <div className="jrn-field-group">
                      <span className="jrn-field-group-title">Execution Metrics</span>
                      <div className="jrn-grid-3">
                        <div>
                          <label className="jrn-label">P&L ($)</label>
                          <input
                            type="number"
                            name="pnl"
                            value={formData.pnl}
                            onChange={handleChange}
                            step="0.01"
                            placeholder="0.00"
                            className="jrn-input"
                          />
                        </div>
                        <div>
                          <label className="jrn-label">MAE</label>
                          <input
                            type="number"
                            name="mae"
                            value={formData.mae}
                            onChange={handleChange}
                            step="0.01"
                            placeholder="0.00"
                            className="jrn-input"
                          />
                        </div>
                        <div>
                          <label className="jrn-label">MFE</label>
                          <input
                            type="number"
                            name="mfe"
                            value={formData.mfe}
                            onChange={handleChange}
                            step="0.01"
                            placeholder="0.00"
                            className="jrn-input"
                          />
                        </div>
                      </div>
                    </div>

                    {(isBacktest || isPerContract) && (
                      <div className="jrn-field-group">
                        <span className="jrn-field-group-title">Risk Details</span>
                        <div className={(isBacktest && isPerContract) ? 'jrn-grid-2' : ''}>
                          {isBacktest && (
                            <div>
                              <label className="jrn-label">
                                SL ({selectedAccount?.slUnit === 'ticks' ? 'Ticks' : 'Points'})
                                <span style={{ color: 'var(--ink-3)', fontWeight: 400, marginLeft: '4px', textTransform: 'none', letterSpacing: 0 }}>
                                  — blank = account default
                                </span>
                              </label>
                              <input
                                type="number"
                                name="sl"
                                value={formData.sl}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                placeholder={selectedAccount?.slValue ? `Default: ${selectedAccount.slValue}` : '0.00'}
                                className="jrn-input"
                              />
                            </div>
                          )}
                          {isPerContract && (
                            <div>
                              <label className="jrn-label">
                                Contracts <span style={{ color: 'var(--loss)' }}>*</span>
                              </label>
                              <input
                                type="number"
                                name="contracts"
                                value={formData.contracts}
                                onChange={handleChange}
                                step="1"
                                min="1"
                                placeholder="1"
                                className="jrn-input"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="jrn-label">Notes</label>
                      <input
                        type="text"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="Enter trade notes, execution comments..."
                        className="jrn-input"
                      />
                    </div>

                    {dynamicColumns.length > 0 && (
                      <div className="jrn-field-group">
                        <span className="jrn-field-group-title" style={{ color: 'var(--ink-2)' }}>Custom Attributes</span>
                        <div className={dynamicColumns.length > 1 ? 'jrn-grid-2' : ''}>
                          {dynamicColumns.map(col => {
                            const options = customColumnOptions[col] || [];
                            const inputType = resolveColumnInputType(col, selectedAccount?.columnConfigs, options);
                            return (
                              <div key={col}>
                                <label className="jrn-label">{formatColumnHeader(col)}</label>
                                {inputType === 'dropdown' ? (
                                  <>
                                    <select
                                      value={customSelectValues[col] || ''}
                                      onChange={(e) => handleCustomSelectChange(col, e.target.value)}
                                      className="jrn-input"
                                    >
                                      <option value="">Select...</option>
                                      {options.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                                      <option value="__other__">Other…</option>
                                    </select>
                                    {customSelectValues[col] === '__other__' && (
                                      <input
                                        type="text"
                                        value={customTextValues[col] || ''}
                                        onChange={(e) => handleCustomTextChange(col, e.target.value)}
                                        placeholder={`Enter ${formatColumnHeader(col)}`}
                                        className="jrn-input"
                                        style={{ marginTop: '6px' }}
                                      />
                                    )}
                                  </>
                                ) : inputType === 'number' ? (
                                  <input
                                    type="number"
                                    value={customTextValues[col] || ''}
                                    onChange={(e) => handleCustomTextChange(col, e.target.value)}
                                    placeholder={`Enter ${formatColumnHeader(col)}`}
                                    className="jrn-input"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={customTextValues[col] || ''}
                                    onChange={(e) => handleCustomTextChange(col, e.target.value)}
                                    placeholder={`Enter ${formatColumnHeader(col)}`}
                                    className="jrn-input"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="jrn-modal-foot">
                    <button type="button" className="jrn-btn" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="jrn-btn-primary">
                      {editingId ? 'Update Trade' : 'Add Trade'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Portal>
        )}

        {/* Column Management Modal */}
        {customColumnsModalOpen && (
          <Portal>
            <div
              className="jrn-overlay"
              onClick={(e) => { if (e.target === e.currentTarget) closeCustomColumnsModal(); }}
            >
              <div className="jrn-modal" style={{ maxWidth: '560px', maxHeight: '90vh' }}>
                <div className="jrn-modal-head">
                  <div>
                    <h2 className="jrn-modal-title">Manage Custom Columns</h2>
                    <p className="jrn-modal-sub">Add columns and set input types</p>
                  </div>
                  <button className="jrn-modal-close" onClick={closeCustomColumnsModal} aria-label="Close">
                    <FaTimes />
                  </button>
                </div>

                <div className="jrn-modal-body">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddColumn(); } }}
                      placeholder="New column name..."
                      className="jrn-input"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="jrn-btn-primary"
                      onClick={handleAddColumn}
                      disabled={!newColumnName.trim()}
                      style={{ cursor: newColumnName.trim() ? 'pointer' : 'not-allowed' }}
                    >
                      Add
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {draftColumns.length === 0 && (
                      <p style={{ fontSize: '12px', color: 'var(--ink-3)', margin: 0, textAlign: 'center', padding: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>
                        No custom columns yet. Add one above.
                      </p>
                    )}
                    {draftColumns.map(col => {
                      const meta = columnMeta[col] || { locked: false, autoType: 'text', reason: 'No data yet' };
                      const currentType = pendingConfigs[col] ?? meta.autoType;
                      const isNew = !originalColumns.includes(col);
                      return (
                        <div key={col} className="jrn-col-row">
                          <div className="jrn-col-row-head">
                            <span className="jrn-col-name">
                              {formatColumnHeader(col)}
                              {isNew && (
                                <span style={{
                                  marginLeft: 8,
                                  fontSize: 9.5,
                                  fontFamily: 'IBM Plex Mono, monospace',
                                  color: 'var(--accent)',
                                  border: '1px solid var(--accent-soft2)',
                                  borderRadius: 4,
                                  padding: '1px 5px',
                                  letterSpacing: '.08em',
                                }}>NEW</span>
                              )}
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span className="jrn-col-reason">{meta.reason}</span>
                              <button
                                className="jrn-icon-btn is-delete"
                                onClick={() => setDeleteColumnAlert({ show: true, columnName: col })}
                                title="Remove column"
                              >
                                <FaTrash size={12} />
                              </button>
                            </div>
                          </div>

                          <div className="jrn-col-types">
                            {meta.locked ? (
                              <span className="jrn-locked-pill">
                                {meta.autoType === 'number' ? 'Number' : 'Text'} (locked)
                              </span>
                            ) : (
                              <>
                                <label>
                                  <input
                                    type="radio"
                                    name={`manage-col-${col}`}
                                    checked={currentType === 'text'}
                                    onChange={() => handlePendingTypeChange(col, 'text')}
                                  />
                                  Text
                                </label>
                                <label>
                                  <input
                                    type="radio"
                                    name={`manage-col-${col}`}
                                    checked={currentType === 'dropdown'}
                                    onChange={() => handlePendingTypeChange(col, 'dropdown')}
                                  />
                                  Dropdown
                                </label>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="jrn-modal-foot" style={{ justifyContent: 'space-between' }}>
                  <span className={`jrn-unsaved ${hasPendingChanges ? 'is-dirty' : ''}`}>
                    {hasPendingChanges ? '● Unsaved changes' : 'No pending changes'}
                  </span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="jrn-btn" onClick={closeCustomColumnsModal}>Cancel</button>
                    <button
                      className="jrn-btn-primary"
                      onClick={handleSaveConfigs}
                      disabled={!hasPendingChanges || loadingCustomColumn}
                    >
                      {loadingCustomColumn ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

        <UploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          account={selectedAccount}
          existingTrades={trades}
          onSuccess={handleUploadSuccess}
        />

        {loadingCustomColumn && <LoadingOverlay message="Updating columns..." />}
        <Alert isOpen={successAlert.show} title="Success" message={successAlert.message} type="success" confirmText="OK" onConfirm={() => setSuccessAlert({ show: false, message: '' })} showCancel={false} />
        <Alert isOpen={errorAlert.show} title="Error" message={errorAlert.message} type="error" confirmText="OK" onConfirm={() => setErrorAlert({ show: false, message: '' })} showCancel={false} />
        <Alert isOpen={deleteAlert.show} title="Delete Trade" message="Are you sure you want to delete this trade?" type="confirm" confirmText="Delete" cancelText="Cancel" onConfirm={confirmDelete} onCancel={() => setDeleteAlert({ show: false, tradeId: null })} showCancel={true} />
        <Alert
          isOpen={deleteColumnAlert.show}
          title="Remove Column"
          message={`Remove the column "${deleteColumnAlert.columnName}"? It will be deleted from all trades when you click Save Changes.`}
          type="confirm"
          confirmText="Remove"
          cancelText="Cancel"
          onConfirm={confirmDeleteColumn}
          onCancel={() => setDeleteColumnAlert({ show: false, columnName: '' })}
          showCancel={true}
        />
      </div>
    </>
  );
}