// src/components/journal/JournalMain.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { FaEdit, FaTrash, FaDownload } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAccounts } from '../../firebase/accountsService';
import { subscribeToTrades, createTrade, updateTrade, deleteTrade, createTrades, generateTradeId, renameCustomColumn, deleteCustomColumn, addCustomColumn } from '../../firebase/tradesService';
import Portal from '../common/Portal';
import Alert from '../common/Alert';
import LoadingOverlay from '../common/LoadingOverlay';
import * as XLSX from 'xlsx';

const DIRECTIONS = ['Long', 'Short'];
const DEFAULT_COLUMNS = ['tradeId', 'date', 'entryTime', 'exitTime', 'direction', 'symbol', 'mae', 'mfe', 'pnl'];
const TEMPLATE_HEADERS = ['Date', 'Entry Time', 'Exit Time', 'Direction', 'Symbol', 'MAE', 'MFE', 'P&L'];
const SAMPLE_TRADE = {
  'Date': '2026-09-07',
  'Entry Time': '09:30',
  'Exit Time': '10:15',
  'Direction': 'Long',
  'Symbol': 'NQ',
  'MAE': 8.20,
  'MFE': 15.40,
  'P&L': 12.34,
};

const getColumnMinWidth = (col) => {
  switch (col) {
    case 'tradeId': return '100px';
    case 'date': return '80px';
    case 'entryTime': return '80px';
    case 'exitTime': return '80px';
    case 'direction': return '70px';
    case 'symbol': return '70px';
    case 'mae': return '70px';
    case 'mfe': return '70px';
    case 'pnl': return '70px';
    default: return '120px';
  }
};

const formatColumnHeader = (key) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
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

export default function JournalMain() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    entryTime: '',
    exitTime: '',
    direction: 'Long',
    symbol: '',
    mae: '',
    mfe: '',
    pnl: '',
  });
  const fileInputRef = useRef(null);

  // Search and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState(1); // 1 = asc, -1 = desc

  const [confirmAlert, setConfirmAlert] = useState({ show: false, tradesCount: 0, onConfirm: null, onCancel: null });
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [successAlert, setSuccessAlert] = useState({ show: false, message: '' });
  const [errorAlert, setErrorAlert] = useState({ show: false, message: '' });
  const [deleteAlert, setDeleteAlert] = useState({ show: false, tradeId: null });

  const [customColumnsModalOpen, setCustomColumnsModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [deleteColumnAlert, setDeleteColumnAlert] = useState({ show: false, columnName: '' });
  const [loadingCustomColumn, setLoadingCustomColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [customSelectValues, setCustomSelectValues] = useState({});
  const [customTextValues, setCustomTextValues] = useState({});

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToAccounts(user.uid, (fetched) => {
      setAccounts(fetched);
      if (fetched.length > 0 && !selectedAccountId) {
        setSelectedAccountId(fetched[0].id);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!selectedAccountId) return;
    const unsubscribe = subscribeToTrades(selectedAccountId, (fetched) => {
      setTrades(fetched);
    });
    return unsubscribe;
  }, [selectedAccountId]);

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

  const customColumnOptions = useMemo(() => {
    const options = {};
    dynamicColumns.forEach(col => {
      const values = new Set();
      trades.forEach(trade => {
        const val = trade[col];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          values.add(String(val).trim());
        }
      });
      options[col] = Array.from(values).sort();
    });
    return options;
  }, [dynamicColumns, trades]);

  const allColumns = [...DEFAULT_COLUMNS, ...dynamicColumns];

  // Filter and sort trades for display
  const filteredAndSortedTrades = useMemo(() => {
    let result = [...trades];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(trade => {
        // Search in default columns
        for (const col of DEFAULT_COLUMNS) {
          const val = trade[col];
          if (val !== undefined && val !== null && String(val).toLowerCase().includes(q)) return true;
        }
        // Search in dynamic columns
        for (const col of dynamicColumns) {
          const val = trade[col];
          if (val !== undefined && val !== null && String(val).toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }
    // Sort
    result.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (sortKey === 'date') {
        va = new Date(va);
        vb = new Date(vb);
      } else if (sortKey === 'mae' || sortKey === 'mfe' || sortKey === 'pnl') {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else if (typeof va === 'string') {
        va = va.toLowerCase();
        vb = vb.toLowerCase();
      }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
    return result;
  }, [trades, searchQuery, sortKey, sortDir, dynamicColumns]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => -prev);
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const handleAccountChange = (e) => {
    setSelectedAccountId(e.target.value);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ date: '', entryTime: '', exitTime: '', direction: 'Long', symbol: '', mae: '', mfe: '', pnl: '' });
    setCustomSelectValues({});
    setCustomTextValues({});
    setModalOpen(true);
  };

  const openEditModal = (trade) => {
    setEditingId(trade.id);
    setFormData({
      date: trade.date || '',
      entryTime: trade.entryTime || '',
      exitTime: trade.exitTime || '',
      direction: trade.direction || 'Long',
      symbol: trade.symbol || '',
      mae: trade.mae || '',
      mfe: trade.mfe || '',
      pnl: trade.pnl !== undefined ? trade.pnl : '',
    });
    const selects = {};
    const texts = {};
    dynamicColumns.forEach(col => {
      const val = trade[col] !== undefined ? String(trade[col]) : '';
      const options = customColumnOptions[col] || [];
      if (options.length <= 10) {
        if (val && options.includes(val)) {
          selects[col] = val;
        } else if (val) {
          selects[col] = '__other__';
          texts[col] = val;
        } else {
          selects[col] = '';
        }
      } else {
        texts[col] = val;
      }
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
      setCustomTextValues(prev => {
        const newPrev = { ...prev };
        delete newPrev[columnName];
        return newPrev;
      });
    }
  };

  const handleCustomTextChange = (columnName, value) => {
    setCustomTextValues(prev => ({ ...prev, [columnName]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { date, entryTime, exitTime, direction, symbol, mae, mfe, pnl } = formData;
    if (!date || !entryTime || !exitTime) return;

    const tradeData = {
      date,
      entryTime,
      exitTime,
      direction,
      symbol: symbol || '',
      mae: Number(mae) || 0,
      mfe: Number(mfe) || 0,
      pnl: pnl !== '' ? Number(pnl) : '',
    };

    dynamicColumns.forEach(col => {
      const options = customColumnOptions[col] || [];
      if (options.length <= 10) {
        const selected = customSelectValues[col];
        if (selected === '__other__') {
          tradeData[col] = (customTextValues[col] || '').trim();
        } else if (selected) {
          tradeData[col] = selected;
        } else {
          tradeData[col] = '';
        }
      } else {
        tradeData[col] = (customTextValues[col] || '').trim();
      }
    });

    const duplicates = checkDuplicateTradeIds([tradeData], editingId ? editingId : null);
    if (duplicates.length > 0) {
      setErrorAlert({
        show: true,
        message: `Trade ID already exists: ${duplicates[0]}. Please change date, times, or direction.`,
      });
      return;
    }

    try {
      if (editingId) {
        await updateTrade(editingId, tradeData);
      } else {
        await createTrade(selectedAccountId, tradeData);
      }
      closeModal();
    } catch (err) {
      console.error(err);
      setErrorAlert({ show: true, message: 'Failed to save trade: ' + err.message });
    }
  };

  const handleDelete = (tradeId) => {
    setDeleteAlert({ show: true, tradeId });
  };

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

  const cancelDelete = () => {
    setDeleteAlert({ show: false, tradeId: null });
  };

  const checkDuplicateTradeIds = (tradeArray, excludeId = null) => {
    const existingIds = new Set(
      trades
        .filter(t => t.id !== excludeId)
        .map(t => t.tradeId)
    );
    const duplicates = [];
    for (const trade of tradeArray) {
      const tid = generateTradeId(trade);
      if (existingIds.has(tid)) {
        duplicates.push(tid);
      }
    }
    return duplicates;
  };

  const openCustomColumnsModal = () => {
    setCustomColumnsModalOpen(true);
    setEditingColumn(null);
  };

  const closeCustomColumnsModal = () => {
    setCustomColumnsModalOpen(false);
    setEditingColumn(null);
  };

  const handleEditColumnClick = (columnName) => {
    setEditingColumn({ oldName: columnName, newName: columnName });
  };

  const handleColumnNameChange = (e) => {
    const { value } = e.target;
    setEditingColumn(prev => ({ ...prev, newName: value }));
  };

  const handleSaveColumnRename = async () => {
    if (!editingColumn) return;
    const { oldName, newName } = editingColumn;
    if (!newName || newName.trim() === '') {
      setErrorAlert({ show: true, message: 'Column name cannot be empty.' });
      return;
    }
    const trimmedNewName = newName.trim();
    if (DEFAULT_COLUMNS.includes(trimmedNewName) || (dynamicColumns.includes(trimmedNewName) && trimmedNewName !== oldName)) {
      setErrorAlert({ show: true, message: 'Column name already exists or is reserved.' });
      return;
    }
    setLoadingCustomColumn(true);
    try {
      await renameCustomColumn(selectedAccountId, oldName, trimmedNewName);
      setEditingColumn(null);
      setSuccessAlert({ show: true, message: `Column "${oldName}" renamed to "${trimmedNewName}".` });
    } catch (err) {
      console.error(err);
      setErrorAlert({ show: true, message: 'Failed to rename column: ' + err.message });
    } finally {
      setLoadingCustomColumn(false);
    }
  };

  const handleDeleteColumnClick = (columnName) => {
    setDeleteColumnAlert({ show: true, columnName });
  };

  const confirmDeleteColumn = async () => {
    const { columnName } = deleteColumnAlert;
    if (!columnName) return;
    setLoadingCustomColumn(true);
    try {
      await deleteCustomColumn(selectedAccountId, columnName);
      setDeleteColumnAlert({ show: false, columnName: '' });
      setSuccessAlert({ show: true, message: `Column "${columnName}" deleted from all trades.` });
    } catch (err) {
      console.error(err);
      setDeleteColumnAlert({ show: false, columnName: '' });
      setErrorAlert({ show: true, message: 'Failed to delete column: ' + err.message });
    } finally {
      setLoadingCustomColumn(false);
    }
  };

  const cancelDeleteColumn = () => {
    setDeleteColumnAlert({ show: false, columnName: '' });
  };

  const handleAddColumn = async () => {
    const name = newColumnName.trim();
    if (!name) {
      setErrorAlert({ show: true, message: 'Column name cannot be empty.' });
      return;
    }
    if (DEFAULT_COLUMNS.includes(name) || dynamicColumns.includes(name)) {
      setErrorAlert({ show: true, message: 'Column name already exists or is reserved.' });
      return;
    }
    setLoadingCustomColumn(true);
    try {
      await addCustomColumn(selectedAccountId, name);
      setNewColumnName('');
      setSuccessAlert({ show: true, message: `Column "${name}" added to all trades.` });
    } catch (err) {
      console.error(err);
      setErrorAlert({ show: true, message: 'Failed to add column: ' + err.message });
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rows.length === 0) {
          setErrorAlert({ show: true, message: 'The file is empty.' });
          return;
        }

        const formatExcelDate = (value) => {
          if (!value) return '';
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value;
          if (typeof value === 'number') {
            const date = XLSX.SSF.parse_date_code(value);
            if (date) {
              return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
            }
          }
          const parsed = new Date(value);
          if (!isNaN(parsed)) {
            return parsed.toISOString().slice(0, 10);
          }
          return String(value);
        };

        const formatExcelTime = (value) => {
          if (!value) return '';
          if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
          if (typeof value === 'number') {
            const totalMinutes = Math.round(value * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          }
          if (value instanceof Date) {
            return value.toTimeString().slice(0, 5);
          }
          const parsed = new Date(`2000-01-01T${value}`);
          if (!isNaN(parsed)) {
            return parsed.toTimeString().slice(0, 5);
          }
          return String(value);
        };

        const headerMap = {};
        const originalHeaders = Object.keys(rows[0]);
        originalHeaders.forEach((h) => {
          const trimmed = h.trim();
          if (trimmed === 'Date') headerMap[trimmed] = 'date';
          else if (trimmed === 'Entry Time') headerMap[trimmed] = 'entryTime';
          else if (trimmed === 'Exit Time') headerMap[trimmed] = 'exitTime';
          else if (trimmed === 'Direction') headerMap[trimmed] = 'direction';
          else if (trimmed === 'Symbol') headerMap[trimmed] = 'symbol';
          else if (trimmed === 'MAE') headerMap[trimmed] = 'mae';
          else if (trimmed === 'MFE') headerMap[trimmed] = 'mfe';
          else if (trimmed === 'P&L') headerMap[trimmed] = 'pnl';
          else headerMap[trimmed] = trimmed;
        });

        const tradesData = rows
          .map((row) => {
            const trade = {};
            Object.keys(row).forEach((originalKey) => {
              const trimmed = originalKey.trim();
              const mappedKey = headerMap[trimmed] || trimmed;
              let value = row[originalKey];
              if (mappedKey === 'date') {
                value = formatExcelDate(value);
              } else if (mappedKey === 'entryTime' || mappedKey === 'exitTime') {
                value = formatExcelTime(value);
              }
              trade[mappedKey] = value;
            });
            if (!trade.date || !trade.entryTime || !trade.exitTime) return null;
            trade.mae = parseFloat(trade.mae) || 0;
            trade.mfe = parseFloat(trade.mfe) || 0;
            if (trade.pnl !== undefined && trade.pnl !== '') {
              trade.pnl = parseFloat(trade.pnl) || 0;
            } else {
              trade.pnl = '';
            }
            Object.keys(trade).forEach((k) => {
              if (trade[k] === undefined || trade[k] === null) delete trade[k];
            });
            return trade;
          })
          .filter((t) => t !== null);

        if (tradesData.length === 0) {
          setErrorAlert({
            show: true,
            message: 'No valid trades found. Ensure columns: Date, Entry Time, Exit Time, Direction, MAE, MFE'
          });
          return;
        }

        const duplicates = checkDuplicateTradeIds(tradesData);
        if (duplicates.length > 0) {
          setErrorAlert({
            show: true,
            message: `Upload blocked. ${duplicates.length} trade(s) already exist. First duplicate ID: ${duplicates[0]}.`,
          });
          return;
        }

        setConfirmAlert({
          show: true,
          tradesCount: tradesData.length,
          onConfirm: () => {
            setConfirmAlert({ show: false, tradesCount: 0, onConfirm: null, onCancel: null });
            setLoadingUpload(true);
            createTrades(selectedAccountId, tradesData)
              .then(() => {
                setLoadingUpload(false);
                setSuccessAlert({ show: true, message: `Successfully added ${tradesData.length} trades.` });
              })
              .catch((err) => {
                setLoadingUpload(false);
                setErrorAlert({ show: true, message: 'Error saving trades: ' + err.message });
              });
          },
          onCancel: () => {
            setConfirmAlert({ show: false, tradesCount: 0, onConfirm: null, onCancel: null });
          },
        });

      } catch (err) {
        console.error(err);
        setErrorAlert({ show: true, message: 'Error parsing file: ' + err.message });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;
  }

  if (accounts.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>No accounts. Go to Accounts tab to create one.</div>;
  }

  return (
    <div style={{
      padding: '20px 0',
      width: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      minWidth: 0,
      overflow: 'visible'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--text-dim)' }}>Account:</label>
          <select
            value={selectedAccountId}
            onChange={handleAccountChange}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-alt)',
              border: '1px solid var(--border-soft)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontFamily: 'var(--mono)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn-upload"
            onClick={openCustomColumnsModal}
            style={{ borderStyle: 'solid', borderWidth: '1px', color: 'var(--white)', borderColor: 'var(--white)', padding: '8px 14px' }}
          >
            Manage Custom Columns
          </button>
          <button className="btn-upload" onClick={openCreateModal} style={{ borderStyle: 'solid', padding: '8px 14px', borderColor: 'var(--amber)', color: 'var(--amber)' }}>
            + Add Trade
          </button>
          <button className="btn-upload" onClick={handleDownloadTemplate} style={{ borderStyle: 'solid', padding: '8px 14px' }}>
            <FaDownload style={{ marginRight: '6px' }} /> Template
          </button>
          <label className="btn-upload" style={{ borderStyle: 'solid', padding: '8px 14px', cursor: 'pointer', borderColor: 'var(--blue)', color: 'var(--blue)' }} onClick={() => fileInputRef.current.click()}>
            ⇪ Upload XLSX
            <input type="file" ref={fileInputRef} accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Search and count */}
      <div className="table-controls" style={{ marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
        <input
          className="search-box"
          placeholder="Search trades…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <span className="panel-note mono">{filteredAndSortedTrades.length} trades</span>
      </div>

      {/* Table Wrapper */}
      <div className="table-wrap" style={{
        width: '100%',
        overflow: 'auto',
        minHeight: 0,
        minWidth: 0,
        height: 'calc(100vh - 220px)', // fill screen height minus other elements
        overflowY: 'auto',
        overflowX: 'auto',
      }}>
        <table style={{ width: '100%', minWidth: 'auto', tableLayout: 'auto' }}>
          <thead>
            <tr>
              {allColumns.map((col) => (
                <th
                  key={col}
                  style={{ textAlign: col === 'direction' ? 'center' : 'left', minWidth: getColumnMinWidth(col), cursor: 'pointer' }}
                  onClick={() => handleSort(col)}
                  title={`Sort by ${formatColumnHeader(col)}`}
                >
                  {formatColumnHeader(col)}
                  {sortKey === col && (sortDir === 1 ? ' ↑' : ' ↓')}
                </th>
              ))}
              <th className="sticky-col-right" style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTrades.length === 0 ? (
              <tr>
                <td colSpan={allColumns.length + 1} className="empty-state">
                  No trades found.
                </td>
              </tr>
            ) : (
              filteredAndSortedTrades.map((trade) => (
                <tr key={trade.id}>
                  {allColumns.map((col) => {
                    let value = trade[col];
                    const baseStyle = { minWidth: getColumnMinWidth(col) };
                    if (col === 'direction') {
                      return (
                        <td
                          key={col}
                          className={value === 'Long' ? 'dir-long' : 'dir-short'}
                          style={{ ...baseStyle, textAlign: 'center' }}
                        >
                          {value || '—'}
                        </td>
                      );
                    }
                    if (col === 'mae' || col === 'mfe' || col === 'pnl') {
                      const displayValue = value !== undefined && value !== '' ? Number(value).toFixed(2) : '—';
                      return (
                        <td key={col} style={baseStyle}>
                          {displayValue}
                        </td>
                      );
                    }
                    if (col === 'date') {
                      return <td key={col} style={baseStyle}>{value || '—'}</td>;
                    }
                    if (col === 'entryTime' || col === 'exitTime') {
                      return <td key={col} style={baseStyle}>{formatTimeWithAMPM(value)}</td>;
                    }
                    if (col === 'tradeId') {
                      return (
                        <td
                          key={col}
                          style={{
                            ...baseStyle,
                            fontFamily: 'var(--mono)',
                            fontSize: '11px',
                            color: 'var(--text-faint)',
                          }}
                        >
                          {value || '—'}
                        </td>
                      );
                    }
                    return <td key={col} style={baseStyle}>{value !== undefined && value !== null ? String(value) : '—'}</td>;
                  })}
                  <td className="sticky-col-right" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => openEditModal(trade)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        marginRight: '12px',
                        fontSize: '16px',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--amber)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(trade.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: '16px',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--loss)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals and Alerts */}
      {/* Modal */}
      {modalOpen && (
        <Portal>
          <div 
            className="modal-overlay" 
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(5, 7, 10, 0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '16px',
            }}
          >
            <div 
              className="modal-content"
              style={{
                width: '100%',
                maxWidth: '560px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'var(--panel-bg, #12161f)',
                border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
                borderRadius: '14px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                padding: '24px',
                color: 'var(--text, #f0f2f5)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-soft, rgba(255,255,255,0.08))' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--disp)', fontSize: '20px', fontWeight: '600', margin: 0, color: 'var(--text)' }}>
                    {editingId ? 'Edit Trade' : 'Add Trade'}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                    {editingId ? 'Update execution details and metrics' : 'Log a new trade execution'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    lineHeight: 1,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'none'; }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Timing Row: Date, Entry Time, Exit Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--text-dim)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                      Date
                    </label>
                    <input 
                      type="date" 
                      name="date" 
                      value={formData.date} 
                      onChange={handleChange} 
                      required 
                      style={{ 
                        width: '100%', 
                        padding: '9px 12px', 
                        background: 'var(--bg-alt, #0d1017)', 
                        border: '1px solid var(--border-soft, rgba(255,255,255,0.1))', 
                        borderRadius: '8px', 
                        color: 'var(--text)', 
                        fontSize: '13px', 
                        fontFamily: 'var(--mono)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--text-dim)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                      Entry Time
                    </label>
                    <input 
                      type="time" 
                      name="entryTime" 
                      value={formData.entryTime} 
                      onChange={handleChange} 
                      required 
                      style={{ 
                        width: '100%', 
                        padding: '9px 10px', 
                        background: 'var(--bg-alt, #0d1017)', 
                        border: '1px solid var(--border-soft, rgba(255,255,255,0.1))', 
                        borderRadius: '8px', 
                        color: 'var(--text)', 
                        fontSize: '13px', 
                        fontFamily: 'var(--mono)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--text-dim)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                      Exit Time
                    </label>
                    <input 
                      type="time" 
                      name="exitTime" 
                      value={formData.exitTime} 
                      onChange={handleChange} 
                      required 
                      style={{ 
                        width: '100%', 
                        padding: '9px 10px', 
                        background: 'var(--bg-alt, #0d1017)', 
                        border: '1px solid var(--border-soft, rgba(255,255,255,0.1))', 
                        borderRadius: '8px', 
                        color: 'var(--text)', 
                        fontSize: '13px', 
                        fontFamily: 'var(--mono)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }} 
                    />
                  </div>
                </div>

                {/* Asset Row: Direction & Symbol */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--text-dim)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                      Direction
                    </label>
                    <select 
                      name="direction" 
                      value={formData.direction} 
                      onChange={handleChange} 
                      style={{ 
                        width: '100%', 
                        padding: '9px 12px', 
                        background: 'var(--bg-alt, #0d1017)', 
                        border: '1px solid var(--border-soft, rgba(255,255,255,0.1))', 
                        borderRadius: '8px', 
                        color: 'var(--text)', 
                        fontSize: '13px', 
                        fontFamily: 'var(--mono)', 
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      {DIRECTIONS.map((dir) => (
                        <option key={dir} value={dir}>{dir}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--text-dim)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                      Symbol
                    </label>
                    <input
                      type="text"
                      name="symbol"
                      value={formData.symbol}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'var(--bg-alt, #0d1017)',
                        border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                        borderRadius: '8px',
                        color: 'var(--text)',
                        fontSize: '13px',
                        fontFamily: 'var(--mono)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      placeholder="e.g., NQ, ES, AAPL"
                    />
                  </div>
                </div>

                {/* Performance Metrics Card: P&L, MAE, MFE */}
                <div style={{
                  padding: '14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-soft, rgba(255,255,255,0.06))',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--amber, #ffb020)' }}>
                    Trade Execution Metrics
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        P&L
                      </label>
                      <input
                        type="number"
                        name="pnl"
                        value={formData.pnl}
                        onChange={handleChange}
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          background: 'var(--bg-alt, #0d1017)',
                          border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                          borderRadius: '6px',
                          color: 'var(--text)',
                          fontSize: '13px',
                          fontFamily: 'var(--mono)',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        MAE
                      </label>
                      <input 
                        type="number" 
                        name="mae" 
                        value={formData.mae} 
                        onChange={handleChange} 
                        step="0.01" 
                        style={{ 
                          width: '100%', 
                          padding: '8px 10px', 
                          background: 'var(--bg-alt, #0d1017)', 
                          border: '1px solid var(--border-soft, rgba(255,255,255,0.1))', 
                          borderRadius: '6px', 
                          color: 'var(--text)', 
                          fontSize: '13px', 
                          fontFamily: 'var(--mono)',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }} 
                        placeholder="0.00" 
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        MFE
                      </label>
                      <input 
                        type="number" 
                        name="mfe" 
                        value={formData.mfe} 
                        onChange={handleChange} 
                        step="0.01" 
                        style={{ 
                          width: '100%', 
                          padding: '8px 10px', 
                          background: 'var(--bg-alt, #0d1017)', 
                          border: '1px solid var(--border-soft, rgba(255,255,255,0.1))', 
                          borderRadius: '6px', 
                          color: 'var(--text)', 
                          fontSize: '13px', 
                          fontFamily: 'var(--mono)',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }} 
                        placeholder="0.00" 
                      />
                    </div>
                  </div>
                </div>

                {/* Custom/Dynamic Columns Section */}
                {dynamicColumns.length > 0 && (
                  <div style={{
                    padding: '14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-soft, rgba(255,255,255,0.06))',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                      Custom Attributes
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: dynamicColumns.length > 1 ? '1fr 1fr' : '1fr', gap: '12px' }}>
                      {dynamicColumns.map(col => {
                        const options = customColumnOptions[col] || [];
                        const useDropdown = options.length <= 10;
                        return (
                          <div key={col}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                              {formatColumnHeader(col)}
                            </label>
                            {useDropdown ? (
                              <>
                                <select
                                  value={customSelectValues[col] || ''}
                                  onChange={(e) => handleCustomSelectChange(col, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    background: 'var(--bg-alt, #0d1017)',
                                    border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                                    borderRadius: '6px',
                                    color: 'var(--text)',
                                    fontSize: '13px',
                                    fontFamily: 'var(--mono)',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                  }}
                                >
                                  <option value="">Select...</option>
                                  {options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                  <option value="__other__">Other…</option>
                                </select>
                                {customSelectValues[col] === '__other__' && (
                                  <input
                                    type="text"
                                    value={customTextValues[col] || ''}
                                    onChange={(e) => handleCustomTextChange(col, e.target.value)}
                                    placeholder={`Enter ${formatColumnHeader(col)}`}
                                    style={{
                                      width: '100%',
                                      padding: '8px 10px',
                                      background: 'var(--bg-alt, #0d1017)',
                                      border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                                      borderRadius: '6px',
                                      color: 'var(--text)',
                                      fontSize: '13px',
                                      fontFamily: 'var(--mono)',
                                      marginTop: '6px',
                                      outline: 'none',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                )}
                              </>
                            ) : (
                              <input
                                type="text"
                                value={customTextValues[col] || ''}
                                onChange={(e) => handleCustomTextChange(col, e.target.value)}
                                placeholder={`Enter ${formatColumnHeader(col)}`}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  background: 'var(--bg-alt, #0d1017)',
                                  border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                                  borderRadius: '6px',
                                  color: 'var(--text)',
                                  fontSize: '13px',
                                  fontFamily: 'var(--mono)',
                                  outline: 'none',
                                  boxSizing: 'border-box'
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-soft, rgba(255,255,255,0.08))' }}>
                  <button 
                    type="button" 
                    onClick={closeModal} 
                    style={{ 
                      padding: '8px 18px', 
                      background: 'transparent', 
                      border: '1px solid var(--border-soft, rgba(255,255,255,0.15))', 
                      borderRadius: '8px', 
                      color: 'var(--text-dim)', 
                      fontSize: '13px', 
                      fontWeight: '500', 
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border-soft, rgba(255,255,255,0.15))'; }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    style={{ 
                      padding: '8px 22px', 
                      background: 'var(--amber, #ffb020)', 
                      border: 'none', 
                      borderRadius: '8px', 
                      color: '#0A0D13', 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(255,176,32,0.3)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,176,32,0.4)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,176,32,0.3)'; }}
                  >
                    {editingId ? 'Update Trade' : 'Add Trade'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Custom Columns Management Modal */}
      {customColumnsModalOpen && (
        <Portal>
          <div 
            className="modal-overlay" 
            onClick={(e) => { if (e.target === e.currentTarget) closeCustomColumnsModal(); }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(5, 7, 10, 0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '16px',
            }}
          >
            <div 
              className="modal-content" 
              style={{ 
                width: '100%',
                maxWidth: '460px', 
                maxHeight: '85vh',
                overflowY: 'auto',
                background: 'var(--panel-bg, #12161f)',
                border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
                borderRadius: '14px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                padding: '24px',
                color: 'var(--text, #f0f2f5)',
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-soft, rgba(255,255,255,0.08))' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--disp)', fontSize: '18px', fontWeight: '600', margin: 0, color: 'var(--text)' }}>
                    Manage Custom Columns
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                    Add, rename, or remove custom trade data attributes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCustomColumnsModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    lineHeight: 1,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'none'; }}
                >
                  ✕
                </button>
              </div>

              {/* Add New Column Input Bar */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="New column name..."
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    background: 'var(--bg-alt, #0d1017)',
                    border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.1))',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontFamily: 'var(--mono)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={handleAddColumn}
                  disabled={loadingCustomColumn || !newColumnName.trim()}
                  style={{
                    padding: '8px 18px',
                    background: loadingCustomColumn || !newColumnName.trim() ? 'rgba(255, 176, 32, 0.3)' : 'var(--amber, #ffb020)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#0A0D13',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: loadingCustomColumn || !newColumnName.trim() ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    if (!loadingCustomColumn && newColumnName.trim()) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,176,32,0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {loadingCustomColumn ? 'Adding...' : 'Add Column'}
                </button>
              </div>

              {/* Existing Columns List */}
              {dynamicColumns.length === 0 ? (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--border-soft, rgba(255, 255, 255, 0.1))',
                  borderRadius: '10px',
                  marginBottom: '20px'
                }}>
                  <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: '13px', margin: 0 }}>
                    No custom columns defined yet.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', marginBottom: '20px', paddingRight: '2px' }}>
                  {dynamicColumns.map(col => (
                    <div 
                      key={col} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        gap: '10px', 
                        padding: '10px 14px', 
                        border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))', 
                        borderRadius: '8px', 
                        background: 'rgba(255, 255, 255, 0.02)',
                        transition: 'background 0.2s',
                      }}
                    >
                      {editingColumn && editingColumn.oldName === col ? (
                        <>
                          <input
                            type="text"
                            value={editingColumn.newName}
                            onChange={handleColumnNameChange}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              background: 'var(--bg-alt, #0d1017)',
                              border: '1px solid var(--amber, #ffb020)',
                              borderRadius: '6px',
                              color: 'var(--text)',
                              fontFamily: 'var(--mono)',
                              fontSize: '13px',
                              outline: 'none',
                            }}
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={handleSaveColumnRename}
                              style={{
                                padding: '5px 12px',
                                background: 'var(--amber, #ffb020)',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#0A0D13',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingColumn(null)}
                              style={{
                                padding: '5px 12px',
                                background: 'transparent',
                                border: '1px solid var(--border-soft, rgba(255,255,255,0.15))',
                                borderRadius: '6px',
                                color: 'var(--text-dim)',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--text)', fontWeight: '500' }}>
                            {formatColumnHeader(col)}
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleEditColumnClick(col)}
                              title="Edit Column Name"
                              style={{ 
                                background: 'rgba(255,255,255,0.04)', 
                                border: '1px solid rgba(255,255,255,0.08)', 
                                borderRadius: '6px',
                                padding: '6px 8px',
                                cursor: 'pointer', 
                                color: 'var(--text-dim)', 
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--amber, #ffb020)';
                                e.currentTarget.style.borderColor = 'rgba(255,176,32,0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--text-dim)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                              }}
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteColumnClick(col)}
                              title="Delete Column"
                              style={{ 
                                background: 'rgba(255,255,255,0.04)', 
                                border: '1px solid rgba(255,255,255,0.08)', 
                                borderRadius: '6px',
                                padding: '6px 8px',
                                cursor: 'pointer', 
                                color: 'var(--text-dim)', 
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--loss, #ff4d4d)';
                                e.currentTarget.style.borderColor = 'rgba(255,77,77,0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--text-dim)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                              }}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-soft, rgba(255,255,255,0.08))' }}>
                <button 
                  onClick={closeCustomColumnsModal} 
                  style={{ 
                    padding: '8px 20px', 
                    background: 'transparent', 
                    border: '1px solid var(--border-soft, rgba(255,255,255,0.15))', 
                    borderRadius: '8px', 
                    color: 'var(--text-dim)', 
                    fontSize: '13px', 
                    fontWeight: '500', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border-soft, rgba(255,255,255,0.15))'; }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <Alert isOpen={confirmAlert.show} title="Confirm Upload" message={`Are you sure you want to add ${confirmAlert.tradesCount} trades to this account?`} type="confirm" confirmText="Upload" cancelText="Cancel" onConfirm={confirmAlert.onConfirm} onCancel={confirmAlert.onCancel} showCancel={true} />
      {loadingUpload && <LoadingOverlay message="Uploading trades..." />}
      {loadingCustomColumn && <LoadingOverlay message="Updating columns..." />}
      <Alert isOpen={successAlert.show} title="Success" message={successAlert.message} type="success" confirmText="OK" onConfirm={() => setSuccessAlert({ show: false, message: '' })} showCancel={false} />
      <Alert isOpen={errorAlert.show} title="Error" message={errorAlert.message} type="error" confirmText="OK" onConfirm={() => setErrorAlert({ show: false, message: '' })} showCancel={false} />
      <Alert isOpen={deleteAlert.show} title="Delete Trade" message="Are you sure you want to delete this trade?" type="confirm" confirmText="Delete" cancelText="Cancel" onConfirm={confirmDelete} onCancel={cancelDelete} showCancel={true}/>
      <Alert isOpen={deleteColumnAlert.show} title="Delete Column" message={`Are you sure you want to delete the column "${deleteColumnAlert.columnName}" from all trades? This cannot be undone.`} type="confirm" confirmText="Delete" cancelText="Cancel" onConfirm={confirmDeleteColumn} onCancel={cancelDeleteColumn} showCancel={true} />
    </div>
  );
}