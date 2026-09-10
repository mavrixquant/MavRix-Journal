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

// ---------- Column metadata (mirrors UploadModal rules) ----------
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

  if (values.length === 0) {
    // Empty column — user can choose freely, default text
    return { locked: false, autoType: 'text', reason: 'No data yet' };
  }

  const allNumeric = values.every(isStrictNumeric);
  if (allNumeric) {
    return { locked: true, autoType: 'number', reason: 'All values numeric' };
  }

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
  .custom-date-input { width: 100%; padding: 9px 12px; background: #0d1017; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #ffffff; font-size: 13px; outline: none; box-sizing: border-box; }
  .custom-date-input:focus { border-color: #ffb020; }
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

  const [customColumnsModalOpen, setCustomColumnsModalOpen] = useState(false);
  const [pendingConfigs, setPendingConfigs] = useState({});       // local edits for column types
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
    if (!trades || trades.length === 0) return [];
    const allKeys = new Set();
    trades.forEach((trade) => {
      Object.keys(trade).forEach((key) => {
        if (!DEFAULT_COLUMNS.includes(key) && key !== 'id' && key !== 'accountId' && key !== 'createdAt' && key !== 'updatedAt') {
          allKeys.add(key);
        }
      });
    });
    return Array.from(allKeys).sort();
  }, [trades]);

  // Column metadata for the Manage modal + options for dropdowns
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

  // ---------- Manage Custom Columns modal ----------
  const openCustomColumnsModal = () => {
    // Seed pending configs from existing config + auto-detected for new columns
    const seeded = { ...(selectedAccount?.columnConfigs || {}) };
    dynamicColumns.forEach(col => {
      const meta = columnMeta[col];
      if (meta.locked) {
        seeded[col] = meta.autoType; // locked columns always reflect their computed type
      } else if (!seeded[col]) {
        seeded[col] = meta.autoType;
      }
    });
    setPendingConfigs(seeded);
    setCustomColumnsModalOpen(true);
  };

  const closeCustomColumnsModal = () => {
    setCustomColumnsModalOpen(false);
    setPendingConfigs({});
  };

  const handlePendingTypeChange = (colName, type) => {
    setPendingConfigs(prev => ({ ...prev, [colName]: type }));
  };

  const hasPendingChanges = useMemo(() => {
    if (!selectedAccount) return false;
    const current = selectedAccount.columnConfigs || {};
    const keys = new Set([...Object.keys(current), ...Object.keys(pendingConfigs)]);
    for (const k of keys) {
      if ((current[k] || undefined) !== (pendingConfigs[k] || undefined)) return true;
    }
    return false;
  }, [selectedAccount, pendingConfigs]);

  const handleSaveConfigs = async () => {
    if (!selectedAccountId) return;
    setLoadingCustomColumn(true);
    try {
      // Only persist explicit configs (skip deleted columns)
      const cleaned = {};
      dynamicColumns.forEach(col => {
        const val = pendingConfigs[col];
        if (val === 'text' || val === 'dropdown' || val === 'number') cleaned[col] = val;
      });
      await updateAccountColumnConfigs(selectedAccountId, cleaned);
      setSuccessAlert({ show: true, message: 'Column types saved.' });
      closeCustomColumnsModal();
    } catch (err) {
      console.error(err);
      setErrorAlert({ show: true, message: 'Failed to save column types: ' + err.message });
    } finally {
      setLoadingCustomColumn(false);
    }
  };

  const confirmDeleteColumn = async () => {
    const { columnName } = deleteColumnAlert;
    if (!columnName) return;
    setLoadingCustomColumn(true);
    try {
      await deleteCustomColumn(selectedAccountId, columnName);
      // Also drop from account configs if present
      if (selectedAccount?.columnConfigs?.[columnName] !== undefined) {
        const nextConfigs = { ...selectedAccount.columnConfigs };
        delete nextConfigs[columnName];
        await updateAccountColumnConfigs(selectedAccountId, nextConfigs);
      }
      setDeleteColumnAlert({ show: false, columnName: '' });
      setSuccessAlert({ show: true, message: `Column "${columnName}" deleted from all trades.` });
    } catch (err) {
      console.error(err);
      setDeleteColumnAlert({ show: false, columnName: '' });
      setErrorAlert({ show: true, message: 'Failed to delete column: ' + err.message });
    } finally { setLoadingCustomColumn(false); }
  };

  const handleAddColumn = async () => {
    const name = newColumnName.trim();
    if (!name) { setErrorAlert({ show: true, message: 'Column name cannot be empty.' }); return; }
    if (DEFAULT_COLUMNS.includes(name) || dynamicColumns.includes(name)) {
      setErrorAlert({ show: true, message: 'Column name already exists or is reserved.' });
      return;
    }
    setLoadingCustomColumn(true);
    try {
      await addCustomColumn(selectedAccountId, name);
      // Default to text for a brand-new empty column
      const nextConfigs = { ...(selectedAccount?.columnConfigs || {}), [name]: 'text' };
      await updateAccountColumnConfigs(selectedAccountId, nextConfigs);
      setNewColumnName('');
      setSuccessAlert({ show: true, message: `Column "${name}" added to all trades.` });
    } catch (err) {
      console.error(err);
      setErrorAlert({ show: true, message: 'Failed to add column: ' + err.message });
    } finally { setLoadingCustomColumn(false); }
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-dim, #94a3b8)', fontFamily: 'var(--mono, monospace)' }}>
        <LoadingOverlay message="Loading journal..." />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-dim, #94a3b8)', maxWidth: '400px', margin: '0 auto' }}>
        <h3 style={{ color: 'var(--text, #f8fafc)', marginBottom: '8px' }}>No Accounts Found</h3>
        <p style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '20px' }}>Create an account in the Accounts section to start logging and tracking your trades.</p>
      </div>
    );
  }

  const isBacktest = selectedAccount?.type === 'Backtest';
  const isPerContract = selectedAccount?.commissionMode === 'per_contract';

  return (
    <div style={{ padding: '24px', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      <style>{darkDatePickerStyles}</style>

      {/* Header Section */}
      <div style={{ background: 'rgba(18, 22, 31, 0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Active Account</span>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              style={{ padding: '8px 16px', background: '#0d1017', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#f8fafc', fontSize: '14px', fontWeight: 600, cursor: 'pointer', outline: 'none', minWidth: '180px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)' }}
            >
              {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
            </select>
          </div>
          <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.08)', margin: '0 8px' }} />
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 600, display: 'block' }}>Net P&L</span>
              <span style={{ fontSize: '16px', fontWeight: '700', color: stats.totalNet >= 0 ? '#10b981' : '#ef4444', fontFamily: 'var(--mono, monospace)' }}>
                {stats.totalNet >= 0 ? `+$${stats.totalNet.toFixed(2)}` : `-$${Math.abs(stats.totalNet).toFixed(2)}`}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 600, display: 'block' }}>Win Rate</span>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', fontFamily: 'var(--mono, monospace)' }}>{stats.winRate}%</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={openCustomColumnsModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 14px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#e2e8f0', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>
            <FaColumns style={{ fontSize: '12px', color: '#94a3b8' }} /> Columns
          </button>
          <button onClick={handleDownloadTemplate} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 14px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#e2e8f0', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>
            <FaDownload style={{ fontSize: '12px', color: '#94a3b8' }} /> Template
          </button>
          <button onClick={() => setUploadModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 14px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#60a5fa', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
            <FaFileUpload style={{ fontSize: '12px' }} /> Upload
          </button>
          <button onClick={openCreateModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', background: 'linear-gradient(135deg, #ffb020 0%, #f59e0b 100%)', border: 'none', borderRadius: '8px', color: '#0a0d13', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 176, 32, 0.25)', transition: 'all 0.2s' }}>
            <FaPlus style={{ fontSize: '11px' }} /> Add Trade
          </button>
        </div>
      </div>

      {/* Data Table Container */}
      <div style={{ background: 'rgba(18, 22, 31, 0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '13px' }} />
            <input placeholder="Search symbol, notes, columns..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '9px 12px 9px 36px', background: '#0d1017', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><FaTimes /></button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'var(--mono, monospace)' }}>
              Showing <strong style={{ color: '#f8fafc' }}>{filteredAndSortedTrades.length}</strong> of {trades.length} trades
            </span>
          </div>
        </div>

        <div style={{ width: '100%', overflowX: 'auto', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                {visibleColumns.map((col) => (
                  <th key={col} onClick={() => handleSort(col)} style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', color: sortKey === col ? '#ffb020' : '#94a3b8', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', textAlign: col === 'direction' ? 'center' : 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: col === 'direction' ? 'center' : 'flex-start' }}>
                      {formatColumnHeader(col)}
                      {sortKey === col ? (sortDir === 1 ? <FaSortAmountUp style={{ fontSize: '11px' }} /> : <FaSortAmountDown style={{ fontSize: '11px' }} />) : null}
                    </div>
                  </th>
                ))}
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94a3b8', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedTrades.length === 0 ? (
                <tr><td colSpan={visibleColumns.length + 1} style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b' }}>No trades matching your criteria.</td></tr>
              ) : (
                filteredAndSortedTrades.map((trade) => (
                  <tr key={trade.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {visibleColumns.map((col) => {
                      const value = trade[col];
                      if (col === 'direction') {
                        const isLong = value === 'Long';
                        return (
                          <td key={col} style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.03em', background: isLong ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: isLong ? '#10b981' : '#ef4444', border: `1px solid ${isLong ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}` }}>
                              {value ? value.toUpperCase() : '—'}
                            </span>
                          </td>
                        );
                      }
                      if (col === 'pnl' || col === 'netPnl') {
                        const pnlVal = value !== undefined && value !== '' && value !== null ? Number(value) : null;
                        const emphasize = col === 'netPnl';
                        return (
                          <td key={col} style={{ padding: '12px 16px', fontFamily: 'var(--mono, monospace)', fontWeight: emphasize ? '700' : '600', fontSize: '13px', color: pnlVal > 0 ? '#10b981' : pnlVal < 0 ? '#ef4444' : '#94a3b8' }}>
                            {pnlVal !== null && !isNaN(pnlVal) ? `${pnlVal >= 0 ? '+' : ''}${pnlVal.toFixed(2)}` : '—'}
                          </td>
                        );
                      }
                      if (col === 'mae' || col === 'mfe' || col === 'slPoints' || col === 'commission') {
                        return (
                          <td key={col} style={{ padding: '12px 16px', fontFamily: 'var(--mono, monospace)', fontSize: '13px', color: '#cbd5e1' }}>
                            {value !== undefined && value !== '' && value !== null ? Number(value).toFixed(2) : '—'}
                          </td>
                        );
                      }
                      if (col === 'contracts') {
                        return <td key={col} style={{ padding: '12px 16px', fontFamily: 'var(--mono, monospace)', fontSize: '13px', color: '#cbd5e1' }}>{value !== undefined && value !== null ? value : '—'}</td>;
                      }
                      if (col === 'symbol') {
                        return <td key={col} style={{ padding: '12px 16px', fontWeight: '700', fontSize: '13px', color: '#f8fafc' }}>{value || '—'}</td>;
                      }
                      if (col === 'entryTime' || col === 'exitTime') {
                        return <td key={col} style={{ padding: '12px 16px', fontFamily: 'var(--mono, monospace)', fontSize: '12px', color: '#94a3b8' }}>{formatTimeWithAMPM(value)}</td>;
                      }
                      if (col === 'tradeId') {
                        return <td key={col} style={{ padding: '12px 16px', fontFamily: 'var(--mono, monospace)', fontSize: '11px', color: '#64748b' }}>{value || '—'}</td>;
                      }
                      return <td key={col} style={{ padding: '12px 16px', fontSize: '13px', color: '#cbd5e1' }}>{value !== undefined && value !== null ? String(value) : '—'}</td>;
                    })}
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => openEditModal(trade)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', marginRight: '4px', borderRadius: '4px' }} title="Edit Trade"><FaEdit /></button>
                      <button onClick={() => handleDelete(trade.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '4px' }} title="Delete Trade"><FaTrash /></button>
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
          <div onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5, 7, 10, 0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', background: '#12161f', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)', padding: '24px', color: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{editingId ? 'Edit Trade Execution' : 'Log New Trade'}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>{editingId ? 'Modify recorded position details' : 'Enter trade performance and metadata'}</p>
                </div>
                <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer', padding: '4px' }}><FaTimes /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Date</label>
                    <DatePicker selected={formData.date} onChange={(d) => setFormData(prev => ({ ...prev, date: d }))} dateFormat="yyyy-MM-dd" placeholderText="Select Date" className="custom-date-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Entry Time</label>
                    <input type="time" value={formData.entryTime} onChange={(e) => setFormData(prev => ({ ...prev, entryTime: e.target.value }))} className="custom-date-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Exit Time</label>
                    <input type="time" value={formData.exitTime} onChange={(e) => setFormData(prev => ({ ...prev, exitTime: e.target.value }))} className="custom-date-input" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Direction</label>
                    <select name="direction" value={formData.direction} onChange={handleChange} className="custom-date-input">
                      {DIRECTIONS.map((dir) => (<option key={dir} value={dir}>{dir}</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Symbol</label>
                    <input type="text" name="symbol" value={formData.symbol} onChange={handleChange} placeholder="e.g., NQ, ES, AAPL" className="custom-date-input" />
                  </div>
                </div>

                <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px' }}>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#ffb020', marginBottom: '10px' }}>Execution Metrics</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#94a3b8' }}>P&L ($)</label>
                      <input type="number" name="pnl" value={formData.pnl} onChange={handleChange} step="0.01" placeholder="0.00" className="custom-date-input" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#94a3b8' }}>MAE</label>
                      <input type="number" name="mae" value={formData.mae} onChange={handleChange} step="0.01" placeholder="0.00" className="custom-date-input" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#94a3b8' }}>MFE</label>
                      <input type="number" name="mfe" value={formData.mfe} onChange={handleChange} step="0.01" placeholder="0.00" className="custom-date-input" />
                    </div>
                  </div>
                </div>

                {(isBacktest || isPerContract) && (
                  <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px' }}>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#ffb020', marginBottom: '10px' }}>Risk Details</span>
                    <div style={{ display: 'grid', gridTemplateColumns: (isBacktest && isPerContract) ? '1fr 1fr' : '1fr', gap: '12px' }}>
                      {isBacktest && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#94a3b8' }}>
                            SL ({selectedAccount?.slUnit === 'ticks' ? 'Ticks' : 'Points'})
                            <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '4px' }}>— blank = account default</span>
                          </label>
                          <input type="number" name="sl" value={formData.sl} onChange={handleChange} step="0.01" min="0" placeholder={selectedAccount?.slValue ? `Default: ${selectedAccount.slValue}` : '0.00'} className="custom-date-input" />
                        </div>
                      )}
                      {isPerContract && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#94a3b8' }}>
                            Contracts <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input type="number" name="contracts" value={formData.contracts} onChange={handleChange} step="1" min="1" placeholder="1" className="custom-date-input" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Notes</label>
                  <input type="text" name="notes" value={formData.notes} onChange={handleChange} placeholder="Enter trade notes, execution comments..." className="custom-date-input" />
                </div>

                {dynamicColumns.length > 0 && (
                  <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px' }}>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '10px' }}>Custom Attributes</span>
                    <div style={{ display: 'grid', gridTemplateColumns: dynamicColumns.length > 1 ? '1fr 1fr' : '1fr', gap: '12px' }}>
                      {dynamicColumns.map(col => {
                        const options = customColumnOptions[col] || [];
                        const inputType = resolveColumnInputType(col, selectedAccount?.columnConfigs, options);
                        return (
                          <div key={col}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#94a3b8' }}>{formatColumnHeader(col)}</label>
                            {inputType === 'dropdown' ? (
                              <>
                                <select value={customSelectValues[col] || ''} onChange={(e) => handleCustomSelectChange(col, e.target.value)} className="custom-date-input">
                                  <option value="">Select...</option>
                                  {options.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                                  <option value="__other__">Other…</option>
                                </select>
                                {customSelectValues[col] === '__other__' && (
                                  <input type="text" value={customTextValues[col] || ''} onChange={(e) => handleCustomTextChange(col, e.target.value)} placeholder={`Enter ${formatColumnHeader(col)}`} className="custom-date-input" style={{ marginTop: '6px' }} />
                                )}
                              </>
                            ) : inputType === 'number' ? (
                              <input type="number" value={customTextValues[col] || ''} onChange={(e) => handleCustomTextChange(col, e.target.value)} placeholder={`Enter ${formatColumnHeader(col)}`} className="custom-date-input" />
                            ) : (
                              <input type="text" value={customTextValues[col] || ''} onChange={(e) => handleCustomTextChange(col, e.target.value)} placeholder={`Enter ${formatColumnHeader(col)}`} className="custom-date-input" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <button type="button" onClick={closeModal} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '8px 20px', background: '#ffb020', border: 'none', borderRadius: '8px', color: '#0a0d13', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>{editingId ? 'Update Trade' : 'Add Trade'}</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Column Management Modal — now with type editing */}
      {customColumnsModalOpen && (
        <Portal>
          <div onClick={(e) => { if (e.target === e.currentTarget) closeCustomColumnsModal(); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5, 7, 10, 0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#12161f', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)', color: '#f8fafc', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Manage Custom Columns</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>Add columns and set input types</p>
                </div>
                <button type="button" onClick={closeCustomColumnsModal} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}><FaTimes /></button>
              </div>

              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                {/* Add new column */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input type="text" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="New column name..." className="custom-date-input" style={{ flex: 1 }} />
                  <button onClick={handleAddColumn} disabled={loadingCustomColumn || !newColumnName.trim()} style={{ padding: '8px 16px', background: '#ffb020', border: 'none', borderRadius: '8px', color: '#0a0d13', fontSize: '13px', fontWeight: 700, cursor: loadingCustomColumn || !newColumnName.trim() ? 'not-allowed' : 'pointer', opacity: loadingCustomColumn || !newColumnName.trim() ? 0.5 : 1 }}>Add</button>
                </div>

                {/* Columns list with type picker */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dynamicColumns.length === 0 && (<p style={{ fontSize: '12px', color: '#64748b', margin: 0, textAlign: 'center', padding: '12px' }}>No custom columns yet.</p>)}
                  {dynamicColumns.map(col => {
                    const meta = columnMeta[col] || { locked: false, autoType: 'text', reason: '' };
                    const currentType = pendingConfigs[col] ?? meta.autoType;
                    return (
                      <div key={col} style={{ padding: '12px 14px', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{formatColumnHeader(col)}</span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '10.5px', color: '#94a3b8', fontFamily: 'var(--mono, monospace)' }}>{meta.reason}</span>
                            <button onClick={() => setDeleteColumnAlert({ show: true, columnName: col })} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }} title="Delete column"><FaTrash size={12} /></button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', alignItems: 'center' }}>
                          {meta.locked ? (
                            <span style={{ fontSize: '12px', color: '#cbd5e1', padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              {meta.autoType === 'number' ? 'Number' : 'Text'} (locked)
                            </span>
                          ) : (
                            <>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                                <input type="radio" name={`manage-col-${col}`} checked={currentType === 'text'} onChange={() => handlePendingTypeChange(col, 'text')} /> Text
                              </label>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                                <input type="radio" name={`manage-col-${col}`} checked={currentType === 'dropdown'} onChange={() => handlePendingTypeChange(col, 'dropdown')} /> Dropdown
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer with Save Changes */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.15)' }}>
                <span style={{ fontSize: '11px', color: hasPendingChanges ? '#ffb020' : '#64748b', fontFamily: 'var(--mono, monospace)' }}>
                  {hasPendingChanges ? '● Unsaved changes' : 'No pending changes'}
                </span>
                <div style={{ flex: 1 }} />
                <button onClick={closeCustomColumnsModal} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSaveConfigs} disabled={!hasPendingChanges || loadingCustomColumn} style={{ padding: '8px 20px', background: hasPendingChanges ? '#ffb020' : 'rgba(255,176,32,0.3)', border: 'none', borderRadius: '8px', color: hasPendingChanges ? '#0a0d13' : 'rgba(10,13,19,0.5)', fontSize: '13px', fontWeight: 700, cursor: hasPendingChanges ? 'pointer' : 'not-allowed' }}>
                  {loadingCustomColumn ? 'Saving…' : 'Save Changes'}
                </button>
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
      <Alert isOpen={deleteAlert.show} title="Delete Trade" message="Are you sure you want to delete this trade?" type="confirm" confirmText="Delete" cancelText="Cancel" onConfirm={confirmDelete} onCancel={() => setDeleteAlert({ show: false, tradeId: null })} showCancel={true}/>
      <Alert isOpen={deleteColumnAlert.show} title="Delete Column" message={`Are you sure you want to delete the column "${deleteColumnAlert.columnName}" from all trades?`} type="confirm" confirmText="Delete" cancelText="Cancel" onConfirm={confirmDeleteColumn} onCancel={() => setDeleteColumnAlert({ show: false, columnName: '' })} showCancel={true} />
    </div>
  );
}