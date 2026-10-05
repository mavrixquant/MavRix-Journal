// apps/web/src/features/admin/pages/AdminSystemPage.jsx
//
// Full system diagnostics. Same data source as the dashboard health panel,
// but with more detail and auto-refresh every 10 seconds.

import { Activity, Database, Cpu, HardDrive, Radio, Clock } from 'lucide-react';

import { useAdminHealth, useAdminStats } from '../api';

const CSS = `
  .asy-root { display: flex; flex-direction: column; gap: 18px; }

  .asy-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 14px;
  }
  .asy-tile {
    padding: 18px 20px;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    display: flex; flex-direction: column; gap: 12px;
  }
  .asy-tile-head {
    display: flex; align-items: center; gap: 10px;
  }
  .asy-tile-icon {
    width: 36px; height: 36px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 10px;
    background: rgba(245,158,11,.10);
    border: 1px solid rgba(245,158,11,.30);
    color: #F59E0B;
    flex-shrink: 0;
  }
  .asy-tile-icon.ok  { color: #35C4A1; background: rgba(53,196,161,.10); border-color: rgba(53,196,161,.30); }
  .asy-tile-icon.bad { color: #ef4444; background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.30); }

  .asy-tile-title {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase;
    color: #545E6E;
  }
  .asy-tile-value {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 22px; font-weight: 700;
    color: #E7E9EE; letter-spacing: -.01em;
    line-height: 1.15;
  }
  .asy-tile-value.ok  { color: #35C4A1; }
  .asy-tile-value.bad { color: #ef4444; }

  .asy-kv {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 6px 14px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
  }
  .asy-kv dt { color: #545E6E; }
  .asy-kv dd { color: #E7E9EE; margin: 0; word-break: break-all; }

  .asy-loading {
    padding: 60px 24px; text-align: center;
    color: #8892A3; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }
  .spin { animation: asySpin 1s linear infinite; }
  @keyframes asySpin { to { transform: rotate(360deg); } }
`;

function fmtUptime(seconds) {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export default function AdminSystemPage() {
  const { data: health, isLoading } = useAdminHealth();
  const { data: stats } = useAdminStats();

  if (isLoading) return <div className="asy-loading">Loading system health…</div>;

  const dbOk = health?.database?.ok;
  const overallOk = health?.status === 'ok';

  return (
    <>
      <style>{CSS}</style>
      <div className="asy-root">
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">System</span>
            <h1 className="admin-ph-title">System health</h1>
            <p className="admin-ph-sub">
              Live diagnostics · auto-refreshes every 30s
            </p>
          </div>
        </div>

        <div className="asy-grid">
          {/* Overall status */}
          <div className="asy-tile">
            <div className="asy-tile-head">
              <span className={`asy-tile-icon ${overallOk ? 'ok' : 'bad'}`}>
                <Activity size={16} />
              </span>
              <span className="asy-tile-title">Overall status</span>
            </div>
            <span className={`asy-tile-value ${overallOk ? 'ok' : 'bad'}`}>
              {overallOk ? 'All systems' : 'Degraded'}
            </span>
          </div>

          {/* Uptime */}
          <div className="asy-tile">
            <div className="asy-tile-head">
              <span className="asy-tile-icon">
                <Clock size={16} />
              </span>
              <span className="asy-tile-title">Process uptime</span>
            </div>
            <span className="asy-tile-value">{fmtUptime(health?.uptimeSeconds)}</span>
          </div>

          {/* Database */}
          <div className="asy-tile">
            <div className="asy-tile-head">
              <span className={`asy-tile-icon ${dbOk ? 'ok' : 'bad'}`}>
                <Database size={16} />
              </span>
              <span className="asy-tile-title">Database</span>
            </div>
            <span className={`asy-tile-value ${dbOk ? 'ok' : 'bad'}`}>
              {dbOk ? 'Connected' : 'Down'}
            </span>
            <span className="asy-tile-title" style={{ letterSpacing: 0, textTransform: 'none' }}>
              Latency: {health?.database?.latencyMs ?? '—'} ms
            </span>
          </div>

          {/* SSE */}
          <div className="asy-tile">
            <div className="asy-tile-head">
              <span className="asy-tile-icon">
                <Radio size={16} />
              </span>
              <span className="asy-tile-title">SSE streams</span>
            </div>
            <span className="asy-tile-value">{health?.sse?.totalClients ?? 0}</span>
          </div>
        </div>

        {/* ---------- Memory ---------- */}
        <div className="asy-tile">
          <div className="asy-tile-head">
            <span className="asy-tile-icon">
              <Cpu size={16} />
            </span>
            <span className="asy-tile-title">Memory</span>
          </div>
          <dl className="asy-kv">
            <dt>RSS</dt>         <dd>{health?.memory?.rssMb} MB</dd>
            <dt>Heap used</dt>   <dd>{health?.memory?.heapUsedMb} MB</dd>
            <dt>Heap total</dt>  <dd>{health?.memory?.heapTotalMb} MB</dd>
            <dt>Node</dt>        <dd>{health?.nodeVersion}</dd>
          </dl>
        </div>

        {/* ---------- Counts ---------- */}
        <div className="asy-tile">
          <div className="asy-tile-head">
            <span className="asy-tile-icon">
              <HardDrive size={16} />
            </span>
            <span className="asy-tile-title">Data counts</span>
          </div>
          <dl className="asy-kv">
            <dt>Users</dt>       <dd>{stats?.users?.total ?? '—'}</dd>
            <dt>Verified</dt>    <dd>{stats?.users?.verified ?? '—'}</dd>
            <dt>Banned</dt>      <dd>{stats?.users?.banned ?? '—'}</dd>
            <dt>Accounts</dt>    <dd>{stats?.accounts?.total ?? '—'}</dd>
            <dt>Trades</dt>      <dd>{stats?.trades?.total ?? '—'}</dd>
          </dl>
        </div>
      </div>
    </>
  );
}