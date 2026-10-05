// apps/web/src/features/admin/pages/AdminAuditPage.jsx
//
// Paginated audit log. Filters: search by actor email, action prefix,
// target type. Row expands to show metadata JSON.

import { useState, useMemo, Fragment } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';

import { useAdminAuditLog } from '../api';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 50;

const CSS = `
  .aad-root { display: flex; flex-direction: column; gap: 18px; }

  .aad-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .aad-search { position: relative; flex: 1; min-width: 220px; }
  .aad-search input {
    width: 100%; padding: 9px 12px 9px 34px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px; outline: none; box-sizing: border-box;
  }
  .aad-search input:focus { border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,.15); }
  .aad-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%); color: #545E6E; pointer-events: none;
  }
  .aad-select {
    padding: 9px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    outline: none;
    color-scheme: dark;
    cursor: pointer;
  }
  .aad-select:focus { border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,.15); }

  .aad-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .aad-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11.5px; }
  .aad-th {
    padding: 10px 12px; text-align: left;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #8892A3; background: rgba(0,0,0,.2);
    border-bottom: 1px solid rgba(255,255,255,.08);
    white-space: nowrap;
  }
  .aad-tr { cursor: pointer; transition: background-color .12s; }
  .aad-tr:hover { background: rgba(255,255,255,.025); }
  .aad-td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,.04);
    color: #E7E9EE;
    vertical-align: top;
  }
  .aad-td.muted { color: #8892A3; }
  .aad-td.action { font-weight: 700; color: #F59E0B; }
  .aad-td.actor { word-break: break-all; }

  .aad-target {
    display: inline-flex; align-items: center; gap: 6px;
    color: #8892A3;
  }
  .aad-target-type {
    padding: 1px 6px; border-radius: 4px;
    background: rgba(255,255,255,.05);
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
    color: #8892A3;
  }
  .aad-target-id {
    color: #545E6E; font-size: 10.5px;
    max-width: 160px; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
  }

  .aad-expand-icon {
    display: inline-flex;
    color: #545E6E;
    width: 14px;
  }
  .aad-meta {
    padding: 14px 18px !important;
    background: rgba(0,0,0,.28);
    color: #8892A3;
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 260px;
    overflow: auto;
  }
  .aad-meta-code {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    color: #E7E9EE;
    line-height: 1.55;
  }

  .aad-empty, .aad-loading {
    padding: 60px 24px; text-align: center;
    color: #545E6E; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }
`;

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const ACTION_PREFIXES = [
  { value: '',           label: 'All actions' },
  { value: 'user.',      label: 'user.*' },
  { value: 'account.',   label: 'account.*' },
  { value: 'trade.',     label: 'trade.*' },
  { value: 'settings.',  label: 'settings.*' },
  { value: 'broadcast.', label: 'broadcast.*' },
  { value: 'calendar.',  label: 'calendar.*' },
  { value: 'session.',   label: 'session.*' },
];

export default function AdminAuditPage() {
  const [q, setQ] = useState('');
  const [actionPrefix, setActionPrefix] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const filters = useMemo(
    () => ({ q: q.trim(), actionPrefix, page, limit: PAGE_SIZE }),
    [q, actionPrefix, page]
  );

  const { data, isLoading } = useAdminAuditLog(filters);
  const entries = data?.entries || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const toggle = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <>
      <style>{CSS}</style>
      <div className="aad-root">
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">System</span>
            <h1 className="admin-ph-title">Audit log</h1>
            <p className="admin-ph-sub">
              {total} recorded admin action{total === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="aad-bar">
          <div className="aad-search">
            <Search size={14} className="aad-search-icon" />
            <input
              placeholder="Search by actor email…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="aad-select"
            value={actionPrefix}
            onChange={(e) => { setActionPrefix(e.target.value); setPage(1); }}
          >
            {ACTION_PREFIXES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="aad-card">
          {isLoading ? (
            <div className="aad-loading">Loading audit log…</div>
          ) : entries.length === 0 ? (
            <div className="aad-empty">
              No audit entries match. Every admin mutation (ban, delete,
              settings change, …) will appear here.
            </div>
          ) : (
            <table className="aad-table">
              <thead>
                <tr>
                  <th className="aad-th" style={{ width: 20 }}></th>
                  <th className="aad-th">Action</th>
                  <th className="aad-th">Actor</th>
                  <th className="aad-th">Target</th>
                  <th className="aad-th">When</th>
                  <th className="aad-th">IP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const isOpen = expandedId === e.id;
                  return (
                    <Fragment key={e.id}>
                      <tr className="aad-tr" onClick={() => toggle(e.id)}>
                        <td className="aad-td">
                          <span className="aad-expand-icon">
                            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </span>
                        </td>
                        <td className="aad-td action">{e.action}</td>
                        <td className="aad-td actor muted">{e.actorEmail || '—'}</td>
                        <td className="aad-td">
                          {e.targetType ? (
                            <span className="aad-target">
                              <span className="aad-target-type">{e.targetType}</span>
                              {e.targetId && (
                                <span className="aad-target-id" title={e.targetId}>
                                  {e.targetId}
                                </span>
                              )}
                            </span>
                          ) : <span className="muted">—</span>}
                        </td>
                        <td className="aad-td muted">{fmtDate(e.createdAt)}</td>
                        <td className="aad-td muted">{e.ipAddress || '—'}</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td className="aad-td aad-meta" colSpan={6}>
                            <div className="aad-meta-code">
                              {JSON.stringify(e.metadata || {}, null, 2)}
                            </div>
                            {e.userAgent && (
                              <div style={{ marginTop: 10, color: '#545E6E', fontSize: 10.5 }}>
                                UA: {e.userAgent}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
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