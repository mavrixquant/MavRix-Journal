// src/components/dashboard/TradeTable.jsx
import { useState, useMemo } from 'react';
import { useStats } from '../../../hooks/useStats';

export default function TradeTable() {
  const { stats } = useStats();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState(1); // 1 = asc, -1 = desc

  const outcomes = stats?.outcomes || [];

  // Filter and sort
  const filteredRows = useMemo(() => {
    let rows = [...outcomes];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(r =>
        (r.notes || '').toLowerCase().includes(q) ||
        (r.setup || '').toLowerCase().includes(q) ||
        (r.factors || '').toLowerCase().includes(q) ||
        (r.date || '').toLowerCase().includes(q) ||
        (r.session || '').toLowerCase().includes(q)
      );
    }
    // Sort
    rows.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
    return rows;
  }, [outcomes, searchQuery, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => -prev);
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  if (outcomes.length === 0) {
    return <div className="empty-state">No trades match current filters.</div>;
  }

  return (
    <div>
      <div className="table-controls">
        <input
          className="search-box"
          placeholder="Search notes, setup, factor, date…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <span className="panel-note mono">{filteredRows.length} trades</span>
      </div>
      <div className="table-wrap">
        <table id="tradeTable">
          <thead>
            <tr>
              <th data-key="date" onClick={() => handleSort('date')}>Date {sortKey === 'date' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th data-key="entry" onClick={() => handleSort('entry')}>Entry {sortKey === 'entry' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th data-key="exit" onClick={() => handleSort('exit')}>Exit {sortKey === 'exit' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th data-key="dir" onClick={() => handleSort('dir')}>Dir {sortKey === 'dir' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th data-key="setup" onClick={() => handleSort('setup')}>Setup {sortKey === 'setup' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th data-key="factors" onClick={() => handleSort('factors')}>Factors {sortKey === 'factors' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th data-key="pcz" onClick={() => handleSort('pcz')}>PCZ {sortKey === 'pcz' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th data-key="vwap" onClick={() => handleSort('vwap')}>VWAP {sortKey === 'vwap' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th data-key="early" onClick={() => handleSort('early')}>Early {sortKey === 'early' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th data-key="session" onClick={() => handleSort('session')}>Session {sortKey === 'session' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th data-key="mae" onClick={() => handleSort('mae')}>MAE {sortKey === 'mae' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th data-key="mfe" onClick={() => handleSort('mfe')}>MFE {sortKey === 'mfe' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th data-key="rAchieved" onClick={() => handleSort('rAchieved')}>R Reach {sortKey === 'rAchieved' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th data-key="result" onClick={() => handleSort('result')}>Outcome {sortKey === 'result' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th data-key="notes" onClick={() => handleSort('notes')}>Notes {sortKey === 'notes' && (sortDir === 1 ? '↑' : '↓')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr><td colSpan="15"><div className="empty-state">No trades match search.</div></td></tr>
            ) : (
              filteredRows.map(r => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{r.entry}</td>
                  <td>{r.exit}</td>
                  <td className={r.dir === 'Long' ? 'dir-long' : 'dir-short'}>{r.dir}</td>
                  <td>{r.setup}</td>
                  <td>{r.factors}</td>
                  <td>{r.pcz}</td>
                  <td>{r.vwap}</td>
                  <td>{r.early}</td>
                  <td>{r.session}</td>
                  <td>{r.mae.toFixed(2)}</td>
                  <td>{r.mfe.toFixed(2)}</td>
                  <td>{r.rAchieved.toFixed(2)}R</td>
                  <td><span className={`tag ${r.result}`}>{r.result.toUpperCase()}</span></td>
                  <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.notes || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}