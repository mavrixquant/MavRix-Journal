import { useMemo, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Wallet,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

import { useAdminMe, useAdminStats, useAdminHealth } from '../api';
import StatCard from '../components/StatCard';

const CSS = `
  .admin-dash-root { display: flex; flex-direction: column; gap: 22px; padding: 10px; }
  .admin-dash-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
  }
  .admin-dash-panel {
    position: relative;
    border-radius: 16px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
  }
  .admin-dash-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 14px 18px 11px;
    border-bottom: 1px solid rgba(255,255,255,.05);
  }
  .admin-dash-panel-title { font-size: 13px; font-weight: 700; color: #E7E9EE; }
  .admin-dash-panel-note {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; letter-spacing: .06em;
    text-transform: uppercase; color: #F59E0B; opacity: .85;
  }
  .admin-dash-panel-body { padding: 16px 18px; }
  
  /* Pure CSS/SVG Bar Chart */
  .admin-dash-chart-container {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 220px;
    gap: 4px;
    padding-bottom: 24px;
    border-bottom: 1px solid rgba(255,255,255,.1);
    position: relative;
  }
  .admin-dash-chart-bar-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    height: 100%;
    position: relative;
    min-width: 0;
  }
  .admin-dash-chart-bar {
    width: 100%;
    max-width: 24px;
    background: #F59E0B;
    border-radius: 4px 4px 0 0;
    transition: height .3s ease;
    position: relative;
  }
  .admin-dash-chart-bar:hover { background: #FDE68A; }
  .admin-dash-chart-label {
    position: absolute;
    bottom: -24px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    color: #8892A3;
    transform: rotate(-45deg);
    transform-origin: top left;
    white-space: nowrap;
  }
  .admin-dash-chart-tooltip {
    position: absolute;
    top: -30px;
    background: #11151F;
    border: 1px solid rgba(255,255,255,.1);
    padding: 4px 8px;
    border-radius: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: #fff;
    opacity: 0;
    pointer-events: none;
    transition: opacity .2s;
    white-space: nowrap;
    z-index: 10;
  }
  .admin-dash-chart-bar-wrap:hover .admin-dash-chart-tooltip { opacity: 1; }

  .admin-dash-health-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }
  .admin-dash-health-item {
    display: flex; flex-direction: column; gap: 3px;
    padding: 12px 14px; border-radius: 10px;
    background: rgba(255,255,255,.02);
    border: 1px solid rgba(255,255,255,.05);
  }
  .admin-dash-health-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase; color: #545E6E;
  }
  .admin-dash-health-value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 15px; font-weight: 700; color: #E7E9EE;
  }
  .admin-dash-health-value.is-ok { color: #35C4A1; }
  .admin-dash-health-value.is-bad { color: #ef4444; }
  .admin-dash-loading {
    padding: 60px 20px; text-align: center; color: #8892A3;
    font-family: 'IBM Plex Mono', monospace; font-size: 12.5px;
  }
  .admin-dash-error {
    padding: 24px 20px; text-align: center;
    color: #f87171;
    background: rgba(239,68,68,.06);
    border: 1px solid rgba(239,68,68,.28);
    border-radius: 10px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
`;

function safeNum(v, fallback = '—') {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function CustomBarChart({ data }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="admin-dash-chart-container">
      {data.map((d, i) => {
        const heightPct = Math.max((d.count / maxCount) * 100, 1);
        const dateLabel = d.date ? d.date.slice(5) : '';
        return (
          <div key={i} className="admin-dash-chart-bar-wrap">
            <div className="admin-dash-chart-tooltip">
              {d.date}: {d.count} signups
            </div>
            <div className="admin-dash-chart-bar" style={{ height: `${heightPct}%` }} />
            <span className="admin-dash-chart-label">{dateLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboardPage() {
  const meQuery     = useAdminMe();
  const statsQuery  = useAdminStats();
  const healthQuery = useAdminHealth();

  useEffect(() => {
    console.info('[AdminDashboardPage] mounted. Stats loading:', statsQuery.isLoading);
  }, [statsQuery.isLoading]);

  const me     = meQuery.data;
  const stats  = statsQuery.data;
  const health = healthQuery.data;
  const statsLoading = statsQuery.isLoading;

  const uptimeText = useMemo(() => {
    const s = health?.uptimeSeconds;
    if (!s || typeof s !== 'number') return '—';
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }, [health]);

  const signupData = Array.isArray(stats?.signups) ? stats.signups : null;

  return (
    <>
      <style>{CSS}</style>
      <div className="admin-dash-root">
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">Control Panel</span>
            <h1 className="admin-ph-title">
              Welcome back{me?.firstName ? `, ${me.firstName}` : ''}
            </h1>
            <p className="admin-ph-sub">
              Global overview across all users, accounts, and trades
            </p>
          </div>
        </div>

        {statsQuery.isError && (
          <div className="admin-dash-error">
            <AlertTriangle size={18} />
            <span>Failed to load stats: {statsQuery.error?.message || 'Unknown error'}</span>
            <button
              type="button"
              onClick={() => statsQuery.refetch()}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid rgba(239,68,68,.35)',
                background: 'rgba(239,68,68,.08)',
                color: '#fca5a5',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        <div className="admin-dash-kpi-grid">
          <StatCard
            label="Total Users"
            value={safeNum(stats?.users?.total)}
            sub={`${safeNum(stats?.users?.verified, 0)} verified`}
            accent="amber"
            icon={Users}
          />
          <StatCard
            label="Verified"
            value={safeNum(stats?.users?.verified)}
            sub="email confirmed"
            accent="win"
            icon={UserCheck}
          />
          <StatCard
            label="Banned"
            value={safeNum(stats?.users?.banned)}
            sub="suspended accounts"
            accent={stats?.users?.banned > 0 ? 'loss' : 'plain'}
            icon={UserX}
          />
          <StatCard
            label="Accounts"
            value={safeNum(stats?.accounts?.total)}
            sub="trading accounts"
            icon={Wallet}
          />
          <StatCard
            label="Trades"
            value={safeNum(stats?.trades?.total)}
            sub="across all accounts"
            icon={TrendingUp}
          />
        </div>

        <div className="admin-dash-panel">
          <div className="admin-dash-panel-head">
            <span className="admin-dash-panel-title">Signups · Last 30 days</span>
            <span className="admin-dash-panel-note">daily</span>
          </div>
          <div className="admin-dash-panel-body">
            {statsLoading ? (
              <div className="admin-dash-loading">Loading chart…</div>
            ) : !signupData || signupData.length === 0 ? (
              <div className="admin-dash-loading">
                {statsQuery.isError ? 'Stats failed to load' : 'No signup data yet'}
              </div>
            ) : (
              <CustomBarChart data={signupData} />
            )}
          </div>
        </div>

        <div className="admin-dash-panel">
          <div className="admin-dash-panel-head">
            <span className="admin-dash-panel-title">System Health</span>
            <span className="admin-dash-panel-note">live · 30s</span>
          </div>
          <div className="admin-dash-panel-body">
            <div className="admin-dash-health-grid">
              <div className="admin-dash-health-item">
                <span className="admin-dash-health-label">Database</span>
                <span className={`admin-dash-health-value ${health?.database?.ok ? 'is-ok' : 'is-bad'}`}>
                  {health?.database?.ok ? 'Connected' : (health ? 'Down' : '—')}
                </span>
                <span className="admin-dash-health-label">
                  {typeof health?.database?.latencyMs === 'number'
                    ? `${health.database.latencyMs} ms`
                    : '—'}
                </span>
              </div>
              <div className="admin-dash-health-item">
                <span className="admin-dash-health-label">Uptime</span>
                <span className="admin-dash-health-value">{uptimeText}</span>
                <span className="admin-dash-health-label">process</span>
              </div>
              <div className="admin-dash-health-item">
                <span className="admin-dash-health-label">SSE Clients</span>
                <span className="admin-dash-health-value">
                  {safeNum(health?.sse?.totalClients)}
                </span>
                <span className="admin-dash-health-label">live streams</span>
              </div>
              <div className="admin-dash-health-item">
                <span className="admin-dash-health-label">Memory (RSS)</span>
                <span className="admin-dash-health-value">
                  {typeof health?.memory?.rssMb === 'number'
                    ? `${health.memory.rssMb} MB`
                    : '—'}
                </span>
                <span className="admin-dash-health-label">heap used</span>
              </div>
              <div className="admin-dash-health-item">
                <span className="admin-dash-health-label">Node</span>
                <span className="admin-dash-health-value">{health?.nodeVersion || '—'}</span>
                <span className="admin-dash-health-label">runtime</span>
              </div>
              <div className="admin-dash-health-item">
                <span className="admin-dash-health-label">Status</span>
                <span className={`admin-dash-health-value ${health?.status === 'ok' ? 'is-ok' : 'is-bad'}`}>
                  {health?.status === 'ok' ? 'All good' : health ? 'Degraded' : '—'}
                </span>
                <span className="admin-dash-health-label">overall</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}