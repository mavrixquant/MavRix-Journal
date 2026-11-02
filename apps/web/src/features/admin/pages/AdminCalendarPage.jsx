import { useState, useMemo } from 'react';
import {
  Calendar, RefreshCw, Trash2, Upload, FileJson, Search,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import { useAdminPageHeader } from '../AdminPageHeader';
import ConfirmDangerModal from '../components/ConfirmDangerModal';
import {
  useAdminCalendarLogs,
  useAdminCalendarSync,
  useAdminCalendarWipe,
  useAdminCalendarEvents,
  useAdminCalendarStats,
  useAdminSyncCalendarRange,
  useAdminImportCalendar,
  useAdminDeleteCalendarEvents,
} from '../api';

const PAGE_SIZE = 50;
const IMPACTS = ['high', 'medium', 'low'];

const CSS = `
  .acal-root { display: flex; flex-direction: column; gap: 16px; }

  .acal-tabs {
    display: inline-flex;
    padding: 4px;
    gap: 2px;
    border-radius: 12px;
    background: rgba(0,0,0,.32);
    border: 1px solid rgba(255,255,255,.06);
    width: fit-content;
  }
  .acal-tab {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .18s;
    white-space: nowrap;
  }
  .acal-tab:hover:not(.is-active) { color: #E7E9EE; background: rgba(255,255,255,.04); }
  .acal-tab.is-active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-weight: 700;
  }

  .acal-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .acal-spacer { flex: 1; min-width: 8px; }

  .acal-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: #8892A3;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .2s;
    white-space: nowrap;
  }
  .acal-btn:hover:not(:disabled) {
    color: #E7E9EE;
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .acal-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
  .acal-btn.amber {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }
  .acal-btn.amber:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }
  .acal-btn.danger {
    color: #f87171;
    border-color: rgba(239,68,68,.32);
    background: rgba(239,68,68,.05);
  }
  .acal-btn.danger:hover:not(:disabled) {
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55);
  }

  .acal-btn-icon {
    width: 26px; height: 26px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025);
    color: #8892A3;
    cursor: pointer;
    transition: all .18s;
  }
  .acal-btn-icon:hover:not(:disabled) {
    color: #f87171;
    background: rgba(239,68,68,.08);
    border-color: rgba(239,68,68,.42);
  }
  .acal-btn-icon:disabled { opacity: .35; cursor: not-allowed; }

  .acal-search { position: relative; flex: 1; min-width: 220px; }
  .acal-search input {
    width: 100%;
    padding: 9px 12px 9px 34px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    outline: none;
    box-sizing: border-box;
  }
  .acal-search input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
  .acal-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%); color: #545E6E; pointer-events: none;
  }

  .acal-input-sm, .acal-select, .acal-input {
    padding: 9px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    outline: none;
    box-sizing: border-box;
    color-scheme: dark;
  }
  .acal-input-sm { width: 150px; }
  .acal-select { min-width: 130px; cursor: pointer; }
  .acal-input:focus, .acal-input-sm:focus, .acal-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }

  .acal-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }
  .acal-kpi {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    border-radius: 12px;
    background: rgba(255,255,255,.02);
    border: 1px solid rgba(255,255,255,.06);
  }
  .acal-kpi-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase;
    color: #545E6E;
  }
  .acal-kpi-value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 20px; font-weight: 700;
    color: #E7E9EE;
    letter-spacing: -.01em;
    line-height: 1.15;
  }
  .acal-kpi-value.amber { color: var(--accent); }
  .acal-kpi-value.mono { font-size: 13px; }

  .acal-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .acal-card-head {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 18px 12px;
    border-bottom: 1px solid rgba(255,255,255,.05);
  }
  .acal-card-title { font-size: 13px; font-weight: 700; color: #E7E9EE; }
  .acal-card-note {
    margin-left: auto;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--accent); opacity: .85;
  }
  .acal-card-body { padding: 16px 18px; }
  .acal-card-body.no-pad { padding: 0; }

  .acal-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
  }
  .acal-th {
    padding: 10px 12px;
    text-align: left;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #8892A3; background: rgba(0,0,0,.2);
    border-bottom: 1px solid rgba(255,255,255,.08);
    white-space: nowrap;
  }
  .acal-th.right { text-align: right; }
  .acal-tr:hover { background: rgba(255,255,255,.025); }
  .acal-td {
    padding: 9px 12px;
    border-bottom: 1px solid rgba(255,255,255,.04);
    color: #E7E9EE;
    vertical-align: middle;
  }
  .acal-td.muted { color: #8892A3; }
  .acal-td.right { text-align: right; }
  .acal-td.ok { color: #35C4A1; font-weight: 700; }
  .acal-td.bad { color: #ef4444; font-weight: 700; }

  .acal-cur {
    padding: 2px 8px; border-radius: 4px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    font-weight: 700; font-size: 10.5px;
    letter-spacing: .04em;
  }

  .acal-pill {
    display: inline-flex;
    padding: 2px 8px; border-radius: 99px;
    font-size: 10px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
    border: 1px solid;
  }
  .acal-pill.high   { color: #f87171; background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.30); }
  .acal-pill.medium { color: #60a5fa; background: rgba(96,165,250,.08); border-color: rgba(96,165,250,.30); }
  .acal-pill.low    { color: #8892A3; background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.10); }

  .acal-pager {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 12px 4px 0;
  }
  .acal-pager-info {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: #8892A3;
  }

  .acal-hint {
    margin: 0 0 12px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    color: #8892A3;
    line-height: 1.6;
  }
  .acal-hint code {
    color: #E7E9EE;
    background: rgba(255,255,255,.04);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 11px;
  }

  .acal-row {
    display: flex;
    gap: 10px;
    align-items: end;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .acal-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 160px;
  }
  .acal-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: #545E6E;
  }

  .acal-textarea {
    width: 100%;
    min-height: 220px;
    padding: 12px 14px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    line-height: 1.55;
    outline: none;
    box-sizing: border-box;
    resize: vertical;
  }
  .acal-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }

  .acal-loading, .acal-empty {
    padding: 40px 20px;
    text-align: center;
    color: #545E6E;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
  }

  .acal-spin { animation: acalSpin .8s linear infinite; }
  @keyframes acalSpin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .acal-tab, .acal-btn, .acal-btn-icon { transition: none; }
    .acal-spin { animation-duration: 1.6s; }
  }
`;

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ------------------------------- Overview ------------------------------- */

function OverviewTab() {
  const { data: stats, isLoading, refetch, isFetching } = useAdminCalendarStats();
  const syncMutation = useAdminCalendarSync();
  const wipeMutation = useAdminCalendarWipe();
  const { user } = useAuth();
  const isSuper = user?.role === 'superadmin';
  const [showWipe, setShowWipe] = useState(false);

  const handleSync = async () => {
    try {
      const r = await syncMutation.mutateAsync();
      toast.success(`Sync complete in ${r.elapsedMs}ms`);
    } catch (err) {
      toast.error(err?.message || 'Sync failed');
    }
  };

  const handleWipe = async () => {
    try {
      const r = await wipeMutation.mutateAsync();
      toast.success(`Deleted ${r.deleted} events`);
      setShowWipe(false);
    } catch (err) {
      toast.error(err?.message || 'Wipe failed');
    }
  };

  return (
    <>
      <div className="acal-toolbar">
        <button
          type="button"
          className="acal-btn amber"
          onClick={handleSync}
          disabled={syncMutation.isPending}
        >
          <RefreshCw size={12} className={syncMutation.isPending ? 'acal-spin' : ''} />
          {syncMutation.isPending ? 'Syncing…' : 'Force sync now'}
        </button>
        <button
          type="button"
          className="acal-btn"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw size={12} className={isFetching ? 'acal-spin' : ''} /> Refresh
        </button>
        {isSuper && (
          <button
            type="button"
            className="acal-btn danger"
            onClick={() => setShowWipe(true)}
            disabled={wipeMutation.isPending}
          >
            <Trash2 size={12} /> Wipe all
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="acal-loading">Loading stats…</div>
      ) : (
        <>
          <div className="acal-kpis">
            <div className="acal-kpi">
              <span className="acal-kpi-label">Total events</span>
              <span className="acal-kpi-value">{stats?.total?.toLocaleString() ?? '—'}</span>
            </div>
            <div className="acal-kpi">
              <span className="acal-kpi-label">High impact</span>
              <span className="acal-kpi-value amber">
                {stats?.impactCounts?.high?.toLocaleString() ?? 0}
              </span>
            </div>
            <div className="acal-kpi">
              <span className="acal-kpi-label">Medium impact</span>
              <span className="acal-kpi-value">
                {stats?.impactCounts?.medium?.toLocaleString() ?? 0}
              </span>
            </div>
            <div className="acal-kpi">
              <span className="acal-kpi-label">Low impact</span>
              <span className="acal-kpi-value">
                {stats?.impactCounts?.low?.toLocaleString() ?? 0}
              </span>
            </div>
            <div className="acal-kpi">
              <span className="acal-kpi-label">Currencies tracked</span>
              <span className="acal-kpi-value">{stats?.currencyCounts?.length ?? 0}</span>
            </div>
          </div>

          <div className="acal-kpis">
            <div className="acal-kpi">
              <span className="acal-kpi-label">Earliest event</span>
              <span className="acal-kpi-value mono">{fmtDate(stats?.earliestEventAt)}</span>
            </div>
            <div className="acal-kpi">
              <span className="acal-kpi-label">Latest event</span>
              <span className="acal-kpi-value mono">{fmtDate(stats?.latestEventAt)}</span>
            </div>
          </div>
        </>
      )}

      <ConfirmDangerModal
        isOpen={showWipe}
        title="Wipe entire calendar cache?"
        description="Every economic event will be deleted. The next sync (auto or manual) will repopulate the cache from Biquote."
        confirmPhrase="WIPE"
        confirmLabel="Wipe cache"
        busy={wipeMutation.isPending}
        onCancel={() => setShowWipe(false)}
        onConfirm={handleWipe}
      />
    </>
  );
}

/* --------------------------------- Events -------------------------------- */

function EventsTab() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [currency, setCurrency] = useState('');
  const [impact, setImpact] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const { user } = useAuth();
  const isSuper = user?.role === 'superadmin';

  const filters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      q: q.trim(),
      currency: currency.trim(),
      impact,
      from,
      to,
    }),
    [page, q, currency, impact, from, to]
  );

  const { data, isLoading } = useAdminCalendarEvents(filters);
  const deleteMutation = useAdminDeleteCalendarEvents();

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const hasFilter = q || currency || impact || from || to;

  const clearFilters = () => {
    setQ('');
    setCurrency('');
    setImpact('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const handleDeleteOne = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ ids: [deleteTarget.id] });
      toast.success('Event deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.message || 'Delete failed');
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const r = await deleteMutation.mutateAsync({
        currency: currency.trim() || undefined,
        impact: impact || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      toast.success(`Deleted ${r.deleted} events`);
      setShowBulkDelete(false);
    } catch (err) {
      toast.error(err?.message || 'Bulk delete failed');
      setShowBulkDelete(false);
    }
  };

  const bulkFilterLabel = [
    currency && `currency "${currency}"`,
    impact && `impact "${impact}"`,
    from && `from ${from}`,
    to && `to ${to}`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <div className="acal-toolbar">
        <div className="acal-search">
          <Search size={14} className="acal-search-icon" />
          <input
            placeholder="Search event / currency / country…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>

        <input
          className="acal-input-sm"
          placeholder="Currency"
          value={currency}
          onChange={(e) => { setCurrency(e.target.value.toUpperCase()); setPage(1); }}
        />

        <select
          className="acal-select"
          value={impact}
          onChange={(e) => { setImpact(e.target.value); setPage(1); }}
        >
          <option value="">All impacts</option>
          {IMPACTS.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>

        <input
          type="date"
          className="acal-input-sm"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          title="From"
        />
        <input
          type="date"
          className="acal-input-sm"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          title="To"
        />

        <div className="acal-spacer" />

        {hasFilter && (
          <button type="button" className="acal-btn" onClick={clearFilters}>
            Clear
          </button>
        )}

        {isSuper && (currency || impact || from || to) && (
          <button
            type="button"
            className="acal-btn danger"
            onClick={() => setShowBulkDelete(true)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 size={12} /> Delete filtered
          </button>
        )}
      </div>

      <div className="acal-card">
        <div className="acal-card-head">
          <Calendar size={14} style={{ color: 'var(--accent)' }} />
          <span className="acal-card-title">Economic events</span>
          <span className="acal-card-note">
            {total.toLocaleString()} total · {events.length} shown
          </span>
        </div>
        <div className="acal-card-body no-pad">
          {isLoading ? (
            <div className="acal-loading">Loading events…</div>
          ) : events.length === 0 ? (
            <div className="acal-empty">No events match the current filters.</div>
          ) : (
            <table className="acal-table">
              <thead>
                <tr>
                  <th className="acal-th">Date / time</th>
                  <th className="acal-th">Cur</th>
                  <th className="acal-th">Event</th>
                  <th className="acal-th">Impact</th>
                  <th className="acal-th right">Actual</th>
                  <th className="acal-th right">Forecast</th>
                  <th className="acal-th right">Previous</th>
                  <th className="acal-th right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="acal-tr">
                    <td className="acal-td muted">{fmtDate(e.dateTimeUtc)}</td>
                    <td className="acal-td">
                      <span className="acal-cur">{e.currency}</span>
                    </td>
                    <td className="acal-td">{e.event}</td>
                    <td className="acal-td">
                      <span className={`acal-pill ${e.impact}`}>{e.impact}</span>
                    </td>
                    <td className="acal-td right muted">{e.actual ?? '—'}</td>
                    <td className="acal-td right muted">{e.forecast ?? '—'}</td>
                    <td className="acal-td right muted">{e.previous ?? '—'}</td>
                    <td className="acal-td right">
                      {isSuper && (
                        <button
                          type="button"
                          className="acal-btn-icon"
                          onClick={() => setDeleteTarget(e)}
                          disabled={deleteMutation.isPending}
                          title="Delete event"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {pages > 1 && (
        <div className="acal-pager">
          <button
            type="button"
            className="acal-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={12} /> Prev
          </button>
          <span className="acal-pager-info">
            Page {page} of {pages} · {total.toLocaleString()} total
          </span>
          <button
            type="button"
            className="acal-btn"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight size={12} />
          </button>
        </div>
      )}

      <ConfirmDangerModal
        isOpen={!!deleteTarget}
        title={deleteTarget ? `Delete "${deleteTarget.event}"?` : ''}
        description="This permanently removes the event from the calendar."
        confirmPhrase="DELETE"
        confirmLabel="Delete event"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteOne}
      />

      <ConfirmDangerModal
        isOpen={showBulkDelete}
        title="Delete all filtered events?"
        description={`This permanently deletes every event matching: ${bulkFilterLabel || '(no filter)'}. Cannot be undone.`}
        confirmPhrase="DELETE"
        confirmLabel="Delete filtered"
        busy={deleteMutation.isPending}
        onCancel={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}

/* ------------------------------- Sync tab -------------------------------- */

function SyncImportTab() {
  const syncRangeMutation = useAdminSyncCalendarRange();
  const importMutation = useAdminImportCalendar();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [mode, setMode] = useState('merge');

  const handleSyncRange = async () => {
    if (!from && !to) {
      toast.error('Provide a from date, a to date, or both');
      return;
    }
    try {
      const r = await syncRangeMutation.mutateAsync({ from, to });
      const fetched = r.result?.fetched ?? '?';
      toast.success(`Sync complete in ${r.elapsedMs}ms · fetched ${fetched}`);
    } catch (err) {
      toast.error(err?.message || 'Sync failed');
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setJsonText(String(evt.target?.result || ''));
    reader.onerror = () => toast.error('Could not read file');
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    let rows;
    try {
      rows = JSON.parse(jsonText);
    } catch (err) {
      toast.error('Invalid JSON: ' + err.message);
      return;
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      toast.error('JSON must be a non-empty array of event objects');
      return;
    }
    if (!window.confirm(`Import ${rows.length} events in "${mode}" mode?`)) return;

    try {
      const r = await importMutation.mutateAsync({ rows, mode });
      const parts = [`created ${r.created}`, `updated ${r.updated}`];
      if (r.cleared) parts.push(`cleared ${r.cleared}`);
      toast.success(`Import complete · ${parts.join(', ')}`);
      setJsonText('');
    } catch (err) {
      toast.error(err?.message || 'Import failed');
    }
  };

  return (
    <>
      <div className="acal-card">
        <div className="acal-card-head">
          <RefreshCw size={14} style={{ color: 'var(--accent)' }} />
          <span className="acal-card-title">Sync a custom date range from Biquote</span>
        </div>
        <div className="acal-card-body">
          <p className="acal-hint">
            Fetch fresh events for an explicit window. If you leave both fields
            empty the server falls back to the default auto-sync window.
            Maximum range is 365 days.
          </p>
          <div className="acal-row">
            <div className="acal-field">
              <label className="acal-label">From</label>
              <input
                type="date"
                className="acal-input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="acal-field">
              <label className="acal-label">To</label>
              <input
                type="date"
                className="acal-input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="acal-field" style={{ minWidth: 0 }}>
              <button
                type="button"
                className="acal-btn amber"
                onClick={handleSyncRange}
                disabled={syncRangeMutation.isPending}
              >
                <RefreshCw
                  size={12}
                  className={syncRangeMutation.isPending ? 'acal-spin' : ''}
                />
                {syncRangeMutation.isPending ? 'Syncing…' : 'Sync range'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="acal-card">
        <div className="acal-card-head">
          <FileJson size={14} style={{ color: 'var(--accent)' }} />
          <span className="acal-card-title">Import events from JSON</span>
        </div>
        <div className="acal-card-body">
          <p className="acal-hint">
            Paste an array of events, or upload a <code>.json</code> file. Each
            row requires <code>externalId</code>, <code>dateTimeUtc</code>,{' '}
            <code>currency</code> and <code>event</code>. "Merge" upserts by
            externalId. "Replace" wipes the table first.
          </p>

          <div className="acal-row">
            <select
              className="acal-select"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              disabled={importMutation.isPending}
            >
              <option value="merge">Merge (upsert)</option>
              <option value="replace">Replace (wipe + import)</option>
            </select>

            <label className="acal-btn" style={{ cursor: 'pointer' }}>
              <Upload size={12} /> Upload file
              <input
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleFile}
                disabled={importMutation.isPending}
              />
            </label>

            <div className="acal-spacer" />

            <button
              type="button"
              className="acal-btn amber"
              onClick={handleImport}
              disabled={!jsonText.trim() || importMutation.isPending}
            >
              <Upload size={12} />
              {importMutation.isPending ? 'Importing…' : 'Import'}
            </button>
          </div>

          <textarea
            className="acal-textarea"
            placeholder={
              '[\n  {\n    "externalId": "abc-123",\n    "dateTimeUtc": "2026-01-15T13:30:00Z",\n    "currency": "USD",\n    "event": "CPI YoY",\n    "impact": "high",\n    "actual": "3.2",\n    "forecast": "3.1",\n    "previous": "3.0"\n  }\n]'
            }
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            disabled={importMutation.isPending}
          />
        </div>
      </div>
    </>
  );
}

/* ---------------------------------- Logs --------------------------------- */

function LogsTab() {
  const { data, isLoading } = useAdminCalendarLogs();
  const logs = data?.entries ?? [];

  return (
    <div className="acal-card">
      <div className="acal-card-head">
        <Calendar size={14} style={{ color: 'var(--accent)' }} />
        <span className="acal-card-title">Recent manual syncs</span>
        <span className="acal-card-note">last 20</span>
      </div>
      <div className="acal-card-body no-pad">
        {isLoading ? (
          <div className="acal-empty">Loading logs…</div>
        ) : logs.length === 0 ? (
          <div className="acal-empty">
            No manual syncs recorded yet. Background syncs run every 60s but are
            not recorded in this buffer — only manual triggers are logged here.
          </div>
        ) : (
          <table className="acal-table">
            <thead>
              <tr>
                <th className="acal-th">When</th>
                <th className="acal-th">Triggered by</th>
                <th className="acal-th">Result</th>
                <th className="acal-th">Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="acal-td muted">{fmtDate(l.at)}</td>
                  <td className="acal-td">{l.actor || '—'}</td>
                  <td className={`acal-td ${l.ok ? 'ok' : 'bad'}`}>
                    {l.ok ? 'OK' : `Error: ${l.error || 'unknown'}`}
                  </td>
                  <td className="acal-td muted">{l.elapsedMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- Root --------------------------------- */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'events',   label: 'Events' },
  { id: 'sync',     label: 'Sync & Import' },
  { id: 'logs',     label: 'Logs' },
];

export default function AdminCalendarPage() {
  const [tab, setTab] = useState('overview');

  useAdminPageHeader({
    eyebrow: 'Operations',
    title: 'Calendar',
    subtitle: 'Biquote economic events · view · import · sync · delete',
  });

  return (
    <>
      <style>{CSS}</style>
      <div className="acal-root">
        <div className="acal-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`acal-tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'events'   && <EventsTab />}
        {tab === 'sync'     && <SyncImportTab />}
        {tab === 'logs'     && <LogsTab />}
      </div>
    </>
  );
}
