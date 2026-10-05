// apps/web/src/features/admin/pages/AdminCalendarPage.jsx
//
// Calendar cache panel: force sync, wipe cache (superadmin only), view
// recent manual sync logs.

import { useState } from 'react';
import { RefreshCw, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import {
  useAdminCalendarLogs,
  useAdminCalendarSync,
  useAdminCalendarWipe,
} from '../api';
import ConfirmDangerModal from '../components/ConfirmDangerModal';

const CSS = `
  .acal-root { display: flex; flex-direction: column; gap: 18px; }

  .acal-actions {
    display: flex; gap: 10px; flex-wrap: wrap;
  }
  .acal-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 16px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600;
    cursor: pointer;
    transition: all .18s;
    white-space: nowrap;
  }
  .acal-btn:hover:not(:disabled) {
    color: #E7E9EE;
    border-color: rgba(255,255,255,.22);
    background: rgba(255,255,255,.06);
    transform: translateY(-1px);
  }
  .acal-btn:disabled { opacity: .4; cursor: not-allowed; }
  .acal-btn.amber {
    color: #F59E0B;
    border-color: rgba(245,158,11,.35);
    background: rgba(245,158,11,.06);
  }
  .acal-btn.amber:hover:not(:disabled) { background: rgba(245,158,11,.12); }
  .acal-btn.danger {
    color: #f87171;
    border-color: rgba(239,68,68,.35);
    background: rgba(239,68,68,.05);
  }
  .acal-btn.danger:hover:not(:disabled) { background: rgba(239,68,68,.12); }

  .acal-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .acal-card-head {
    padding: 14px 18px 12px;
    border-bottom: 1px solid rgba(255,255,255,.05);
    display: flex; align-items: center; gap: 10px;
  }
  .acal-card-title {
    font-size: 13px; font-weight: 700;
    color: #E7E9EE;
  }
  .acal-card-note {
    margin-left: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; letter-spacing: .06em;
    text-transform: uppercase; color: #F59E0B;
    opacity: .85;
  }
  .acal-card-body { padding: 18px; }

  .acal-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11.5px; }
  .acal-th {
    padding: 10px 12px; text-align: left;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #8892A3; background: rgba(0,0,0,.2);
    border-bottom: 1px solid rgba(255,255,255,.08);
  }
  .acal-td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,.04);
    color: #E7E9EE;
  }
  .acal-td.muted { color: #8892A3; }
  .acal-td.ok  { color: #35C4A1; font-weight: 700; }
  .acal-td.bad { color: #ef4444; font-weight: 700; }

  .acal-empty {
    padding: 40px 20px;
    text-align: center;
    color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
  }
`;

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AdminCalendarPage() {
  const { user: me } = useAuth();
  const isSuper = me?.role === 'superadmin';

  const [showWipeModal, setShowWipeModal] = useState(false);

  const { data, isLoading } = useAdminCalendarLogs();
  const sync = useAdminCalendarSync();
  const wipe = useAdminCalendarWipe();

  const logs = data?.entries || [];

  const handleSync = async () => {
    try {
      const r = await sync.mutateAsync();
      toast.success(
        `Sync complete in ${r.elapsedMs} ms` +
        (r.result ? ` · fetched ${r.result.fetched}` : '')
      );
    } catch (err) {
      toast.error(err?.message || 'Sync failed');
    }
  };

  const handleWipe = async () => {
    try {
      const r = await wipe.mutateAsync();
      toast.success(`Deleted ${r.deleted} cached events`);
      setShowWipeModal(false);
    } catch (err) {
      toast.error(err?.message || 'Wipe failed');
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="acal-root">
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">Operations</span>
            <h1 className="admin-ph-title">Calendar</h1>
            <p className="admin-ph-sub">
              Biquote economic events cache · auto-syncs every 60s in the background
            </p>
          </div>
        </div>

        {/* ---------- Actions ---------- */}
        <div className="acal-actions">
          <button
            type="button"
            className="acal-btn amber"
            onClick={handleSync}
            disabled={sync.isPending}
          >
            <RefreshCw size={12} className={sync.isPending ? 'spin' : ''} />
            {sync.isPending ? 'Syncing…' : 'Force sync now'}
          </button>

          {isSuper && (
            <button
              type="button"
              className="acal-btn danger"
              onClick={() => setShowWipeModal(true)}
              disabled={wipe.isPending}
            >
              <Trash2 size={12} />
              Wipe cache
            </button>
          )}
        </div>

        {/* ---------- Recent sync logs ---------- */}
        <div className="acal-card">
          <div className="acal-card-head">
            <Calendar size={14} style={{ color: '#F59E0B' }} />
            <span className="acal-card-title">Recent manual syncs</span>
            <span className="acal-card-note">last 20</span>
          </div>
          <div className="acal-card-body" style={{ padding: 0 }}>
            {isLoading ? (
              <div className="acal-empty">Loading logs…</div>
            ) : logs.length === 0 ? (
              <div className="acal-empty">
                No manual syncs yet. Background syncs run every 60s but are
                not recorded in this in-memory ring buffer — only manual
                "Force sync" clicks are logged here.
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
      </div>

      <ConfirmDangerModal
        isOpen={showWipeModal}
        title="Wipe calendar cache?"
        description="Deletes every EconomicEvent row. The next sync (auto or manual) will repopulate the cache from Biquote."
        confirmPhrase="WIPE"
        confirmLabel="Wipe cache"
        busy={wipe.isPending}
        onCancel={() => setShowWipeModal(false)}
        onConfirm={handleWipe}
      />
    </>
  );
}