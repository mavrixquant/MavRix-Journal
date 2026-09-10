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

// Used ONLY for validation during upload — NOT stored on trades.
function validateCommission(account, contracts) {
  const mode = account?.commissionMode || 'none';
  if (mode === 'none' || mode === 'flat') return 0;
  if (mode === 'per_contract') {
    const c = Number(contracts);
    if (!c || c <= 0) return null;
    return 1; // any positive number just means "valid"
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

    // NOTE: commission and netPnl are NO LONGER stored — they're computed at read time.

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
      <div
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 7, 10, 0.8)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '16px',
        }}
      >
        <div style={{
          width: '100%', maxWidth: '620px', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          background: '#12161f', border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
          color: '#f8fafc', overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Upload Trades</h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>Import trades from your Excel file</p>
            </div>
            <button type="button" onClick={handleClose} disabled={isSaving} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: isSaving ? 'not-allowed' : 'pointer', padding: '4px' }}>
              <FaTimes />
            </button>
          </div>

          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            {!parseResult && !isParsing && (
              <label
                htmlFor="upload-modal-file"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                  padding: '40px 20px', border: '1px dashed rgba(255,255,255,0.15)',
                  borderRadius: '12px', background: 'rgba(255,255,255,0.02)',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ffb020'; e.currentTarget.style.background = 'rgba(255,176,32,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              >
                <FaFileUpload style={{ fontSize: '28px', color: '#ffb020' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                  Drop an .xlsx file here, or click to browse
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>
                  Required: Date, Entry Time, Exit Time, Direction, MAE, MFE<br />
                  {account?.type === 'Backtest' && <>Stop Loss (SL) column {account?.slValue ? 'or account default' : 'required'}<br /></>}
                  {account?.commissionMode === 'per_contract' && <>Contracts column required<br /></>}
                </div>
                <input
                  id="upload-modal-file" type="file" ref={fileInputRef}
                  accept=".xlsx,.xls"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  style={{ display: 'none' }}
                />
              </label>
            )}

            {isParsing && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Parsing file…</div>
            )}

            {parseResult && !isParsing && (
              <>
                <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--mono, monospace)', marginBottom: '6px' }}>{fileName}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px' }}>
                    <span style={{ color: hasErrors ? '#ef4444' : '#10b981', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {hasErrors ? <FaExclamationTriangle /> : <FaCheckCircle />}
                      {parseResult.tradesCount ?? 0} trades detected
                    </span>
                    {parseResult.hasSLColumn && (<span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><FaCheckCircle /> SL column found</span>)}
                    {parseResult.hasContractsColumn && (<span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><FaCheckCircle /> Contracts column found</span>)}
                  </div>
                </div>

                {hasErrors && (
                  <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Upload Blocked</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: '#fca5a5', fontSize: '12px', lineHeight: 1.6 }}>
                      {errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}

                {!hasErrors && parseResult.customColumns?.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#ffb020', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                      Custom Columns ({parseResult.customColumns.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {parseResult.customColumns.map((col) => (
                        <div key={col.name} style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{col.name}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--mono, monospace)' }}>{col.reason}</span>
                          </div>
                          {col.sampleValues?.length > 0 && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Sample: {col.sampleValues.join(', ')}</div>
                          )}
                          <div style={{ display: 'flex', gap: '16px', marginTop: '10px', alignItems: 'center' }}>
                            {col.locked ? (
                              <span style={{ fontSize: '12px', color: '#cbd5e1', padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                {col.type === 'number' ? 'Number' : col.type === 'dropdown' ? 'Dropdown' : 'Text'} (locked)
                              </span>
                            ) : (
                              <>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                                  <input type="radio" name={`col-type-${col.name}`} checked={columnTypes[col.name] === 'text'} onChange={() => handleTypeChange(col.name, 'text')} /> Text
                                </label>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                                  <input type="radio" name={`col-type-${col.name}`} checked={columnTypes[col.name] === 'dropdown'} onChange={() => handleTypeChange(col.name, 'dropdown')} /> Dropdown
                                </label>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!hasErrors && (!parseResult.customColumns || parseResult.customColumns.length === 0) && (
                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '12px', color: '#a7f3d0', textAlign: 'center' }}>
                    No custom columns to configure — ready to upload.
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.15)' }}>
            {!parseResult && (<><div style={{ flex: 1 }} /><button onClick={handleClose} style={cancelBtnStyle}>Cancel</button></>)}
            {parseResult && (
              <>
                <button onClick={reset} disabled={isSaving} style={secondaryBtnStyle}>Choose different file</button>
                <div style={{ flex: 1 }} />
                <button onClick={handleClose} disabled={isSaving} style={cancelBtnStyle}>Cancel</button>
                <button onClick={handleUpload} disabled={!canUpload} style={canUpload ? primaryBtnStyle : primaryBtnDisabledStyle}>
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

const cancelBtnStyle = { padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' };
const secondaryBtnStyle = { padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0', fontSize: '13px', fontWeight: 500, cursor: 'pointer' };
const primaryBtnStyle = { padding: '8px 20px', background: '#ffb020', border: 'none', borderRadius: '8px', color: '#0a0d13', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };
const primaryBtnDisabledStyle = { ...primaryBtnStyle, background: 'rgba(255,176,32,0.3)', color: 'rgba(10,13,19,0.5)', cursor: 'not-allowed' };