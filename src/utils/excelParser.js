// src/utils/excelParser.js
import * as XLSX from 'xlsx';
import { getSession, get30MinBucket, DOW_NAMES } from './timeHelpers';

const SL = 12.5; // fixed stop loss in points

// Helper to convert Excel time number to HH:MM string
function excelTimeToHHMM(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v.slice(0, 5);
  const totalMin = Math.round(v * 24 * 60);
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

// Parse a generic time value (string or number) to HH:MM
function parseTime(v) {
  if (v == null) return null;
  if (typeof v === 'number') return excelTimeToHHMM(v);
  if (typeof v === 'string') {
    // assume already HH:MM or HH:MM:SS, take first 5 chars
    const trimmed = v.trim();
    if (trimmed.length >= 5) return trimmed.slice(0, 5);
    return trimmed;
  }
  return null;
}

// Enrich raw rows with computed fields (session, bucket, dow, slHit, rAchieved)
function enrichTrades(rawRows, dynamicColumnNames) {
  return rawRows.filter(r => r.date && r.entry).map((r, i) => {
    // Parse date
    let dateStr = r.date;
    if (typeof dateStr === 'number') {
      const d = XLSX.SSF.parse_date_code(dateStr);
      dateStr = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    } else if (dateStr instanceof Date) {
      dateStr = dateStr.toISOString().slice(0, 10);
    } else {
      dateStr = String(dateStr).slice(0, 10);
    }

    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const entryMinutes = parseTimeToMinutes(r.entry);
    const mae = Number(r.mae) || 0;
    const mfe = Number(r.mfe) || 0;

    // Dynamic columns (these are the filterable columns, excluding 'session')
    const dynamic = {};
    dynamicColumnNames.forEach(key => {
      dynamic[key] = r[key] !== undefined ? String(r[key]) : '—';
    });

    return {
      id: i,
      date: dateStr,
      dateObj,
      entry: r.entry, // already HH:MM
      exit: r.exit || r.entry,
      dir: r.dir || '—',
      setup: r.setup || 'Unlabeled',
      factors: r.factors || 'Unlabeled',
      pcz: r.pcz || '—',
      vwap: r.vwap || '—',
      early: r.early || '—',
      delta: r.delta || 0,
      notes: r.notes || '',
      dow: dateObj.getDay(),
      dowName: DOW_NAMES[dateObj.getDay()],
      session: getSession(entryMinutes),
      bucket: get30MinBucket(entryMinutes),
      entryMinutes,
      mae,
      mfe,
      slHit: (mae >= SL),
      rAchieved: (mae >= SL) ? 0 : +(mfe / SL).toFixed(2),
      dynamic,
    };
  });
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Main function to parse workbook and extract trades
export function parseWorkbook(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" not found.`);

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  if (rows.length < 2) throw new Error('Sheet is empty or has no data rows.');

  const headers = rows[0].map(h => String(h).trim());

  // Locate essential columns by keyword
  const dateIdx = headers.findIndex(h => /date/i.test(h));
  const entryIdx = headers.findIndex(h => /entry time/i.test(h));
  const exitIdx = headers.findIndex(h => /exit time/i.test(h));
  const maeIdx = headers.findIndex(h => /mae/i.test(h));
  const mfeIdx = headers.findIndex(h => /mfe/i.test(h));
  const dirIdx = headers.findIndex(h => /direction/i.test(h));
  const setupIdx = headers.findIndex(h => /setup/i.test(h) && !/factor/i.test(h));
  const factorsIdx = headers.findIndex(h => /factor/i.test(h));
  const pczIdx = headers.findIndex(h => /pcz/i.test(h));
  const vwapIdx = headers.findIndex(h => /vwap/i.test(h));
  const earlyIdx = headers.findIndex(h => /^early$/i.test(h));
  const deltaIdx = headers.findIndex(h => /delta/i.test(h));
  const notesIdx = headers.findIndex(h => /notes/i.test(h));

  if (dateIdx === -1 || entryIdx === -1 || exitIdx === -1 || maeIdx === -1 || mfeIdx === -1) {
    throw new Error('Required columns missing: Date, Entry Time, Exit Time, MAE, MFE');
  }

  // Dynamic columns are those between 'Exit Time' and 'MAE' (exclusive)
  const dynamicCols = headers.slice(exitIdx + 1, maeIdx).filter(h => h.length > 0);
  const filteredDynamicCols = dynamicCols.filter(k => k.toLowerCase() !== 'session');

  // Build column mapping
  const colMap = {
    date: dateIdx,
    entry: entryIdx,
    exit: exitIdx,
    mae: maeIdx,
    mfe: mfeIdx,
    dir: dirIdx,
    setup: setupIdx,
    factors: factorsIdx,
    pcz: pczIdx,
    vwap: vwapIdx,
    early: earlyIdx,
    delta: deltaIdx,
    notes: notesIdx,
  };

  const rawTrades = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const get = (key) => {
      const idx = colMap[key];
      return (idx !== undefined && idx < row.length) ? row[idx] : null;
    };

    const dateVal = get('date');
    if (dateVal == null) continue;
    let dateStr;
    if (typeof dateVal === 'number') {
      const d = XLSX.SSF.parse_date_code(dateVal);
      dateStr = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    } else if (dateVal instanceof Date) {
      dateStr = dateVal.toISOString().slice(0, 10);
    } else {
      dateStr = String(dateVal).slice(0, 10);
    }

    const entryVal = get('entry');
    if (entryVal == null) continue;
    const entryStr = parseTime(entryVal);
    if (!entryStr) continue;

    const exitVal = get('exit');
    const exitStr = exitVal != null ? parseTime(exitVal) : entryStr;

    const trade = {
      date: dateStr,
      entry: entryStr,
      exit: exitStr,
      dir: String(get('dir') || ''),
      setup: String(get('setup') || ''),
      factors: String(get('factors') || ''),
      pcz: String(get('pcz') || ''),
      vwap: String(get('vwap') || ''),
      early: String(get('early') || ''),
      mae: Number(get('mae')) || 0,
      mfe: Number(get('mfe')) || 0,
      delta: Number(get('delta')) || 0,
      notes: String(get('notes') || ''),
    };

    // Add dynamic columns
    filteredDynamicCols.forEach(key => {
      const idx = headers.indexOf(key);
      trade[key] = (idx !== -1 && idx < row.length) ? String(row[idx] || '') : '';
    });

    rawTrades.push(trade);
  }

  // Enrich and return
  return {
    trades: enrichTrades(rawTrades, filteredDynamicCols),
    dynamicKeys: filteredDynamicCols,
  };
}