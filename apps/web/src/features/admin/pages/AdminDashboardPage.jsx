import { useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Wallet,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';

// Safety: ensure Chart.js is registered even if main.jsx somehow missed it.
import '@/shared/charts/register';

import { useAdminMe, useAdminStats, useAdminHealth } from '../api';
import StatCard from '../components/StatCard';
import {
  chartColors,
  baseTooltip,
  baseAxis,
  baseCategoryAxis,
} from '@/shared/charts/theme';

const CSS = `
  .ad-root { display: flex; flex-direction: column; gap: 22px; }
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
    text-transform: uppercase; color: var(--accent); opacity: .85;
  }
  .ad-panel-body { padding: 16px 18px; }
  .ad-chart-wrap { height: 220px; width: 100%; }
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

function useSignupChartData(signups) {
  return useMemo(() => {
    if (!Array.isArray(signups) || signups.length === 0) return null;
    return {
      labels: signups.map((s) => String(s?.date || '').slice(5)),
      datasets: [
        {
          label: 'Signups',
          data: signups.map((s) => Number(s?.count) || 0),
          backgroundColor: chartColors.amber,
          hoverBackgroundColor: chartColors.amberHover,
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.8,
          categoryPercentage: 0.85,
        },
      ],
    };
  }, [signups]);
}

const signupOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  plugins: {
    legend: { display: false },
    tooltip: baseTooltip({
      callbacks: { label: (item) => `${item.parsed.y} signups` },
    }),
  },
  scales: {
    x: baseCategoryAxis({
      ticks: {
        color: chartColors.textLight,
        font: { family: "'IBM Plex Mono', monospace", size: 9 },
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 10,
      },
    }),
    y: baseAxis({
      ticks: {
        color: chartColors.text,
        font: { family: "'IBM Plex Mono', monospace", size: 10 },
        precision: 0,
      },
    }),
  },
};

export default function AdminDashboardPage() {
  const meQuery     = useAdminMe();
  const statsQuery  = useAdminStats();
  const healthQuery = useAdminHealth();

  const me     = meQuery.data;
  const stats  = statsQuery.data;
  const health = healthQuery.data;
  const statsLoading = statsQuery.isLoading;

  const chartData = useSignupChartData(stats?.signups);

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

  return (
    <>
      <style>{CSS}</style>
      <div className="ad-root">
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
            ) : !chartData ? (
              <div className="ad-loading">
                {statsQuery.isError
                  ? 'Stats failed to load'
                  : 'No signup data yet'}
              </div>
            ) : (
              <div className="ad-chart-wrap">
                <Bar data={chartData} options={signupOptions} />
              </div>
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
                  {health?.status === 'ok'
                    ? 'All good'
                    : health
                      ? 'Degraded'
                      : '—'}
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