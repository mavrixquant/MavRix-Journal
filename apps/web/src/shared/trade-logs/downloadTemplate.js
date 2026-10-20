
import * as XLSX from 'xlsx';

const SAMPLE_DATE  = '2025-01-15';
const SAMPLE_ENTRY = '09:35';
const SAMPLE_EXIT  = '10:15';

function buildBacktestHeaders() {
  return [
    'Date',
    'Entry Time',
    'Exit Time',
    'Direction',
    'Symbol',
    'Strategy',
    'MAE',
    'MFE',
    'SL',
    'P&L',
    'Quantity',
    'Notes',
  ];
}

function buildBacktestSampleRow(account) {
  return [
    SAMPLE_DATE,
    SAMPLE_ENTRY,
    SAMPLE_EXIT,
    'Long',
    'NQ',
    '',
    account?.slValue != null && account.slValue > 0 ? account.slValue : 8.2,
    15.4,
    account?.slValue ?? 12.5,
    125.5,
    2,
    'Breakout above VWAP',
  ];
}

function buildJournalHeaders() {
  return [
    'Date',
    'Entry Time',
    'Exit Time',
    'Direction',
    'Symbol',
    'Strategy',
    'Entry Price',
    'Take Profit',
    'Stop Loss',
    'P&L',
    'Quantity',
    'Notes',
  ];
}

function buildJournalSampleRow() {
  return [
    SAMPLE_DATE,
    SAMPLE_ENTRY,
    SAMPLE_EXIT,
    'Long',
    'NQ',
    '',
    20150.25,
    20200.0,
    20120.0,
    125.5,
    2,
    'Breakout above VWAP',
  ];
}

export function downloadTradeTemplate({ account }) {
  const isBacktest = account?.type === 'Backtest';

  const headers = isBacktest ? buildBacktestHeaders() : buildJournalHeaders();
  const sampleRow = isBacktest
    ? buildBacktestSampleRow(account)
    : buildJournalSampleRow();

  headers.push('Custom Columns');
  sampleRow.push('');

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
  const kind = isBacktest ? 'test' : 'trade';

  XLSX.writeFile(wb, `${kind}-template-${safeName}-${date}.xlsx`);
}