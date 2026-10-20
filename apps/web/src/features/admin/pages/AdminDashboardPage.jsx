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
  .ad-root { display: flex; flex-direction: column; gap: 22px; padding: 10px; }
  .ad-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
  }
  .ad-panel {
    position: relative;
    border-radius: 16px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
  }
  .ad-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 14px 18px 11px;
    border-bottom: 1px solid rgba(255,255,255,.05);
  }
  .ad-panel-title { font-size: 13px; font-weight: 700; color: #E7E9EE; }
  .ad-panel-note {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; letter-spacing: .06em;
    text-transform: uppercase; color: #F59E0B; opacity: .85;
  }
  .ad-panel-body { padding: 16px 18px; }
  
  /* Pure CSS/SVG Bar Chart */
  .ad-chart-container {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 220px;
    gap: 4px;
    padding-bottom: 24px;
    border-bottom: 1px solid rgba(255,255,255,.1);
    position: relative;
  }
  .ad-chart-bar-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    height: 100%;
    position: relative;
    min-width: 0;
  }
  .ad-chart-bar {
    width: 100%;
    max-width: 24px;
    background: #F59E0B;
    border-radius: 4px 4px 0 0;
    transition: height .3s ease;
    position: relative;
  }
  .ad-chart-bar:hover { background: #FDE68A; }
  .ad-chart-label {
    position: absolute;
    bottom: -24px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    color: #8892A3;
    transform: rotate(-45deg);
    transform-origin: top left;
    white-space: nowrap;
  }
  .ad-chart-tooltip {
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
  .ad-chart-bar-wrap:hover .ad-chart-tooltip { opacity: 1; }

  .ad-health-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }
  .ad-health-item {
    display: flex; flex-direction: column; gap: 3px;
    padding: 12px 14px; border-radius: 10px;
    background: rgba(255,255,255,.02);
    border: 1px solid rgba(255,255,255,.05);
  }
  .ad-health-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase; color: #545E6E;
  }
  .ad-health-value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 15px; font-weight: 700; color: #E7E9EE;
  }
  .ad-health-value.is-ok { color: #35C4A1; }
  .ad-health-value.is-bad { color: #ef4444; }
  .ad-loading {
    padding: 60px 20px; text-align: center; color: #8892A3;
    font-family: 'IBM Plex Mono', monospace; font-size: 12.5px;
  }
  .ad-error {
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
    <div className="ad-chart-container">
      {data.map((d, i) => {
        const heightPct = Math.max((d.count / maxCount) * 100, 1);
        const dateLabel = d.date ? d.date.slice(5) : '';
        return (
          <div key={i} className="ad-chart-bar-wrap">
            <div className="ad-chart-tooltip">
              {d.date}: {d.count} signups
            </div>
            <div className="ad-chart-bar" style={{ height: `${heightPct}%` }} />
            <span className="ad-chart-label">{dateLabel}</span>
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
      <div className="ad-root">
        {/* DEBUG BANNER - REMOVE AFTER VERIFICATION */}
        <div style={{ background: '#ef4444', color: '#fff', padding: 10, fontSize: 20, textAlign: 'center', borderRadius: 8 }}>
          ADMIN DASHBOARD MOUNTED SUCCESSFULLY
        </div>

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
          <div className="ad-error">
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

        <div className="ad-kpi-grid">
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

        <div className="ad-panel">
          <div className="ad-panel-head">
            <span className="ad-panel-title">Signups · Last 30 days</span>
            <span className="ad-panel-note">daily</span>
          </div>
          <div className="ad-panel-body">
            {statsLoading ? (
              <div className="ad-loading">Loading chart…</div>
            ) : !signupData || signupData.length === 0 ? (
              <div className="ad-loading">
                {statsQuery.isError ? 'Stats failed to load' : 'No signup data yet'}
              </div>
            ) : (
              <CustomBarChart data={signupData} />
            )}
          </div>
        </div>

        <div className="ad-panel">
          <div className="ad-panel-head">
            <span className="ad-panel-title">System Health</span>
            <span className="ad-panel-note">live · 30s</span>
          </div>
          <div className="ad-panel-body">
            <div className="ad-health-grid">
              <div className="ad-health-item">
                <span className="ad-health-label">Database</span>
                <span className={`ad-health-value ${health?.database?.ok ? 'is-ok' : 'is-bad'}`}>
                  {health?.database?.ok ? 'Connected' : (health ? 'Down' : '—')}
                </span>
                <span className="ad-health-label">
                  {typeof health?.database?.latencyMs === 'number'
                    ? `${health.database.latencyMs} ms`
                    : '—'}
                </span>
              </div>
              <div className="ad-health-item">
                <span className="ad-health-label">Uptime</span>
                <span className="ad-health-value">{uptimeText}</span>
                <span className="ad-health-label">process</span>
              </div>
              <div className="ad-health-item">
                <span className="ad-health-label">SSE Clients</span>
                <span className="ad-health-value">
                  {safeNum(health?.sse?.totalClients)}
                </span>
                <span className="ad-health-label">live streams</span>
              </div>
              <div className="ad-health-item">
                <span className="ad-health-label">Memory (RSS)</span>
                <span className="ad-health-value">
                  {typeof health?.memory?.rssMb === 'number'
                    ? `${health.memory.rssMb} MB`
                    : '—'}
                </span>
                <span className="ad-health-label">heap used</span>
              </div>
              <div className="ad-health-item">
                <span className="ad-health-label">Node</span>
                <span className="ad-health-value">{health?.nodeVersion || '—'}</span>
                <span className="ad-health-label">runtime</span>
              </div>
              <div className="ad-health-item">
                <span className="ad-health-label">Status</span>
                <span className={`ad-health-value ${health?.status === 'ok' ? 'is-ok' : 'is-bad'}`}>
                  {health?.status === 'ok' ? 'All good' : health ? 'Degraded' : '—'}
                </span>
                <span className="ad-health-label">overall</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}