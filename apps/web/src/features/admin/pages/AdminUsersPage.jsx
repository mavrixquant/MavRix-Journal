// apps/web/src/features/admin/pages/AdminUsersPage.jsx
//
// Users list — searchable, filterable, paginated.
// Click any row → /admin/users/:id

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShieldCheck, Ban, CheckCircle2 } from 'lucide-react';

import { useAdminUsers } from '../api';
import RoleBadge from '../components/RoleBadge';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 25;

const CSS = `
  .aup-root { display: flex; flex-direction: column; gap: 18px; }

  .aup-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .aup-search {
    position: relative;
    flex: 1;
    min-width: 220px;
  }
  .aup-search input {
    width: 100%;
    padding: 9px 12px 9px 34px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    outline: none;
    box-sizing: border-box;
  }
  .aup-search input:focus {
    border-color: #F59E0B;
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .aup-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    color: #545E6E; pointer-events: none;
  }

  .aup-seg {
    display: inline-flex; padding: 3px; gap: 2px;
    background: rgba(0,0,0,.32);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 10px;
  }
  .aup-seg-btn {
    padding: 6px 12px;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 600;
    cursor: pointer; transition: all .18s;
  }
  .aup-seg-btn:hover { color: #E7E9EE; background: rgba(255,255,255,.04); }
  .aup-seg-btn.is-active {
    background: linear-gradient(135deg, #F59E0B, #FDE68A);
    color: #0D1117; font-weight: 700;
  }

  .aup-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .aup-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12px; }
  .aup-th {
    padding: 11px 14px; text-align: left;
    font-size: 10px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #8892A3; background: rgba(0,0,0,.2);
    border-bottom: 1px solid rgba(255,255,255,.08);
    white-space: nowrap;
  }
  .aup-tr {
    transition: background-color .12s;
    cursor: pointer;
  }
  .aup-tr:hover { background: rgba(255,255,255,.025); }
  .aup-td {
    padding: 11px 14px;
    border-bottom: 1px solid rgba(255,255,255,.04);
    color: #E7E9EE;
    vertical-align: middle;
  }
  .aup-td.muted { color: #8892A3; }
  .aup-td.right { text-align: right; }
  .aup-name { font-weight: 600; color: #E7E9EE; }
  .aup-email { color: #8892A3; font-size: 11.5px; }
  .aup-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 2px 8px; border-radius: 99px;
    font-size: 10px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
    border: 1px solid;
  }
  .aup-pill.ok {
    color: #35C4A1; background: rgba(53,196,161,.08);
    border-color: rgba(53,196,161,.3);
  }
  .aup-pill.bad {
    color: #ef4444; background: rgba(239,68,68,.08);
    border-color: rgba(239,68,68,.3);
  }
  .aup-pill.warn {
    color: #F59E0B; background: rgba(245,158,11,.08);
    border-color: rgba(245,158,11,.3);
  }

  .aup-empty {
    padding: 60px 24px; text-align: center;
    color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }
  .aup-loading {
    padding: 60px 24px; text-align: center;
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }

  .aup-actions { display: inline-flex; gap: 6px; }
  .aup-action {
    width: 26px; height: 26px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025);
    color: #8892A3;
    cursor: pointer; transition: all .18s;
    text-decoration: none;
    flex-shrink: 0;
  }
  .aup-action:hover {
    color: #F59E0B;
    border-color: rgba(245,158,11,.3);
    background: rgba(245,158,11,.06);
  }
`;

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function displayName(u) {
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return n || '—';
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');    // '' | 'user' | 'admin' | 'superadmin'
  const [bannedFilter, setBannedFilter] = useState(''); // '' | 'true' | 'false'
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      q: q.trim(),
      role: roleFilter,
      banned: bannedFilter,
      page,
      limit: PAGE_SIZE,
    }),
    [q, roleFilter, bannedFilter, page]
  );

  const { data, isLoading } = useAdminUsers(filters);

  const users = data?.users || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <>
      <style>{CSS}</style>
      <div className="aup-root">
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">Manage</span>
            <h1 className="admin-ph-title">Users</h1>
            <p className="admin-ph-sub">
              {total} user{total === 1 ? '' : 's'} · search, filter, inspect
            </p>
          </div>
        </div>

        {/* ---------- Filter bar ---------- */}
        <div className="aup-bar">
          <div className="aup-search">
            <Search size={14} className="aup-search-icon" />
            <input
              placeholder="Search by email or name…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>

          <div className="aup-seg">
            <button
              type="button"
              className={`aup-seg-btn ${roleFilter === '' ? 'is-active' : ''}`}
              onClick={() => { setRoleFilter(''); setPage(1); }}
            >All roles</button>
            <button
              type="button"
              className={`aup-seg-btn ${roleFilter === 'user' ? 'is-active' : ''}`}
              onClick={() => { setRoleFilter('user'); setPage(1); }}
            >Users</button>
            <button
              type="button"
              className={`aup-seg-btn ${roleFilter === 'admin' ? 'is-active' : ''}`}
              onClick={() => { setRoleFilter('admin'); setPage(1); }}
            >Admins</button>
            <button
              type="button"
              className={`aup-seg-btn ${roleFilter === 'superadmin' ? 'is-active' : ''}`}
              onClick={() => { setRoleFilter('superadmin'); setPage(1); }}
            >Supers</button>
          </div>

          <div className="aup-seg">
            <button
              type="button"
              className={`aup-seg-btn ${bannedFilter === '' ? 'is-active' : ''}`}
              onClick={() => { setBannedFilter(''); setPage(1); }}
            >All</button>
            <button
              type="button"
              className={`aup-seg-btn ${bannedFilter === 'false' ? 'is-active' : ''}`}
              onClick={() => { setBannedFilter('false'); setPage(1); }}
            >Active</button>
            <button
              type="button"
              className={`aup-seg-btn ${bannedFilter === 'true' ? 'is-active' : ''}`}
              onClick={() => { setBannedFilter('true'); setPage(1); }}
            >Banned</button>
          </div>
        </div>

        {/* ---------- Table ---------- */}
        <div className="aup-card">
          {isLoading ? (
            <div className="aup-loading">Loading users…</div>
          ) : users.length === 0 ? (
            <div className="aup-empty">No users match these filters.</div>
          ) : (
            <table className="aup-table">
              <thead>
                <tr>
                  <th className="aup-th">User</th>
                  <th className="aup-th">Role</th>
                  <th className="aup-th">Status</th>
                  <th className="aup-th">Accounts</th>
                  <th className="aup-th">Joined</th>
                  <th className="aup-th">Last login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="aup-tr"
                    onClick={() => navigate(`/admin/users/${u.id}`)}
                  >
                    <td className="aup-td">
                      <div className="aup-name">{displayName(u)}</div>
                      <div className="aup-email">{u.email}</div>
                    </td>
                    <td className="aup-td">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="aup-td">
                      {u.isBanned ? (
                        <span className="aup-pill bad">
                          <Ban size={10} /> Banned
                        </span>
                      ) : u.emailVerified ? (
                        <span className="aup-pill ok">
                          <CheckCircle2 size={10} /> Verified
                        </span>
                      ) : (
                        <span className="aup-pill warn">
                          <ShieldCheck size={10} /> Unverified
                        </span>
                      )}
                    </td>
                    <td className="aup-td muted">
                      {u._count?.accounts ?? 0}
                    </td>
                    <td className="aup-td muted">{fmtDate(u.createdAt)}</td>
                    <td className="aup-td muted">{fmtDate(u.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Pagination page={page} pages={pages} total={total} onChange={setPage} />
      </div>
    </>
  );
}