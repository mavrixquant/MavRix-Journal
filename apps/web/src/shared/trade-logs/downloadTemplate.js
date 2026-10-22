import * as XLSX from 'xlsx';

const SAMPLE_DATE  = '2025-01-15';
const SAMPLE_ENTRY = '09:35';
const SAMPLE_EXIT  = '10:15';

function backtestHeaders() {
  return [
    'Date', 'Entry Time', 'Exit Time', 'Direction', 'Symbol', 'Strategy',
    'SL (points)', 'MAE', 'MFE',
    'Quantity', 'P&L (optional)', 'Commission (optional)', 'Notes',
    'Custom Columns',
  ];
}
function backtestSample() {
  return [
    SAMPLE_DATE, SAMPLE_ENTRY, SAMPLE_EXIT, 'Long', 'NQ', '',
    12.5, 8.2, 15.4,
    2, 125.5, 2.5, 'Breakout above VWAP',
    '',
  ];
}

function journalHeaders() {
  return [
    'Date', 'Entry Time', 'Exit Time', 'Direction', 'Symbol', 'Strategy',
    'Entry Price', 'Stop Loss', 'Take Profit', 'Exit Price',
    'Quantity', 'P&L', 'Commission (optional)', 'Notes',
    'Custom Columns',
  ];
}
function journalSample() {
  return [
    SAMPLE_DATE, SAMPLE_ENTRY, SAMPLE_EXIT, 'Long', 'NQ', '',
    20150.25, 20120.0, 20200.0, 20200.0,
    2, 125.5, 2.5, 'Breakout above VWAP',
    '',
  ];
}

export function downloadTradeTemplate({ account }) {
  const isBacktest = account?.type === 'Backtest';
  const headers = isBacktest ? backtestHeaders() : journalHeaders();
  const sample  = isBacktest ? backtestSample()  : journalSample();

  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(12, String(h).length + 4) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Trades');

  const date = new Date().toISOString().slice(0, 10);
  const safeName = (account?.name || 'account')
    .replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40);
  const kind = isBacktest ? 'backtest' : 'journal';

  XLSX.writeFile(wb, `${kind}-template-${safeName}-${date}.xlsx`);
}