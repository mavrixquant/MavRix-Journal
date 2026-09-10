// src/components/dashboard/sections/SymbolBreakdownTable.jsx
import { useState, useMemo } from 'react';
import { useStats } from '../../../hooks/useStats';
import { FaSortAmountUp, FaSortAmountDown } from 'react-icons/fa';

const COLORS = {
  win: '#35C4A1',
  loss: '#FF5C5C',
  text: '#8892A3',
  textMuted: '#545E6E',
  textLight: '#E7E9EE',
  grid: '#1A2029',
  rowBorder: 'rgba(255, 255, 255, 0.04)',
};

const formatMoney = (v) => {
  if (v == null || Number.isNaN(v)) return '—';
  const sign = v < 0 ? '-' : '+';
  return `${sign}$${Math.abs(v).toFixed(2)}`;
};
const formatPct = (v) => (v != null && !Number.isNaN(v) ? `${v.toFixed(1)}%` : '—');

export default function SymbolBreakdownTable() {
  const { symbolBreakdown } = useStats();
  const [sortKey, setSortKey] = useState('total');
  const [sortDir, setSortDir] = useState(-1);  // desc by default

  const sorted = useMemo(() => {
    if (!symbolBreakdown || symbolBreakdown.length === 0) return [];
    const copy = [...symbolBreakdown];
    copy.sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      if (typeof va === 'string') return va.localeCompare(vb) * sortDir;
      return (va - vb) * sortDir;
    });
    return copy;
  }, [symbolBreakdown, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(prev => -prev);
    else { setSortKey(key); setSortDir(-1); }
  };

  if (!symbolBreakdown || symbolBreakdown.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '200px', color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '12px', border: `1px dashed ${COLORS.grid}`, borderRadius: '10px',
        background: 'rgba(17, 21, 31, 0.4)',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '8px', opacity: 0.6 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
        <span>No symbol data available</span>
      </div>
    );
  }

  const headers = [
    { key: 'symbol',       label: 'Symbol',   align: 'left',   width: '22%' },
    { key: 'n',            label: 'Trades',   align: 'right',  width: '12%' },
    { key: 'winRate',      label: 'Win %',    align: 'right',  width: '14%' },
    { key: 'total',        label: 'Net P&L',  align: 'right',  width: '20%' },
    { key: 'avgWin',       label: 'Avg Win',  align: 'right',  width: '16%' },
    { key: 'avgLoss',      label: 'Avg Loss', align: 'right',  width: '16%' },
  ];

  return (
    <div style={{ width: '100%' }}>
      <div style={{ maxHeight: '320px', overflowY: 'auto', border: `1px solid ${COLORS.grid}`, borderRadius: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: '#11151F', zIndex: 1 }}>
              {headers.map(h => (
                <th
                  key={h.key}
                  onClick={() => handleSort(h.key)}
                  style={{
                    padding: '10px 12px',
                    textAlign: h.align,
                    fontSize: '10.5px',
                    fontWeight: '700',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: sortKey === h.key ? '#FFB020' : COLORS.text,
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    width: h.width,
                    borderBottom: `1px solid ${COLORS.grid}`,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {h.label}
                    {sortKey === h.key && (sortDir === 1
                      ? <FaSortAmountUp style={{ fontSize: '9px' }} />
                      : <FaSortAmountDown style={{ fontSize: '9px' }} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.symbol} style={{ borderBottom: `1px solid ${COLORS.rowBorder}` }}>
                <td style={{ padding: '9px 12px', fontWeight: '600', color: COLORS.textLight }}>{row.symbol}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: COLORS.text }}>{row.n}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: row.winRate >= 50 ? COLORS.win : COLORS.loss }}>{formatPct(row.winRate)}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontWeight: '700', color: row.total >= 0 ? COLORS.win : COLORS.loss }}>{formatMoney(row.total)}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: COLORS.win }}>{formatMoney(row.avgWin)}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: COLORS.loss }}>{formatMoney(row.avgLoss)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}