import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { fmtDuration } from './Card';

const PAGE = 25;

const COLS = [
  { id: 'date', label: 'Date', get: (o) => `${o.date} ${String(o.entryMinutes ?? 0).padStart(4, '0')}` },
  { id: 'entry', label: 'Entry', get: (o) => o.entryMinutes ?? 0 },
  { id: 'symbol', label: 'Symbol', get: (o) => o.symbol },
  { id: 'dir', label: 'Side', get: (o) => o.dir },
  { id: 'session', label: 'Session', get: (o) => o.session },
  { id: 'strategy', label: 'Strategy', get: (o) => o.__strategy },
  { id: 'duration', label: 'Hold', get: (o) => o.durationMinutes ?? 0, right: true },
  { id: 'score', label: 'Result', get: (o) => o.score, right: true },
];

export default function TradesTable({ outcomes, fmt, strategyName }) {
  const [sort, setSort] = useState({ id: 'date', dir: -1 });
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = outcomes.map((o) => ({ ...o, __strategy: strategyName(o) || '' }));
    if (q) {
      list = list.filter((o) =>
        [o.symbol, o.dir, o.session, o.__strategy, o.notes, o.date]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }
    const col = COLS.find((c) => c.id === sort.id) || COLS[0];
    return list.sort((a, b) => {
      const av = col.get(a);
      const bv = col.get(b);
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * sort.dir;
    });
  }, [outcomes, query, sort, strategyName]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = rows.slice(cur * PAGE, cur * PAGE + PAGE);

  const toggle = (id) => {
    setSort((s) => (s.id === id ? { id, dir: -s.dir } : { id, dir: id === 'date' ? -1 : 1 }));
    setPage(0);
  };

  return (
    <div className="ax-trades">
      <div className="ax-trades-bar">
        <label className="ax-search">
          <Search size={13} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search symbol, strategy, session, notes"
            aria-label="Search trades"
          />
        </label>
        <span className="ax-trades-count">
          {rows.length} {rows.length === 1 ? 'trade' : 'trades'}
        </span>
      </div>

      <div className="ax-table-wrap">
        <table className="ax-table">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.id}
                  className={c.right ? 'ax-r' : ''}
                  aria-sort={sort.id === c.id ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" onClick={() => toggle(c.id)}>
                    {c.label}
                    {sort.id === c.id && <span aria-hidden="true">{sort.dir === 1 ? ' \u25B4' : ' \u25BE'}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((o, i) => (
              <tr key={`${o.id}-${i}`}>
                <td>{o.date}</td>
                <td>{o.entry || '-'}</td>
                <td>{o.symbol}</td>
                <td>{o.dir}</td>
                <td>{o.session}</td>
                <td>{o.__strategy || '-'}</td>
                <td className="ax-r">{fmtDuration(o.durationMinutes)}</td>
                <td className={`ax-r ${o.score > 0 ? 'pos' : o.score < 0 ? 'neg' : ''}`}>
                  {fmt(o.score)}
                </td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="ax-table-empty">No trades match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ax-pager">
        <button type="button" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Previous</button>
        <span>Page {cur + 1} of {pages}</span>
        <button type="button" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next</button>
      </div>
    </div>
  );
}
