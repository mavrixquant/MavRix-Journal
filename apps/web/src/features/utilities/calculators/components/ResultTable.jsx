import { useState } from 'react';
import { Clipboard, ClipboardCheck } from 'lucide-react';
import { formatValue, rawValue } from '../lib/format.js';
import { copyToClipboard } from './ResultTile';

export default function ResultTable({ title, columns, rows }) {
  const [done, setDone] = useState(false);

  const copy = async () => {
    const head = columns.map((c) => c.label).join('\t');
    const body = rows
      .map((r) => columns.map((c) => rawValue(r[c.key], c.kind === 'text' ? 'text' : c.kind, c.decimals)).join('\t'))
      .join('\n');
    if (await copyToClipboard(`${head}\n${body}`, 'Table copied')) {
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    }
  };

  return (
    <div className="cx-table-wrap">
      <div className="cx-table-head">
        <span className="cx-ptitle" style={{ fontSize: 12 }}>{title}</span>
        <div className="cx-pactions">
          <button type="button" className={`cx-btn${done ? ' is-copied' : ''}`} onClick={copy}>
            {done ? <ClipboardCheck size={11} /> : <Clipboard size={11} />} {done ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <div className="cx-table-scroll">
        <table className="cx-table">
          <thead>
            <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.highlight ? 'is-hl' : ''}>
                {columns.map((c) => {
                  const v = r[c.key];
                  const cls = c.auto && typeof v === 'number' && v !== 0 ? (v > 0 ? 'cx-pos' : 'cx-neg') : '';
                  return <td key={c.key} className={cls}>{formatValue(v, c.kind, c.decimals)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
