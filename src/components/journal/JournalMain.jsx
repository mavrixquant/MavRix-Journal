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
const DEFAULT_COLUMNS = ['tradeId', 'date', 'entryTime', 'exitTime', 'direction', 'mae', 'mfe'];
const TEMPLATE_HEADERS = ['Date', 'Entry Time', 'Exit Time', 'Direction', 'MAE', 'MFE'];
const SAMPLE_TRADE = {
  'Date': '2026-09-07',
  'Entry Time': '09:30',
  'Exit Time': '10:15',
  'Direction': 'Long',
  'MAE': 8.20,
  'MFE': 15.40,
};



const getColumnMinWidth = (col) => {
  switch (col) {
    case 'tradeId': return '100px';
    case 'date': return '80px';
    case 'entryTime': return '80px';
    case 'exitTime': return '80px';
    case 'direction': return '70px';
    case 'mae': return '70px';
    case 'mfe': return '70px';
    default: return '120px'; // dynamic columns
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
    mae: '',
    mfe: '',
  });
  const fileInputRef = useRef(null);

  const [confirmAlert, setConfirmAlert] = useState({ show: false, tradesCount: 0, onConfirm: null, onCancel: null });
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [successAlert, setSuccessAlert] = useState({ show: false, message: '' });
  const [errorAlert, setErrorAlert] = useState({ show: false, message: '' });
  const [deleteAlert, setDeleteAlert] = useState({ show: false, tradeId: null });

  const [customColumnsModalOpen, setCustomColumnsModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null); // { oldName, newName }
  const [deleteColumnAlert, setDeleteColumnAlert] = useState({ show: false, columnName: '' });
  const [loadingCustomColumn, setLoadingCustomColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

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

  const allColumns = [...DEFAULT_COLUMNS, ...dynamicColumns];

  const handleAccountChange = (e) => {
    setSelectedAccountId(e.target.value);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ date: '', entryTime: '', exitTime: '', direction: 'Long', mae: '', mfe: '' });
    setModalOpen(true);
  };

  const openEditModal = (trade) => {
    setEditingId(trade.id);
    setFormData({
      date: trade.date || '',
      entryTime: trade.entryTime || '',
      exitTime: trade.exitTime || '',
      direction: trade.direction || 'Long',
      mae: trade.mae || '',
      mfe: trade.mfe || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { date, entryTime, exitTime, direction, mae, mfe } = formData;
    if (!date || !entryTime || !exitTime) return;

    const tradeData = { date, entryTime, exitTime, direction, mae: Number(mae) || 0, mfe: Number(mfe) || 0 };

    // Check for duplicates using the new trade object
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
  // Use the state variable `trades` (already defined via useState)
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
    // Prevent renaming to a default column or existing column
    if (DEFAULT_COLUMNS.includes(trimmedNewName) || dynamicColumns.includes(trimmedNewName) && trimmedNewName !== oldName) {
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
          else if (trimmed === 'MAE') headerMap[trimmed] = 'mae';
          else if (trimmed === 'MFE') headerMap[trimmed] = 'mfe';
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

        // Check for duplicate trade IDs before showing confirmation
        const duplicates = checkDuplicateTradeIds(tradesData); // pass the parsed array
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
          <button className="btn-upload" onClick={openCreateModal} style={{ borderStyle: 'solid', padding: '8px 14px' }}>
            + Add Trade
          </button>
          <button className="btn-upload" onClick={handleDownloadTemplate} style={{ borderStyle: 'solid', padding: '8px 14px' }}>
            <FaDownload style={{ marginRight: '6px' }} /> Template
          </button>
          <label className="btn-upload" style={{ borderStyle: 'solid', padding: '8px 14px', cursor: 'pointer' }}>
            ⇪ Upload XLSX
            <input type="file" ref={fileInputRef} accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Table Wrapper */}
      <div className="table-wrap" style={{
        width: '100%',
        overflow: 'auto',
        flex: 1,
        minHeight: 0,
        minWidth: 0
      }}>
        <table style={{ width: '100%', minWidth: 'auto', tableLayout: 'auto' }}>
          {/* 
            Column widths:
            - Default columns: fixed percentages to keep them compact.
            - Dynamic columns: auto width with min-width, so they get remaining space.
            - Actions: fixed width.
            If dynamic columns exceed available space, horizontal scroll appears.
          */}
          <thead>
            <tr>
              {allColumns.map((col) => (
                <th key={col} style={{ textAlign: col === 'direction' ? 'center' : 'left', minWidth: getColumnMinWidth(col), }} >
                  {formatColumnHeader(col)}
                </th>
              ))}
              <th className="sticky-col-right" style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={allColumns.length + 1} className="empty-state">
                  No trades for this account yet.
                </td>
              </tr>
            ) : (
              trades.map((trade) => (
                <tr key={trade.id}>
                  {allColumns.map((col) => {
                    let value = trade[col];
                    const baseStyle = {
                      minWidth: getColumnMinWidth(col),
                    };
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
                    if (col === 'mae' || col === 'mfe') {
                      return (
                        <td key={col} style={baseStyle}>
                          {value !== undefined ? Number(value).toFixed(2) : '—'}
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

      {/* Modal and Alerts – unchanged */}
      {modalOpen && (
        <Portal>
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
            <div className="modal-content">
              <h2 style={{ fontFamily: 'var(--disp)', marginBottom: '16px' }}>
                {editingId ? 'Edit Trade' : 'Add Trade'}
              </h2>
              <form onSubmit={handleSubmit}>
                {/* form fields – unchanged for brevity */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-dim)' }}>Date</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} required style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-alt)', border: '1px solid var(--border-soft)', borderRadius: '6px', color: 'var(--text)', fontSize: '14px', fontFamily: 'var(--mono)' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-dim)' }}>Entry Time</label>
                  <input type="time" name="entryTime" value={formData.entryTime} onChange={handleChange} required style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-alt)', border: '1px solid var(--border-soft)', borderRadius: '6px', color: 'var(--text)', fontSize: '14px', fontFamily: 'var(--mono)' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-dim)' }}>Exit Time</label>
                  <input type="time" name="exitTime" value={formData.exitTime} onChange={handleChange} required style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-alt)', border: '1px solid var(--border-soft)', borderRadius: '6px', color: 'var(--text)', fontSize: '14px', fontFamily: 'var(--mono)' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-dim)' }}>Direction</label>
                  <select name="direction" value={formData.direction} onChange={handleChange} style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-alt)', border: '1px solid var(--border-soft)', borderRadius: '6px', color: 'var(--text)', fontSize: '14px', fontFamily: 'var(--mono)', cursor: 'pointer' }}>
                    {DIRECTIONS.map((dir) => (<option key={dir} value={dir}>{dir}</option>))}
                  </select>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-dim)' }}>MAE</label>
                  <input type="number" name="mae" value={formData.mae} onChange={handleChange} step="0.01" style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-alt)', border: '1px solid var(--border-soft)', borderRadius: '6px', color: 'var(--text)', fontSize: '14px', fontFamily: 'var(--mono)' }} placeholder="0.00" />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-dim)' }}>MFE</label>
                  <input type="number" name="mfe" value={formData.mfe} onChange={handleChange} step="0.01" style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-alt)', border: '1px solid var(--border-soft)', borderRadius: '6px', color: 'var(--text)', fontSize: '14px', fontFamily: 'var(--mono)' }} placeholder="0.00" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" onClick={closeModal} className="btn-upload" style={{ borderStyle: 'solid', padding: '6px 16px' }}>Cancel</button>
                  <button type="submit" className="btn-upload" style={{ borderStyle: 'solid', borderColor: 'var(--amber)', color: 'var(--amber)', padding: '6px 16px' }}>{editingId ? 'Update' : 'Add'}</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {customColumnsModalOpen && (
        <Portal>
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeCustomColumnsModal(); }}>
            <div className="modal-content" style={{ maxWidth: '420px' }}>
              <h2 style={{ fontFamily: 'var(--disp)', marginBottom: '16px' }}>Manage Custom Columns</h2>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="New column name"
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: 'var(--panel)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                    fontFamily: 'var(--mono)',
                    fontSize: '13px',
                  }}
                />
                <button
                  onClick={handleAddColumn}
                  className="btn-upload"
                  style={{ borderStyle: 'solid', padding: '4px 10px', fontSize: '11px' }}
                  disabled={loadingCustomColumn}
                >
                  Add
                </button>
              </div>
              {dynamicColumns.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: '13px' }}>
                  No custom columns found.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                  {dynamicColumns.map(col => (
                    <div key={col} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px', border: '1px solid var(--border-soft)', borderRadius: '6px', background: 'var(--bg-alt)' }}>
                      {editingColumn && editingColumn.oldName === col ? (
                        <>
                          <input
                            type="text"
                            value={editingColumn.newName}
                            onChange={handleColumnNameChange}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              background: 'var(--panel)',
                              border: '1px solid var(--border-soft)',
                              borderRadius: '4px',
                              color: 'var(--text)',
                              fontFamily: 'var(--mono)',
                              fontSize: '13px',
                            }}
                            autoFocus
                          />
                          <button
                            onClick={handleSaveColumnRename}
                            className="btn-upload"
                            style={{ borderStyle: 'solid', padding: '4px 10px', fontSize: '11px' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingColumn(null)}
                            className="btn-upload"
                            style={{ borderStyle: 'solid', padding: '4px 10px', fontSize: '11px' }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--text)' }}>{formatColumnHeader(col)}</span>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={() => handleEditColumnClick(col)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '14px' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--amber)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteColumnClick(col)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '14px' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--loss)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button onClick={closeCustomColumnsModal} className="btn-upload" style={{ borderStyle: 'solid', padding: '6px 16px' }}>
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