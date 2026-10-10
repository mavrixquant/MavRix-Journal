// apps/web/src/features/admin/pages/AdminStrategiesPage.jsx
//
// Cross-user strategies list. Filters: search by name, status segment.
// Row actions: View user (link), Delete (superadmin only).

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import { useAdminStrategies, useAdminDeleteStrategy } from '../api';
import Pagination from '../components/Pagination';
import ConfirmDangerModal from '../components/ConfirmDangerModal';

const PAGE_SIZE = 25;

const CSS = `
  .asp-root { display: flex; flex-direction: column; gap: 18px; }

  .asp-bar {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .asp-search { position: relative; flex: 1; min-width: 220px; }
  .asp-search input {
    width: 100%; padding: 9px 12px 9px 34px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px; outline: none; box-sizing: border-box;
  }
  .asp-search input:focus { border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,.15); }
  .asp-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%); color: #545E6E; pointer-events: none;
  }

  .asp-seg {
    display: inline-flex; padding: 3px; gap: 2px;
    background: rgba(0,0,0,.32);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 10px;
  }
  .asp-seg-btn {
    padding: 6px 12px; border-radius: 7px; border: none;
    background: transparent; color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 600;
    cursor: pointer; transition: all .18s;
    white-space: nowrap;
  }
  .asp-seg-btn:hover { color: #E7E9EE; background: rgba(255,255,255,.04); }
  .asp-seg-btn.is-active {
    background: linear-gradient(135deg, #F59E0B, #FDE68A);
    color: #0D1117; font-weight: 700;
  }

  .asp-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .asp-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12px; }
  .asp-th {
    padding: 11px 14px; text-align: left;
    font-size: 10px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #8892A3; background: rgba(0,0,0,.2);
    border-bottom: 1px solid rgba(255,255,255,.08);
    white-space: nowrap;
  }
  .asp-th.right { text-align: right; }
  .asp-tr { transition: background-color .12s; }
  .asp-tr:hover { background: rgba(255,255,255,.025); }
  .asp-td {
    padding: 11px 14px;
    border-bottom: 1px solid rgba(255,255,255,.04);
    color: #E7E9EE; vertical-align: middle;
  }
  .asp-td.muted { color: #8892A3; }
  .asp-td.right { text-align: right; }

  .asp-name-cell {
    display: inline-flex; align-items: center; gap: 10px;
    min-width: 0;
  }
  .asp-dot {
    width: 10px; height: 10px; border-radius: 50%;
    flex-shrink: 0;
  }
  .asp-name { font-weight: 600; color: #E7E9EE; }
  .asp-sub  { color: #8892A3; font-size: 11px; margin-top: 2px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .asp-link {
    color: #F59E0B; text-decoration: none;
    font-weight: 600;
    font-size: 11.5px;
  }
  .asp-link:hover { color: #FDE68A; text-decoration: underline; }

  .asp-badge {
    display: inline-flex; padding: 2px 8px; border-radius: 99px;
    font-size: 10px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
    border: 1px solid;
  }
  .asp-badge.active   { color: #4ade80; background: rgba(74,222,128,.08); border-color: rgba(74,222,128,.32); }
  .asp-badge.paused   { color: #F59E0B; background: rgba(245,158,11,.08); border-color: rgba(245,158,11,.30); }
  .asp-badge.archived { color: #8892A3; background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.10); }

  .asp-btn-icon {
    width: 26px; height: 26px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025);
    color: #8892A3; cursor: pointer;
    transition: all .18s;
    flex-shrink: 0;
  }
  .asp-btn-icon.danger:hover:not(:disabled) {
    color: #f87171;
    border-color: rgba(239,68,68,.42);
    background: rgba(239,68,68,.08);
  }
  .asp-btn-icon:disabled { opacity: .35; cursor: not-allowed; }
  .asp-actions { display: inline-flex; gap: 6px; justify-content: flex-end; }

  .asp-empty, .asp-loading {
    padding: 60px 24px; text-align: center;
    color: #545E6E; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }
`;

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminStrategiesPage() {
  const { user: me } = useAuth();
  const isSuper = me?.role === 'superadmin';

  const [q, setQ] = useState('');
  const [status, setStatus] = useState(''); // '' | 'active' | 'paused' | 'archived'
  const [page, setPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const deleteStrategy = useAdminDeleteStrategy();

  const filters = useMemo(
    () => ({ q: q.trim(), status, page, limit: PAGE_SIZE }),
    [q, status, page]
  );

  const { data, isLoading } = useAdminStrategies(filters);
  const strategies = data?.strategies || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteStrategy.mutateAsync(deleteTarget.id);
      const detached = res?.detachedTrades ?? deleteTarget.tradeCount ?? 0;
      toast.success(
        detached > 0
          ? `Deleted "${deleteTarget.name}" — ${detached} trade${detached === 1 ? '' : 's'} untagged`
          : `Deleted "${deleteTarget.name}"`
      );
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.message || 'Delete failed');
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="asp-root">
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">Manage</span>
            <h1 className="admin-ph-title">Strategies</h1>
            <p className="admin-ph-sub">
              {total} strateg{total === 1 ? 'y' : 'ies'} across every user
            </p>
          </div>
        </div>

        <div className="asp-bar">
          <div className="asp-search">
            <Search size={14} className="asp-search-icon" />
            <input
              placeholder="Search by strategy name…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>

          <div className="asp-seg">
            <button
              type="button"
              className={`asp-seg-btn ${status === '' ? 'is-active' : ''}`}
              onClick={() => { setStatus(''); setPage(1); }}
            >All</button>
            <button
              type="button"
              className={`asp-seg-btn ${status === 'active' ? 'is-active' : ''}`}
              onClick={() => { setStatus('active'); setPage(1); }}
            >Active</button>
            <button
              type="button"
              className={`asp-seg-btn ${status === 'paused' ? 'is-active' : ''}`}
              onClick={() => { setStatus('paused'); setPage(1); }}
            >Paused</button>
            <button
              type="button"
              className={`asp-seg-btn ${status === 'archived' ? 'is-active' : ''}`}
              onClick={() => { setStatus('archived'); setPage(1); }}
            >Archived</button>
          </div>
        </div>

        <div className="asp-card">
          {isLoading ? (
            <div className="asp-loading">Loading strategies…</div>
          ) : strategies.length === 0 ? (
            <div className="asp-empty">No strategies match.</div>
          ) : (
            <table className="asp-table">
              <thead>
                <tr>
                  <th className="asp-th">Strategy</th>
                  <th className="asp-th">Status</th>
                  <th className="asp-th">Owner</th>
                  <th className="asp-th">Direction</th>
                  <th className="asp-th right">Trades</th>
                  <th className="asp-th">Updated</th>
                  <th className="asp-th right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map((s) => {
                  const statusCls =
                    s.status === 'active' ? 'active'
                    : s.status === 'paused' ? 'paused'
                    : 'archived';
                  return (
                    <tr key={s.id} className="asp-tr">
                      <td className="asp-td">
                        <div className="asp-name-cell">
                          <span
                            className="asp-dot"
                            style={{
                              background: s.color || '#8892A3',
                              boxShadow: `0 0 8px ${s.color || '#8892A3'}aa`,
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div className="asp-name">{s.name}</div>
                            {s.description && (
                              <div className="asp-sub" title={s.description}>
                                {s.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="asp-td">
                        <span className={`asp-badge ${statusCls}`}>{s.status}</span>
                      </td>
                      <td className="asp-td">
                        {s.user ? (
                          <Link to={`/admin/users/${s.user.id}`} className="asp-link">
                            {s.user.email}
                          </Link>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="asp-td muted">{s.direction || 'Both'}</td>
                      <td className="asp-td right muted">{s.tradeCount ?? 0}</td>
                      <td className="asp-td muted">{fmtDate(s.updatedAt)}</td>
                      <td className="asp-td right">
                        <div className="asp-actions">
                          <button
                            type="button"
                            className="asp-btn-icon danger"
                            disabled={!isSuper}
                            title={
                              isSuper
                                ? 'Delete strategy (trades are untagged, not deleted)'
                                : 'Superadmin only'
                            }
                            onClick={() => setDeleteTarget(s)}
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
            ? `${deleteTarget.tradeCount ?? 0} tagged trade${deleteTarget.tradeCount === 1 ? '' : 's'} will be UNTAGGED but kept. This cannot be undone.`
            : ''
        }
        confirmPhrase={deleteTarget?.name || 'DELETE'}
        confirmLabel="Delete strategy"
        busy={deleteStrategy.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}