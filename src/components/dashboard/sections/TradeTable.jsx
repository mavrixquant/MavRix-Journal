// src/components/dashboard/sections/TradeTable.jsx
import { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useStats } from '../../../hooks/useStats';

function formatTimeWithAMPM(timeStr) {
  if (!timeStr) return '—';
  if (/^\d{2}:\d{2}/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  }
  return timeStr;
}

const formatMoney = (v) => {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
};

export default function TradeTable() {
  const { state } = useAppContext();
  const { stats, metric } = useStats();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState(1);

  const isMoney = metric === '$';
  const outcomes = stats?.outcomes || [];
  const dynamicKeys = state.dynamicFilterKeys || [];

  const baseColumns = isMoney
    ? ['date', 'entry', 'exit', 'dir', 'mae', 'mfe', 'score', 'result']
    : ['date', 'entry', 'exit', 'dir', 'mae', 'mfe', 'rAchieved', 'result'];

  const allColumns = [...baseColumns, ...dynamicKeys.filter(key => !baseColumns.includes(key))];

  const filteredRows = useMemo(() => {
    let rows = [...outcomes];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(r => {
        for (const col of baseColumns) {
          const val = r[col];
          if (val !== undefined && val !== null && String(val).toLowerCase().includes(q)) return true;
        }
        for (const key of dynamicKeys) {
          const val = r.dynamic?.[key];
          if (val !== undefined && val !== null && String(val).toLowerCase().includes(q)) return true;
        }
        if (r.notes && r.notes.toLowerCase().includes(q)) return true;
        return false;
      });
    }
    rows.sort((a, b) => {
      let va, vb;
      if (dynamicKeys.includes(sortKey)) {
        va = a.dynamic?.[sortKey] || '';
        vb = b.dynamic?.[sortKey] || '';
      } else {
        va = a[sortKey];
        vb = b[sortKey];
      }
      if (sortKey === 'date') { va = new Date(va); vb = new Date(vb); }
      else if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
    return rows;
  }, [outcomes, searchQuery, sortKey, sortDir, dynamicKeys, baseColumns]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(prev => -prev);
    else { setSortKey(key); setSortDir(1); }
  };

  if (outcomes.length === 0) {
    return <div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '20px' }}>No data</div>;
  }

  const getValue = (row, col) => dynamicKeys.includes(col) ? row.dynamic?.[col] : row[col];

  const renderCell = (row, col) => {
    const val = getValue(row, col);
    if (val === undefined || val === null) return '—';
    switch (col) {
      case 'date': return val || '—';
      case 'entry':
      case 'exit': return formatTimeWithAMPM(val);
      case 'mae':
      case 'mfe': return Number(val).toFixed(2);
      case 'rAchieved': return Number(val).toFixed(2) + 'R';
      case 'score': return formatMoney(val);
      case 'result': return <span className={`tag ${val}`}>{String(val).toUpperCase()}</span>;
      case 'dir': return <span className={val === 'Long' ? 'dir-long' : 'dir-short'}>{val}</span>;
      default: return String(val);
    }
  };

  const colLabel = (col) => {
    if (col === 'dir') return 'Dir';
    if (col === 'rAchieved') return 'R Reach';
    if (col === 'score') return 'Net P&L';
    if (col === 'result') return 'Outcome';
    return col;
  };

  return (
    <div>
      <div className="table-controls">
        <input className="search-box" placeholder="Search trades…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <span className="panel-note mono">{filteredRows.length} trades</span>
      </div>
      <div className="table-wrap" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              {allColumns.map(col => (
                <th key={col} onClick={() => handleSort(col)} style={{ cursor: 'pointer' }}>
                  {colLabel(col)}
                  {sortKey === col && (sortDir === 1 ? ' ↑' : ' ↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr key={row.id || idx}>
                {allColumns.map(col => <td key={col}>{renderCell(row, col)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}