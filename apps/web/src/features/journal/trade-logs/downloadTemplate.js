// apps/web/src/features/journal/trade-logs/downloadTemplate.js
//
// Builds and downloads an .xlsx template pre-populated with:
//   - required core columns (Date, Entry Time, Exit Time, Direction, MAE, MFE)
//   - Symbol, P&L, Notes
//   - Contracts  → only when the account uses per-contract commission
//   - SL         → only for Backtest accounts
//   - every existing custom column on the account
//
// A single sample row is included so users know the expected format.

import * as XLSX from 'xlsx';

const SAMPLE_DATE = '2025-01-15';
const SAMPLE_ENTRY = '09:35';
const SAMPLE_EXIT  = '10:15';

export function downloadTradeTemplate({ account, dynamicKeys = [] }) {
  const isBacktest = account?.type === 'Backtest';
  const perContract = account?.commissionMode === 'per_contract';

  const headers = [
    'Date',
    'Entry Time',
    'Exit Time',
    'Direction',
    'Symbol',
    'MAE',
    'MFE',
    'P&L',
  ];

  if (perContract) headers.push('Contracts');
  if (isBacktest)  headers.push('SL');
  headers.push('Notes');

  // Append every existing custom column
  dynamicKeys.forEach((k) => headers.push(k));

  const sampleRow = [
    SAMPLE_DATE,
    SAMPLE_ENTRY,
    SAMPLE_EXIT,
    'Long',
    'NQ',
    8.2,
    15.4,
    125.5,
  ];
  if (perContract) sampleRow.push(2);
  if (isBacktest)  sampleRow.push(account?.slValue ?? 12.5);
  sampleRow.push('Breakout above VWAP');
  dynamicKeys.forEach(() => sampleRow.push(''));

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  ws['!cols'] = headers.map((h) => ({
    wch: Math.max(12, String(h).length + 4),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Trades');

  const date = new Date().toISOString().slice(0, 10);
  const safeName = (account?.name || 'account')
    .replace(/[^a-z0-9-_]+/gi, '_')
    .slice(0, 40);

  XLSX.writeFile(wb, `trade-template-${safeName}-${date}.xlsx`);
}