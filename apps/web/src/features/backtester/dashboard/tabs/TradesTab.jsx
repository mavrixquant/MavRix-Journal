import { useMemo, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteBacktestTrade } from '@/shared/api/backtestSessions';
import { fmtNum, fmtR, fmtSigned, toneOf } from '../../lib/format';
import { isClosed, netOf, rOf } from '../../lib/sessionStats';
import { isPending, orderLabel } from '../../lib/orders';
import { toJournalTrade } from '../../lib/toJournalTrade';

const COLS = [
  { k: 'n', label: '#', sort: (r) => r.idx },
  { k: 'symbol', label: 'Symbol', sort: (r) => r.t.symbol },
  { k: 'side', label: 'Side', sort: (r) => r.t.side },
  { k: 'entry', label: 'Entry', sort: (r) => +new Date(r.t.entryTime) },
  { k: 'exit', label: 'Exit', sort: (r) => (r.t.exitTime ? +new Date(r.t.exitTime) : Infinity) },
  { k: 'qty', label: 'Qty', sort: (r) => r.t.quantity, num: true },
  { k: 'ep', label: 'Entry px', sort: (r) => r.t.entryPrice, num: true },
  { k: 'xp', label: 'Exit px', sort: (r) => r.t.exitPrice ?? Infinity, num: true },
  { k: 'net', label: 'Net P&L', sort: (r) => r.net ?? -Infinity, num: true },
  { k: 'r', label: 'R', sort: (r) => r.r ?? -Infinity, num: true },
  { k: 'why', label: 'Exit', sort: (r) => r.t.exitReason || '' },
];

const REASON = { manual: 'Manual', sl: 'Stop', tp: 'Target', prop_breach: 'Prop breach', conclude: 'Concluded' };

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function TradesTab({ session, trades, tz }) {
  const del = useDeleteBacktestTrade(session.id);
  const [symbol, setSymbol] = useState('all');
  const [side, setSide] = useState('all');
  const [result, setResult] = useState('all');
  const [sort, setSort] = useState({ k: 'entry', dir: -1 });
  const cur = session.currency;
  const writable = session.status === 'active';

  const rows = useMemo(() => {
    const ordered = [...trades].sort((a, b) => +new Date(a.entryTime) - +new Date(b.entryTime));
    return ordered.map((t, i) => ({
      t, idx: i + 1, j: toJournalTrade(t, tz),
      net: isClosed(t) ? netOf(t) : null,
      r: isClosed(t) ? rOf(t) : null,
    }));
  }, [trades, tz]);

  const filtered = useMemo(() => {
    const col = COLS.find((c) => c.k === sort.k) || COLS[3];
    return rows
      .filter((r) => (symbol === 'all' || r.t.symbol === symbol)
        && (side === 'all' || r.t.side === side)
        && (result === 'all'
          || (result === 'open' && r.net == null && !isPending(r.t))
          || (result === 'pending' && isPending(r.t))
          || (result === 'win' && r.net != null && r.net > 0)
          || (result === 'loss' && r.net != null && r.net < 0)))
      .sort((a, b) => {
        const x = col.sort(a); const y = col.sort(b);
        return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
      });
  }, [rows, symbol, side, result, sort]);

  const exportCsv = () => {
    const head = ['tradeId', 'symbol', 'direction', 'date', 'entryTime', 'exitDate', 'exitTime', 'quantity', 'entryPrice', 'exitPrice', 'stopLoss', 'takeProfit', 'pnl', 'commission', 'net', 'r', 'exitReason', 'notes'];
    const lines = [head.join(',')];
    for (const r of filtered) {
      const j = r.j;
      lines.push([
        j.tradeId, j.symbol, j.direction, j.date, j.entryTime, j.exitDate, j.exitTime, j.quantity,
        j.entryPrice, j.exitPrice, j.stopLoss, j.takeProfit, j.pnl, j.commission,
        r.net, r.r == null ? '' : r.r.toFixed(3), j.exitReason, j.notes,
      ].map(csvEscape).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.name.replace(/[^a-z0-9]+/gi, '_')}_trades.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (t) => {
    if (!window.confirm('Delete this trade? This changes every statistic for the session.')) return;
    try { await del.mutateAsync(t.tradeId); toast.success('Trade deleted'); } catch (e) { toast.error(e?.message || 'Could not delete.'); }
  };

  const symbols = session.instruments;

  return (
    <div className="bt-trades">
      <div className="bt-toolbar">
        <select className="bt-input is-sm" value={symbol} onChange={(e) => setSymbol(e.target.value)} aria-label="Symbol">
          <option value="all">All symbols</option>
          {symbols.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="bt-input is-sm" value={side} onChange={(e) => setSide(e.target.value)} aria-label="Side">
          <option value="all">Long &amp; short</option><option value="long">Long</option><option value="short">Short</option>
        </select>
        <select className="bt-input is-sm" value={result} onChange={(e) => setResult(e.target.value)} aria-label="Result">
          <option value="all">All results</option><option value="win">Winners</option><option value="loss">Losers</option><option value="open">Open</option><option value="pending">Pending</option>
        </select>
        <span className="bt-grow" />
        <span className="bt-count">{filtered.length} of {rows.length}</span>
        <button type="button" className="bt-btn" onClick={exportCsv} disabled={!filtered.length}><Download size={13} /> CSV</button>
      </div>

      {rows.length === 0 ? (
        <div className="bt-empty is-inline"><b>No trades yet</b><p>Place trades in the replay chart and they will show up here.</p></div>
      ) : (
        <div className="bt-tablewrap">
          <table className="bt-table">
            <thead>
              <tr>
                {COLS.map((c) => (
                  <th key={c.k} className={c.num ? 'num' : ''}
                    aria-sort={sort.k === c.k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => setSort((s) => (s.k === c.k ? { k: c.k, dir: -s.dir } : { k: c.k, dir: 1 }))}>
                      {c.label}{sort.k === c.k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                    </button>
                  </th>
                ))}
                <th>Strategy</th>
                {writable && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.t.tradeId} title={r.t.notes || undefined}>
                  <td className="num">{r.idx}</td>
                  <td><b>{r.t.symbol}</b></td>
                  <td><span className={`rp-side-tag ${r.t.side === 'short' ? 'is-short' : 'is-long'}`}>{r.t.side === 'short' ? 'SHORT' : 'LONG'}</span></td>
                  <td>{r.j.date} <em>{r.j.entryTime}</em></td>
                  <td>{r.t.exitTime ? <>{r.j.exitDate} <em>{r.j.exitTime}</em></> : isPending(r.t) ? <span className="bt-open">{orderLabel(r.t.side, r.t.orderType)}</span> : <span className="bt-open">open</span>}</td>
                  <td className="num">{r.t.quantity}</td>
                  <td className="num">{fmtNum(r.t.entryPrice)}</td>
                  <td className="num">{r.t.exitPrice != null ? fmtNum(r.t.exitPrice) : '—'}</td>
                  <td className={`num ${r.net == null ? '' : toneOf(r.net)}`}><b>{r.net == null ? '—' : fmtSigned(r.net, cur)}</b></td>
                  <td className={`num ${r.r == null ? '' : toneOf(r.r)}`}>{r.r == null ? '—' : fmtR(r.r)}</td>
                  <td>{REASON[r.t.exitReason] || (r.t.exitTime ? '—' : '')}</td>
                  <td>{r.t.strategy ? <span className="bt-strat"><i style={{ background: r.t.strategy.color }} />{r.t.strategy.name}</span> : '—'}</td>
                  {writable && (
                    <td><button type="button" className="bt-icon-btn is-danger" onClick={() => remove(r.t)} disabled={del.isPending} aria-label="Delete trade"><Trash2 size={13} /></button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
