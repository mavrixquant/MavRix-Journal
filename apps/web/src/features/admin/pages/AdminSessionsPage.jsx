// apps/web/src/features/admin/pages/AdminSessionsPage.jsx
//
// Live SSE session panel. Shows total open streams; allows kicking a
// specific user's streams by ID.
//
// Note: this page shows aggregate counts only — we deliberately do NOT
// enumerate per-user SSE lists here, because the API's getActiveSessions()
// returns only the total. Future enhancement: extend the API to return
// a userId → count map.

import { useState } from 'react';
import { Radio, Power, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { useAdminSessions, useAdminDisconnectSession } from '../api';

const CSS = `
  .asp-root { display: flex; flex-direction: column; gap: 18px; }

  .asp-stat {
    display: flex; align-items: center; gap: 16px;
    padding: 20px 24px;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
  }
  .asp-stat-icon {
    width: 48px; height: 48px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 14px;
    background: rgba(245,158,11,.10);
    border: 1px solid rgba(245,158,11,.3);
    color: #F59E0B;
    box-shadow: 0 0 24px -8px rgba(245,158,11,.55);
  }
  .asp-stat-meta { display: flex; flex-direction: column; gap: 4px; }
  .asp-stat-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase;
    color: #545E6E;
  }
  .asp-stat-value {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 26px; font-weight: 700;
    color: #E7E9EE; letter-spacing: -.01em;
    line-height: 1.1;
  }
  .asp-stat-sub {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: #545E6E;
  }

  .asp-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .asp-card-head {
    padding: 14px 18px 12px;
    border-bottom: 1px solid rgba(255,255,255,.05);
    display: flex; align-items: center; gap: 10px;
  }
  .asp-card-title {
    font-size: 13px; font-weight: 700;
    color: #E7E9EE;
  }
  .asp-card-note {
    margin-left: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; letter-spacing: .06em;
    text-transform: uppercase; color: #F59E0B;
    opacity: .85;
  }
  .asp-card-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }

  .asp-form { display: flex; gap: 10px; flex-wrap: wrap; }
  .asp-input {
    flex: 1; min-width: 220px;
    padding: 9px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    outline: none;
    box-sizing: border-box;
  }
  .asp-input:focus { border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,.15); }

  .asp-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px;
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
  .asp-btn:hover:not(:disabled) {
    color: #E7E9EE;
    border-color: rgba(255,255,255,.22);
    background: rgba(255,255,255,.06);
  }
  .asp-btn:disabled { opacity: .4; cursor: not-allowed; }
  .asp-btn.danger {
    color: #f87171;
    border-color: rgba(239,68,68,.35);
    background: rgba(239,68,68,.05);
  }
  .asp-btn.danger:hover:not(:disabled) {
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55);
  }

  .asp-hint {
    margin: 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    line-height: 1.65;
    color: #8892A3;
  }
  .asp-hint strong { color: #E7E9EE; font-weight: 700; }
`;

export default function AdminSessionsPage() {
  const [userId, setUserId] = useState('');
  const { data, isLoading, refetch, isFetching } = useAdminSessions();
  const disconnect = useAdminDisconnectSession();

  const totalClients = data?.totalClients ?? 0;

  const handleDisconnect = async () => {
    const id = userId.trim();
    if (!id) { toast.error('Enter a user ID'); return; }
    if (!window.confirm(`Disconnect all SSE streams for user ${id}?`)) return;
    try {
      const r = await disconnect.mutateAsync(id);
      toast.success(`Closed ${r.closedSockets} stream${r.closedSockets === 1 ? '' : 's'}`);
      setUserId('');
    } catch (err) {
      toast.error(err?.message || 'Disconnect failed');
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="asp-root">
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">Operations</span>
            <h1 className="admin-ph-title">Sessions</h1>
            <p className="admin-ph-sub">
              Live Server-Sent Events (SSE) streams · refreshed every 15s
            </p>
          </div>
          <div className="admin-ph-right">
            <button
              type="button"
              className="asp-btn"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw size={12} className={isFetching ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* ---------- Aggregate stat ---------- */}
        <div className="asp-stat">
          <div className="asp-stat-icon">
            <Radio size={20} />
          </div>
          <div className="asp-stat-meta">
            <span className="asp-stat-label">Open SSE streams</span>
            <span className="asp-stat-value">
              {isLoading ? '…' : totalClients}
            </span>
            <span className="asp-stat-sub">
              one stream per open browser tab running the main app
            </span>
          </div>
        </div>

        {/* ---------- Disconnect panel ---------- */}
        <div className="asp-card">
          <div className="asp-card-head">
            <Power size={14} style={{ color: '#ef4444' }} />
            <span className="asp-card-title">Force disconnect a user</span>
          </div>
          <div className="asp-card-body">
            <p className="asp-hint">
              Closes every SSE stream for the given <strong>user ID</strong>.
              This does NOT revoke their tokens — for that, use{' '}
              <strong>Force logout</strong> on the user detail page.
              Sessions page is for kicking a stuck browser.
            </p>
            <div className="asp-form">
              <input
                className="asp-input"
                placeholder="User ID (cuid)…"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                spellCheck={false}
              />
              <button
                type="button"
                className="asp-btn danger"
                onClick={handleDisconnect}
                disabled={disconnect.isPending || !userId.trim()}
              >
                <Power size={12} />
                {disconnect.isPending ? 'Disconnecting…' : 'Disconnect streams'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}