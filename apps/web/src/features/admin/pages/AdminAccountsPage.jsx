// apps/web/src/features/admin/pages/AdminAccountsPage.jsx
//
// Cross-user accounts. Filters: search by name, type segment.
// Row actions: View user, Delete (superadmin only).

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Wallet, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import { useAdminAccounts, useAdminDeleteAccount } from '../api';
import Pagination from '../components/Pagination';
import ConfirmDangerModal from '../components/ConfirmDangerModal';

const PAGE_SIZE = 25;

const CSS = `
  .aap-root { display: flex; flex-direction: column; gap: 18px; }

  .aap-bar {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .aap-search { position: relative; flex: 1; min-width: 220px; }
  .aap-search input {
    width: 100%; padding: 9px 12px 9px 34px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px; outline: none; box-sizing: border-box;
  }
  .aap-search input:focus { border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,.15); }
  .aap-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%); color: #545E6E; pointer-events: none;
  }

  .aap-seg {
    display: inline-flex; padding: 3px; gap: 2px;
    background: rgba(0,0,0,.32);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 10px;
  }
  .aap-seg-btn {
    padding: 6px 12px; border-radius: 7px; border: none;
    background: transparent; color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 600;
    cursor: pointer; transition: all .18s;
  }
  .aap-seg-btn:hover { color: #E7E9EE; background: rgba(255,255,255,.04); }
  .aap-seg-btn.is-active {
    background: linear-gradient(135deg, #F59E0B, #FDE68A);
    color: #0D1117; font-weight: 700;
  }

  .aap-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .aap-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12px; }
  .aap-th {
    padding: 11px 14px; text-align: left;
    font-size: 10px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #8892A3; background: rgba(0,0,0,.2);
    border-bottom: 1px solid rgba(255,255,255,.08);
    white-space: nowrap;
  }
  .aap-th.right { text-align: right; }
  .aap-tr { transition: background-color .12s; }
  .aap-tr:hover { background: rgba(255,255,255,.025); }
  .aap-td {
    padding: 11px 14px;
    border-bottom: 1px solid rgba(255,255,255,.04);
    color: #E7E9EE; vertical-align: middle;
  }
  .aap-td.muted { color: #8892A3; }
  .aap-td.right { text-align: right; }

  .aap-name { font-weight: 600; color: #E7E9EE; }
  .aap-sub  { color: #8892A3; font-size: 11px; margin-top: 2px; }
  .aap-link {
    color: #F59E0B; text-decoration: none;
    font-weight: 600;
    font-size: 11.5px;
  }
  .aap-link:hover { color: #FDE68A; text-decoration: underline; }

  .aap-badge {
    display: inline-flex; padding: 2px 8px; border-radius: 99px;
    font-size: 10px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
    border: 1px solid;
  }
  .aap-badge.backtest { color: #60a5fa; background: rgba(96,165,250,.08); border-color: rgba(96,165,250,.3); }
  .aap-badge.live     { color: #4ade80; background: rgba(74,222,128,.08); border-color: rgba(74,222,128,.32); }
  .aap-badge.demo     { color: #F59E0B; background: rgba(245,158,11,.08); border-color: rgba(245,158,11,.3); }

  .aap-btn-icon {
    width: 26px; height: 26px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025);
    color: #8892A3; cursor: pointer;
    transition: all .18s;
    flex-shrink: 0;
  }
  .aap-btn-icon:hover:not(:disabled) {
    color: #F59E0B;
    border-color: rgba(245,158,11,.3);
    background: rgba(245,158,11,.06);
  }
  .aap-btn-icon.danger:hover:not(:disabled) {
    color: #f87171;
    border-color: rgba(239,68,68,.42);
    background: rgba(239,68,68,.08);
  }
  .aap-btn-icon:disabled { opacity: .35; cursor: not-allowed; }
  .aap-actions { display: inline-flex; gap: 6px; justify-content: flex-end; }

  .aap-empty, .aap-loading {
    padding: 60px 24px; text-align: center;
    color: #545E6E; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }
`;

function fmtMoney(v, currency = 'USD') {
  const n = Number(v) || 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${n.toFixed(0)}`;
  }
}

export default function AdminAccountsPage() {
  const { user: me } = useAuth();
  const isSuper = me?.role === 'superadmin';

  const [q, setQ] = useState('');
  const [type, setType] = useState('');   // '' | 'Backtest' | 'Live' | 'Demo'
  const [page, setPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const deleteAccount = useAdminDeleteAccount();

  const filters = useMemo(
    () => ({ q: q.trim(), type, page, limit: PAGE_SIZE }),
    [q, type, page]
  );

  const { data, isLoading } = useAdminAccounts(filters);
  const accounts = data?.accounts || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAccount.mutateAsync(deleteTarget.id);
      toast.success(`Deleted "${deleteTarget.name}"`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.message || 'Delete failed');
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="aap-root">
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">Manage</span>
            <h1 className="admin-ph-title">Accounts</h1>
            <p className="admin-ph-sub">
              {total} account{total === 1 ? '' : 's'} across every user
            </p>
          </div>
        </div>

        <div className="aap-bar">
          <div className="aap-search">
            <Search size={14} className="aap-search-icon" />
            <input
              placeholder="Search by account name…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>

          <div className="aap-seg">
            <button
              type="button"
              className={`aap-seg-btn ${type === '' ? 'is-active' : ''}`}
              onClick={() => { setType(''); setPage(1); }}
            >All</button>
            <button
              type="button"
              className={`aap-seg-btn ${type === 'Backtest' ? 'is-active' : ''}`}
              onClick={() => { setType('Backtest'); setPage(1); }}
            >Backtest</button>
            <button
              type="button"
              className={`aap-seg-btn ${type === 'Live' ? 'is-active' : ''}`}
              onClick={() => { setType('Live'); setPage(1); }}
            >Live</button>
            <button
              type="button"
              className={`aap-seg-btn ${type === 'Demo' ? 'is-active' : ''}`}
              onClick={() => { setType('Demo'); setPage(1); }}
            >Demo</button>
          </div>
        </div>

        <div className="aap-card">
          {isLoading ? (
            <div className="aap-loading">Loading accounts…</div>
          ) : accounts.length === 0 ? (
            <div className="aap-empty">No accounts match.</div>
          ) : (
            <table className="aap-table">
              <thead>
                <tr>
                  <th className="aap-th">Account</th>
                  <th className="aap-th">Type</th>
                  <th className="aap-th">Owner</th>
                  <th className="aap-th">Balance</th>
                  <th className="aap-th right">Trades</th>
                  <th className="aap-th right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => {
                  const badge = a.type === 'Live' ? 'live'
                              : a.type === 'Demo' ? 'demo'
                              : 'backtest';
                  return (
                    <tr key={a.id} className="aap-tr">
                      <td className="aap-td">
                        <div className="aap-name">{a.name}</div>
                        <div className="aap-sub">{a.currency}</div>
                      </td>
                      <td className="aap-td">
                        <span className={`aap-badge ${badge}`}>{a.type}</span>
                      </td>
                      <td className="aap-td">
                        {a.user ? (
                          <Link to={`/admin/users/${a.user.id}`} className="aap-link">
                            {a.user.email}
                          </Link>
                        ) : (
                          <span className="aap-sub">—</span>
                        )}
                      </td>
                      <td className="aap-td muted">{fmtMoney(a.balance, a.currency)}</td>
                      <td className="aap-td right muted">{a._count?.trades ?? 0}</td>
                      <td className="aap-td right">
                        <div className="aap-actions">
                          <button
                            type="button"
                            className="aap-btn-icon danger"
                            disabled={!isSuper}
                            title={isSuper ? 'Delete account and all its trades' : 'Superadmin only'}
                            onClick={() => setDeleteTarget(a)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
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

      <ConfirmDangerModal
        isOpen={!!deleteTarget}
        title={deleteTarget ? `Delete "${deleteTarget.name}"?` : ''}
        description={
          deleteTarget
            ? `This will permanently remove the account and every trade inside it (${deleteTarget._count?.trades ?? 0} trades). Cannot be undone.`
            : ''
        }
        confirmPhrase={deleteTarget?.name || 'DELETE'}
        confirmLabel="Delete account"
        busy={deleteAccount.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}