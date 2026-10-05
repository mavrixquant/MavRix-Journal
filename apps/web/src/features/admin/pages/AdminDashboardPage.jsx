// apps/web/src/features/admin/pages/AdminDashboardPage.jsx
//
// Admin overview — the first thing an admin sees after logging in.
//
// Sections:
//   1. Header (title + sub)
//   2. KPI strip (5 stat cards)
//   3. Signup chart (30-day bar chart)
//   4. Health panel (DB, memory, SSE, uptime)

import { useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Wallet,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';

import {
  useAdminMe,
  useAdminStats,
  useAdminHealth,
} from '../api';
import StatCard from '../components/StatCard';
import { chartColors, baseTooltip, baseAxis, baseCategoryAxis } from '@/shared/charts/theme';

/* ------------------------------------------------------------------ */
/*  Local page styles                                                  */
/* ------------------------------------------------------------------ */
const CSS = `
  .ad-root {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
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
  .ad-panel-title {
    font-size: 13px;
    font-weight: 700;
    color: #E7E9EE;
    letter-spacing: -.005em;
  }
  .ad-panel-note {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #F59E0B;
    opacity: .85;
  }
  .ad-panel-body {
    padding: 16px 18px;
  }
  .ad-chart-wrap {
    height: 220px;
    width: 100%;
  }
  .ad-health-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }
  .ad-health-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(255,255,255,.02);
    border: 1px solid rgba(255,255,255,.05);
  }
  .ad-health-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: #545E6E;
  }
  .ad-health-value {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 15px;
    font-weight: 700;
    color: #E7E9EE;
  }
  .ad-health-value.is-ok { color: #35C4A1; }
  .ad-health-value.is-bad { color: #ef4444; }
  .ad-loading {
    padding: 60px 20px;
    text-align: center;
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }
`;

/* ------------------------------------------------------------------ */
/*  Chart options                                                     */
/* ------------------------------------------------------------------ */
function useSignupChartData(signups = []) {
  return useMemo(() => {
    if (!signups || signups.length === 0) return null;
    return {
      labels: signups.map((s) => s.date.slice(5)),  // MM-DD
      datasets: [
        {
          label: 'Signups',
          data: signups.map((s) => s.count),
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
      callbacks: {
        label: (item) => `${item.parsed.y} signups`,
      },
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

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function AdminDashboardPage() {
  const { data: me } = useAdminMe();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: health } = useAdminHealth();

  const chartData = useSignupChartData(stats?.signups);

  const uptimeText = useMemo(() => {
    if (!health?.uptimeSeconds) return '—';
    const s = health.uptimeSeconds;
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
        {/* ---------- Header ---------- */}
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

        {/* ---------- KPI strip ---------- */}
        <div className="ad-kpi-grid">
          <StatCard
            label="Total Users"
            value={stats?.users.total ?? '—'}
            sub={`${stats?.users.verified ?? 0} verified`}
            accent="amber"
            icon={Users}
          />
          <StatCard
            label="Verified"
            value={stats?.users.verified ?? '—'}
            sub="email confirmed"
            accent="win"
            icon={UserCheck}
          />
          <StatCard
            label="Banned"
            value={stats?.users.banned ?? '—'}
            sub="suspended accounts"
            accent={stats?.users.banned > 0 ? 'loss' : 'plain'}
            icon={UserX}
          />
          <StatCard
            label="Accounts"
            value={stats?.accounts.total ?? '—'}
            sub="trading accounts"
            icon={Wallet}
          />
          <StatCard
            label="Trades"
            value={stats?.trades.total ?? '—'}
            sub="across all accounts"
            icon={TrendingUp}
          />
        </div>

        {/* ---------- Signup chart ---------- */}
        <div className="ad-panel">
          <div className="ad-panel-head">
            <span className="ad-panel-title">Signups · Last 30 days</span>
            <span className="ad-panel-note">daily</span>
          </div>
          <div className="ad-panel-body">
            {statsLoading || !chartData ? (
              <div className="ad-loading">Loading chart…</div>
            ) : (
              <div className="ad-chart-wrap">
                <Bar data={chartData} options={signupOptions} />
              </div>
            )}
          </div>
        </div>

        {/* ---------- Health panel ---------- */}
        <div className="ad-panel">
          <div className="ad-panel-head">
            <span className="ad-panel-title">System Health</span>
            <span className="ad-panel-note">live · 30s</span>
          </div>
          <div className="ad-panel-body">
            <div className="ad-health-grid">
              <div className="ad-health-item">
                <span className="ad-health-label">Database</span>
                <span className={`ad-health-value ${health?.database.ok ? 'is-ok' : 'is-bad'}`}>
                  {health?.database.ok ? 'Connected' : 'Down'}
                </span>
                <span className="ad-health-label">
                  {health?.database.latencyMs != null ? `${health.database.latencyMs} ms` : '—'}
                </span>
              </div>
              <div className="ad-health-item">
                <span className="ad-health-label">Uptime</span>
                <span className="ad-health-value">{uptimeText}</span>
                <span className="ad-health-label">process</span>
              </div>
              <div className="ad-health-item">
                <span className="ad-health-label">SSE Clients</span>
                <span className="ad-health-value">{health?.sse.totalClients ?? '—'}</span>
                <span className="ad-health-label">live streams</span>
              </div>
              <div className="ad-health-item">
                <span className="ad-health-label">Memory (RSS)</span>
                <span className="ad-health-value">
                  {health?.memory?.rssMb != null ? `${health.memory.rssMb} MB` : '—'}
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
                  {health?.status === 'ok' ? 'All good' : 'Degraded'}
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