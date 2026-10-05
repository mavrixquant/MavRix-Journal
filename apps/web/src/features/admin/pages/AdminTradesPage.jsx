// apps/web/src/features/admin/pages/AdminTradesPage.jsx
//
// Cross-user trades. Filters: search (symbol/notes/tradeId), account, user, date range.
// Row actions: Delete single.

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAdminTrades, useAdminDeleteTrade } from '../api';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 50;

const CSS = `
  .atp-root { display: flex; flex-direction: column; gap: 18px; }

  .atp-bar {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .atp-search { position: relative; flex: 1; min-width: 220px; }
  .atp-search input {
    width: 100%; padding: 9px 12px 9px 34px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px; outline: none; box-sizing: border-box;
  }
  .atp-search input:focus { border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,.15); }
  .atp-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%); color: #545E6E; pointer-events: none;
  }
  .atp-input {
    padding: 9px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    outline: none;
    box-sizing: border-box;
    color-scheme: dark;
  }
  .atp-input:focus { border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,.15); }
  .atp-input.sm { width: 130px; }
  .atp-input.md { width: 180px; }

  .atp-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .atp-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11.5px; }
  .atp-th {
    padding: 10px 12px; text-align: left;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #8892A3; background: rgba(0,0,0,.2);
    border-bottom: 1px solid rgba(255,255,255,.08);
    white-space: nowrap;
  }
  .atp-th.right { text-align: right; }
  .atp-tr { transition: background-color .12s; }
  .atp-tr:hover { background: rgba(255,255,255,.025); }
  .atp-td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,.04);
    color: #E7E9EE;
    vertical-align: middle;
    white-space: nowrap;
  }
  .atp-td.muted { color: #8892A3; }
  .atp-td.right { text-align: right; }
  .atp-td.pos { color: #35C4A1; font-weight: 700; }
  .atp-td.neg { color: #ef4444; font-weight: 700; }
  .atp-td.notes {
    white-space: nowrap;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .atp-dir-long  { color: #35C4A1; font-weight: 600; }
  .atp-dir-short { color: #ef4444; font-weight: 600; }
  .atp-link {
    color: #F59E0B; text-decoration: none; font-weight: 600;
  }
  .atp-link:hover { color: #FDE68A; text-decoration: underline; }

  .atp-btn-icon {
    width: 26px; height: 26px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025);
    color: #8892A3; cursor: pointer;
    transition: all .18s;
  }
  .atp-btn-icon.danger:hover:not(:disabled) {
    color: #f87171;
    border-color: rgba(239,68,68,.42);
    background: rgba(239,68,68,.08);
  }
  .atp-btn-icon:disabled { opacity: .35; cursor: not-allowed; }

  .atp-empty, .atp-loading {
    padding: 60px 24px; text-align: center;
    color: #545E6E; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }
`;

function fmtMoney(v) {
  const n = Number(v) || 0;
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export default function AdminTradesPage() {
  const [q, setQ] = useState('');
  const [accountId, setAccountId] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      q: q.trim(),
      accountId: accountId.trim(),
      userId: userId.trim(),
      from,
      to,
      page,
      limit: PAGE_SIZE,
    }),
    [q, accountId, userId, from, to, page]
  );

  const { data, isLoading } = useAdminTrades(filters);
  const trades = data?.trades || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const deleteTrade = useAdminDeleteTrade();

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete trade "${t.tradeId}"?`)) return;
    try {
      await deleteTrade.mutateAsync(t.id);
      toast.success('Trade deleted');
    } catch (err) {
      toast.error(err?.message || 'Delete failed');
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="atp-root">
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">Manage</span>
            <h1 className="admin-ph-title">Trades</h1>
            <p className="admin-ph-sub">
              {total} trade{total === 1 ? '' : 's'} across every account
            </p>
          </div>
        </div>

        <div className="atp-bar">
          <div className="atp-search">
            <Search size={14} className="atp-search-icon" />
            <input
              placeholder="Search by symbol, notes, or tradeId…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <input
            className="atp-input md"
            placeholder="Account ID"
            value={accountId}
            onChange={(e) => { setAccountId(e.target.value); setPage(1); }}
          />
          <input
            className="atp-input md"
            placeholder="User ID"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setPage(1); }}
          />
          <input
            type="date"
            className="atp-input sm"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            title="From date"
          />
          <input
            type="date"
            className="atp-input sm"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            title="To date"
          />
        </div>

        <div className="atp-card">
          {isLoading ? (
            <div className="atp-loading">Loading trades…</div>
          ) : trades.length === 0 ? (
            <div className="atp-empty">No trades match.</div>
          ) : (
            <table className="atp-table">
              <thead>
                <tr>
                  <th className="atp-th">Date</th>
                  <th className="atp-th">Entry–Exit</th>
                  <th className="atp-th">Dir</th>
                  <th className="atp-th">Symbol</th>
                  <th className="atp-th">Account</th>
                  <th className="atp-th">Owner</th>
                  <th className="atp-th right">P&amp;L</th>
                  <th className="atp-th right">Qty</th>
                  <th className="atp-th">Notes</th>
                  <th className="atp-th right"></th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => {
                  const pnl = Number(t.pnl) || 0;
                  const pnlCls = pnl > 0 ? 'pos' : pnl < 0 ? 'neg' : 'muted';
                  const dirCls = t.direction === 'Long' ? 'atp-dir-long' : 'atp-dir-short';
                  return (
                    <tr key={t.id} className="atp-tr">
                      <td className="atp-td">{t.date}</td>
                      <td className="atp-td muted">{t.entryTime}–{t.exitTime}</td>
                      <td className={`atp-td ${dirCls}`}>{t.direction}</td>
                      <td className="atp-td">{t.symbol || '—'}</td>
                      <td className="atp-td">
                        <span className="muted" style={{ fontSize: 11 }}>
                          {t.account?.name || '—'}
                        </span>
                      </td>
                      <td className="atp-td">
                        {t.account?.user ? (
                          <Link to={`/admin/users/${t.account.user.id}`} className="atp-link">
                            {t.account.user.email}
                          </Link>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className={`atp-td right ${pnlCls}`}>{fmtMoney(pnl)}</td>
                      <td className="atp-td right muted">{t.quantity ?? '—'}</td>
                      <td className="atp-td notes muted" title={t.notes}>
                        {t.notes || '—'}
                      </td>
                      <td className="atp-td right">
                        <button
                          type="button"
                          className="atp-btn-icon danger"
                          title="Delete trade"
                          onClick={() => handleDelete(t)}
                          disabled={deleteTrade.isPending}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <Pagination page={page} pages={pages} total={total} onChange={setPage} />
      </div>
    </>
  );
}