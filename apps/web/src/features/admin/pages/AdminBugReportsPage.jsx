import { useMemo, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Bug,
  Trash2,
  ExternalLink,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import {
  useAdminBugReports,
  useUpdateAdminBugReport,
  useDeleteAdminBugReport,
} from '@/shared/api/bugReport';
import { useAdminPageHeader } from '../AdminPageHeader';
import Pagination from '../components/Pagination';
import EmptyState from '@/shared/components/EmptyState';
import ConfirmDangerModal from '../components/ConfirmDangerModal';

const PAGE_SIZE = 25;

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const CATEGORIES = ['bug', 'feature', 'performance', 'other'];

const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const CSS = `
  .abr-root { display: flex; flex-direction: column; gap: 18px; }

  .abr-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .abr-search { position: relative; flex: 1; min-width: 220px; }
  .abr-search input {
    width: 100%; padding: 9px 12px 9px 34px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px; outline: none; box-sizing: border-box;
  }
  .abr-search input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
  .abr-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%); color: #545E6E; pointer-events: none;
  }
  .abr-select {
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
  .abr-select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }

  .abr-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .abr-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11.5px; }
  .abr-th {
    padding: 10px 12px; text-align: left;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #8892A3; background: rgba(0,0,0,.2);
    border-bottom: 1px solid rgba(255,255,255,.08);
    white-space: nowrap;
  }
  .abr-tr { cursor: pointer; transition: background-color .12s; }
  .abr-tr:hover { background: rgba(255,255,255,.025); }
  .abr-td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,.04);
    color: #E7E9EE;
    vertical-align: top;
  }
  .abr-td.muted { color: #8892A3; }
  .abr-td.actor { word-break: break-all; }

  .abr-title-cell { display: flex; flex-direction: column; gap: 3px; max-width: 420px; }
  .abr-title { font-weight: 700; color: #E7E9EE; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .abr-desc-preview { color: #8892A3; font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .abr-pill {
    display: inline-flex; align-items: center;
    padding: 2px 8px; border-radius: 99px;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
    border: 1px solid; white-space: nowrap;
  }
  .abr-pill.status-open        { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); border-color: var(--accent-soft2); }
  .abr-pill.status-in_progress { color: #60a5fa; background: rgba(96,165,250,.1); border-color: rgba(96,165,250,.3); }
  .abr-pill.status-resolved    { color: #4ade80; background: rgba(74,222,128,.1); border-color: rgba(74,222,128,.3); }
  .abr-pill.status-closed      { color: #8892A3; background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.1); }

  .abr-pill.sev-low      { color: #8892A3; background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.1); }
  .abr-pill.sev-medium   { color: #60a5fa; background: rgba(96,165,250,.1); border-color: rgba(96,165,250,.3); }
  .abr-pill.sev-high     { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); border-color: var(--accent-soft2); }
  .abr-pill.sev-critical { color: #f87171; background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.32); }

  .abr-expand-icon {
    display: inline-flex;
    color: #545E6E;
    width: 14px;
  }
  .abr-details {
    padding: 16px 18px !important;
    background: rgba(0,0,0,.28);
    color: #8892A3;
    font-size: 11px;
    word-break: break-word;
  }
  .abr-details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 14px;
  }
  .abr-details-block { display: flex; flex-direction: column; gap: 4px; }
  .abr-details-label {
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase;
    color: #545E6E;
  }
  .abr-details-value {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    color: #E7E9EE;
    line-height: 1.55;
    word-break: break-word;
    white-space: pre-wrap;
  }
  .abr-details-value a { color: var(--accent); text-decoration: none; }
  .abr-details-value a:hover { text-decoration: underline; }

  .abr-details-desc {
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(0,0,0,.25);
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.65;
    white-space: pre-wrap;
    margin-bottom: 14px;
  }

  .abr-admin-controls {
    display: grid;
    grid-template-columns: 180px 1fr auto;
    gap: 10px;
    align-items: start;
    padding-top: 12px;
    border-top: 1px dashed rgba(255,255,255,.06);
  }
  .abr-admin-note {
    padding: 8px 11px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 9px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    outline: none;
    resize: vertical;
    min-height: 38px;
    max-height: 100px;
    box-sizing: border-box;
  }
  .abr-admin-note:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }
  .abr-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 9px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .18s;
    white-space: nowrap;
  }
  .abr-btn:hover:not(:disabled) {
    color: #E7E9EE;
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.22);
  }
  .abr-btn:disabled { opacity: .4; cursor: not-allowed; }
  .abr-btn-primary {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    border: none;
    font-weight: 700;
  }
  .abr-btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
  .abr-btn-danger {
    color: #f87171;
    border-color: rgba(239,68,68,.32);
    background: rgba(239,68,68,.05);
  }
  .abr-btn-danger:hover:not(:disabled) {
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55);
    color: #fca5a5;
  }

  .abr-loading {
    padding: 60px 24px; text-align: center;
    color: #8892A3; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }

  @media (max-width: 900px) {
    .abr-details-grid { grid-template-columns: 1fr; }
    .abr-admin-controls { grid-template-columns: 1fr; }
  }
`;

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function userDisplay(u) {
  if (!u) return '—';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email || '—';
}

export default function AdminBugReportsPage() {
  const { user: me } = useAuth();
  const isSuper = me?.role === 'superadmin';

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filters = useMemo(
    () => ({
      q: q.trim(),
      status,
      severity,
      category,
      page,
      limit: PAGE_SIZE,
    }),
    [q, status, severity, category, page]
  );

  const { data, isLoading } = useAdminBugReports(filters);
  const updateMutation = useUpdateAdminBugReport();
  const deleteMutation = useDeleteAdminBugReport();

  const reports = data?.reports || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  useAdminPageHeader({
    eyebrow: 'System',
    title: 'Bug Reports',
    subtitle: `${total} report${total === 1 ? '' : 's'} submitted by users`,
  });

  const hasFilter =
    q.trim().length > 0 || status || severity || category;

  const toggle = (id, report) => {
    if (expandedId === id) {
      setExpandedId(null);
      setNoteDraft('');
    } else {
      setExpandedId(id);
      setNoteDraft(report.adminNote || '');
    }
  };

  const handleStatusChange = async (id, nextStatus) => {
    try {
      await updateMutation.mutateAsync({ id, patch: { status: nextStatus } });
      toast.success(`Status set to ${STATUS_LABEL[nextStatus] || nextStatus}`);
    } catch (err) {
      toast.error(err?.message || 'Could not update status');
    }
  };

  const handleSaveNote = async (id) => {
    try {
      await updateMutation.mutateAsync({ id, patch: { adminNote: noteDraft } });
      toast.success('Note saved');
    } catch (err) {
      toast.error(err?.message || 'Could not save note');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Report deleted');
      setDeleteTarget(null);
      if (expandedId === deleteTarget.id) setExpandedId(null);
    } catch (err) {
      toast.error(err?.message || 'Delete failed');
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="abr-root">
        <div className="abr-bar">
          <div className="abr-search">
            <Search size={14} className="abr-search-icon" />
            <input
              placeholder="Search title, description, or user email…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>

          <select
            className="abr-select"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>

          <select
            className="abr-select"
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
          >
            <option value="">All severities</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="abr-select"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="abr-card">
          {isLoading ? (
            <div className="abr-loading">Loading reports…</div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '32px 0' }}>
              <EmptyState
                icon={Bug}
                eyebrow={hasFilter ? 'No matches' : 'No reports'}
                title={hasFilter ? 'No reports match' : 'No bug reports yet'}
                description={
                  hasFilter
                    ? 'Try changing the filters or clearing the search.'
                    : 'Reports submitted from the in-app bug reporter appear here.'
                }
              />
            </div>
          ) : (
            <table className="abr-table">
              <thead>
                <tr>
                  <th className="abr-th" style={{ width: 20 }}></th>
                  <th className="abr-th">Title</th>
                  <th className="abr-th">User</th>
                  <th className="abr-th">Category</th>
                  <th className="abr-th">Severity</th>
                  <th className="abr-th">Status</th>
                  <th className="abr-th">When</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const isOpen = expandedId === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr
                        className="abr-tr"
                        onClick={() => toggle(r.id, r)}
                      >
                        <td className="abr-td">
                          <span className="abr-expand-icon">
                            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </span>
                        </td>
                        <td className="abr-td">
                          <div className="abr-title-cell">
                            <span className="abr-title" title={r.title}>
                              {r.title}
                            </span>
                            <span className="abr-desc-preview">
                              {r.description.slice(0, 80)}
                              {r.description.length > 80 ? '…' : ''}
                            </span>
                          </div>
                        </td>
                        <td className="abr-td actor muted">
                          {r.user ? (
                            <Link to={`/admin/users/${r.user.id}`} className="aap-link" onClick={(e) => e.stopPropagation()}>
                              {r.user.email}
                            </Link>
                          ) : '—'}
                        </td>
                        <td className="abr-td muted">{r.category}</td>
                        <td className="abr-td">
                          <span className={`abr-pill sev-${r.severity}`}>{r.severity}</span>
                        </td>
                        <td className="abr-td">
                          <span className={`abr-pill status-${r.status}`}>
                            {STATUS_LABEL[r.status] || r.status}
                          </span>
                        </td>
                        <td className="abr-td muted">{fmtDate(r.createdAt)}</td>
                      </tr>

                      {isOpen && (
                        <tr>
                          <td className="abr-td abr-details" colSpan={7}>
                            <div className="abr-details-grid">
                              <div className="abr-details-block">
                                <span className="abr-details-label">Reported by</span>
                                <span className="abr-details-value">
                                  {userDisplay(r.user)}
                                  {r.user?.email && <> · {r.user.email}</>}
                                </span>
                              </div>
                              <div className="abr-details-block">
                                <span className="abr-details-label">Page</span>
                                <span className="abr-details-value">
                                  {r.pageUrl
                                    ? <a href={r.pageUrl} target="_blank" rel="noopener noreferrer">{r.pageUrl}</a>
                                    : '—'}
                                </span>
                              </div>
                              <div className="abr-details-block" style={{ gridColumn: '1 / -1' }}>
                                <span className="abr-details-label">Description</span>
                                <div className="abr-details-desc">{r.description}</div>
                              </div>
                              {r.userAgent && (
                                <div className="abr-details-block" style={{ gridColumn: '1 / -1' }}>
                                  <span className="abr-details-label">User agent</span>
                                  <span className="abr-details-value">{r.userAgent}</span>
                                </div>
                              )}
                            </div>

                            <div className="abr-admin-controls">
                              <select
                                className="abr-select"
                                value={r.status}
                                disabled={updateMutation.isPending}
                                onChange={(e) => handleStatusChange(r.id, e.target.value)}
                              >
                                {STATUSES.map((s) => (
                                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                                ))}
                              </select>

                              <textarea
                                className="abr-admin-note"
                                placeholder="Admin note (only visible here)…"
                                value={noteDraft}
                                maxLength={2000}
                                onChange={(e) => setNoteDraft(e.target.value)}
                              />

                              <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="abr-btn abr-btn-primary"
                                  onClick={() => handleSaveNote(r.id)}
                                  disabled={updateMutation.isPending}
                                >
                                  <Save size={11} />
                                  Save
                                </button>
                                {isSuper && (
                                  <button
                                    type="button"
                                    className="abr-btn abr-btn-danger"
                                    onClick={() => setDeleteTarget(r)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    <Trash2 size={11} />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
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

      <ConfirmDangerModal
        isOpen={!!deleteTarget}
        title={deleteTarget ? `Delete "${deleteTarget.title}"?` : ''}
        description="This permanently removes the bug report. The submitter will not be notified."
        confirmPhrase="DELETE"
        confirmLabel="Delete report"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}