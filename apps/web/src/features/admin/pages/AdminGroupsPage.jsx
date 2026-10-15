// apps/web/src/features/admin/pages/AdminGroupsPage.jsx
//
// Cross-user chat group administration. Filters: search by name, visibility
// segment (All / Public / Private). Row click opens the edit modal.
// Row action deletes (superadmin or admin's own public groups).

import { useState, useMemo } from 'react';
import { Search, Trash2, Plus, Hash, Lock, Users } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import { useAdminGroups, useDeleteGroup } from '@/shared/api/chat';
import Pagination from '../components/Pagination';
import ConfirmDangerModal from '../components/ConfirmDangerModal';
import AdminGroupModal from '../components/AdminGroupModal';

const PAGE_SIZE = 25;

const CSS = `
  .agp-root { display: flex; flex-direction: column; gap: 18px; }

  .agp-bar {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .agp-search { position: relative; flex: 1; min-width: 220px; }
  .agp-search input {
    width: 100%; padding: 9px 12px 9px 34px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px; outline: none; box-sizing: border-box;
  }
  .agp-search input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
  .agp-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%); color: #545E6E; pointer-events: none;
  }

  .agp-seg {
    display: inline-flex; padding: 3px; gap: 2px;
    background: rgba(0,0,0,.32);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 10px;
  }
  .agp-seg-btn {
    padding: 6px 12px; border-radius: 7px; border: none;
    background: transparent; color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 600;
    cursor: pointer; transition: all .18s;
  }
  .agp-seg-btn:hover { color: #E7E9EE; background: rgba(255,255,255,.04); }
  .agp-seg-btn.is-active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117; font-weight: 700;
  }

  .agp-new-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px;
    border-radius: 10px; border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 700;
    letter-spacing: .02em;
    cursor: pointer;
    box-shadow: 0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent), inset 0 1px 0 rgba(255,255,255,.4);
    transition: transform .22s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s;
    white-space: nowrap;
  }
  .agp-new-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px color-mix(in srgb, var(--accent) 70%, transparent), inset 0 1px 0 rgba(255,255,255,.5);
  }

  .agp-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .agp-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12px; }
  .agp-th {
    padding: 11px 14px; text-align: left;
    font-size: 10px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #8892A3; background: rgba(0,0,0,.2);
    border-bottom: 1px solid rgba(255,255,255,.08);
    white-space: nowrap;
  }
  .agp-th.right { text-align: right; }
  .agp-tr { transition: background-color .12s; cursor: pointer; }
  .agp-tr:hover { background: rgba(255,255,255,.025); }
  .agp-td {
    padding: 11px 14px;
    border-bottom: 1px solid rgba(255,255,255,.04);
    color: #E7E9EE; vertical-align: middle;
  }
  .agp-td.muted { color: #8892A3; }
  .agp-td.right { text-align: right; }

  .agp-name-cell { display: inline-flex; align-items: center; gap: 10px; min-width: 0; }
  .agp-avatar {
    flex-shrink: 0;
    width: 32px; height: 32px;
    border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px; font-weight: 700;
  }
  .agp-name { font-weight: 600; color: #E7E9EE; }
  .agp-sub  { color: #8892A3; font-size: 11px; margin-top: 2px; max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .agp-vis {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 2px 8px; border-radius: 99px;
    font-size: 10px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
    border: 1px solid;
  }
  .agp-vis.public { color: #4ade80; background: rgba(74,222,128,.08); border-color: rgba(74,222,128,.32); }
  .agp-vis.private { color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); border-color: color-mix(in srgb, var(--accent) 30%, transparent); }

  .agp-member-count {
    display: inline-flex; align-items: center; gap: 5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; color: #8892A3;
  }

  .agp-link {
    color: var(--accent); text-decoration: none;
    font-weight: 600; font-size: 11.5px;
  }
  .agp-link:hover { color: var(--accent-2); text-decoration: underline; }

  .agp-btn-icon {
    width: 26px; height: 26px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025);
    color: #8892A3; cursor: pointer;
    transition: all .18s;
    flex-shrink: 0;
  }
  .agp-btn-icon.danger:hover:not(:disabled) {
    color: #f87171;
    border-color: rgba(239,68,68,.42);
    background: rgba(239,68,68,.08);
  }
  .agp-btn-icon:disabled { opacity: .35; cursor: not-allowed; }
  .agp-actions { display: inline-flex; gap: 6px; justify-content: flex-end; }

  .agp-empty, .agp-loading {
    padding: 60px 24px; text-align: center;
    color: #545E6E; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }
`;

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function AdminGroupsPage() {
  const { user: me } = useAuth();
  const isSuper = me?.role === 'superadmin';

  const [q, setQ] = useState('');
  const [visibility, setVisibility] = useState(''); // '' | 'public' | 'private'
  const [page, setPage] = useState(1);

  const [editingId, setEditingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const deleteGroup = useDeleteGroup();

  const filters = useMemo(
    () => ({ q: q.trim(), visibility, page, limit: PAGE_SIZE }),
    [q, visibility, page]
  );

  const { data, isLoading } = useAdminGroups(filters);
  const groups = data?.groups || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGroup.mutateAsync(deleteTarget.id);
      toast.success(`Deleted "${deleteTarget.name}"`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.message || 'Delete failed');
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="agp-root">
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">Manage</span>
            <h1 className="admin-ph-title">Chat Groups</h1>
            <p className="admin-ph-sub">
              {total} group{total === 1 ? '' : 's'} visible to you
            </p>
          </div>
        </div>

        <div className="agp-bar">
          <div className="agp-search">
            <Search size={14} className="agp-search-icon" />
            <input
              placeholder="Search by group name…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>

          <div className="agp-seg">
            <button
              type="button"
              className={`agp-seg-btn ${visibility === '' ? 'is-active' : ''}`}
              onClick={() => { setVisibility(''); setPage(1); }}
            >All</button>
            <button
              type="button"
              className={`agp-seg-btn ${visibility === 'public' ? 'is-active' : ''}`}
              onClick={() => { setVisibility('public'); setPage(1); }}
            >Public</button>
            <button
              type="button"
              className={`agp-seg-btn ${visibility === 'private' ? 'is-active' : ''}`}
              onClick={() => { setVisibility('private'); setPage(1); }}
            >Private</button>
          </div>

          <button
            type="button"
            className="agp-new-btn"
            onClick={() => setCreating(true)}
          >
            <Plus size={12} /> New Group
          </button>
        </div>

        <div className="agp-card">
          {isLoading ? (
            <div className="agp-loading">Loading groups…</div>
          ) : groups.length === 0 ? (
            <div className="agp-empty">No groups match these filters.</div>
          ) : (
            <table className="agp-table">
              <thead>
                <tr>
                  <th className="agp-th">Group</th>
                  <th className="agp-th">Visibility</th>
                  <th className="agp-th">Members</th>
                  <th className="agp-th">Created by</th>
                  <th className="agp-th">Created</th>
                  <th className="agp-th right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const color = g.color || 'var(--accent)';
                  return (
                    <tr
                      key={g.id}
                      className="agp-tr"
                      onClick={() => setEditingId(g.id)}
                    >
                      <td className="agp-td">
                        <div className="agp-name-cell">
                          <span
                            className="agp-avatar"
                            style={{
                              color,
                              background: `${color}22`,
                              border: `1px solid ${color}55`,
                            }}
                          >
                            {g.iconEmoji || (g.visibility === 'private' ? '🔒' : '#')}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div className="agp-name">{g.name || 'Untitled'}</div>
                            {g.description && (
                              <div className="agp-sub" title={g.description}>
                                {g.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="agp-td">
                        <span className={`agp-vis ${g.visibility}`}>
                          {g.visibility === 'private' ? <Lock size={9} /> : <Hash size={9} />}
                          {g.visibility || '—'}
                        </span>
                      </td>
                      <td className="agp-td muted">
                        <span className="agp-member-count">
                          <Users size={11} /> {g.memberCount ?? 0}
                        </span>
                      </td>
                      <td className="agp-td muted">
                        {g.createdBy?.email ? (
                          <a
                            href={`/admin/users/${g.createdBy.id}`}
                            className="agp-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {g.createdBy.email}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="agp-td muted">{fmtDate(g.createdAt)}</td>
                      <td className="agp-td right">
                        <div className="agp-actions">
                          <button
                            type="button"
                            className="agp-btn-icon danger"
                            disabled={!isSuper && g.createdById !== me?.id}
                            title={
                              isSuper ? 'Delete group'
                              : g.createdById === me?.id ? 'Delete your group'
                              : 'Superadmin only'
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(g);
                            }}
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

      {/* Create modal */}
      <AdminGroupModal
        isOpen={creating}
        onClose={() => setCreating(false)}
      />

      {/* Edit modal */}
      <AdminGroupModal
        isOpen={!!editingId}
        onClose={() => setEditingId(null)}
        groupId={editingId}
      />

      {/* Delete confirmation */}
      <ConfirmDangerModal
        isOpen={!!deleteTarget}
        title={deleteTarget ? `Delete "${deleteTarget.name}"?` : ''}
        description={
          deleteTarget
            ? `This will permanently remove the group and all ${deleteTarget.memberCount ?? 0} members will lose access. Every message in it will be deleted. This cannot be undone.`
            : ''
        }
        confirmPhrase={deleteTarget?.name || 'DELETE'}
        confirmLabel="Delete group"
        busy={deleteGroup.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}