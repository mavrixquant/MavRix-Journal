// apps/web/src/features/manage/strategies/StrategyDetailPage.jsx
//
// /manage/strategies/:id — detail page.
//
// Shows strategy meta + rules, KPIs computed from tagged trades, and the
// list of trades belonging to this strategy. Edit / archive / delete are
// available from the header.

import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  FaArrowLeft,
  FaEdit,
  FaArchive,
  FaTrash,
} from 'react-icons/fa';
import { toast } from 'sonner';

import {
  useStrategy,
  useStrategyTrades,
  useArchiveStrategy,
  useDeleteStrategy,
} from '@/shared/api/strategies';
import Alert from '@/shared/components/Alert';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import DataTable from '@/shared/ui/data-table';

import StrategyFormModal from './StrategyFormModal';
import './StrategiesPage.css';
import '@/shared/ui/page-header.css';

function fmtMoney(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function fmtPct(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return `${Number(v).toFixed(1)}%`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function DirText({ value }) {
  if (!value) return '—';
  const color = value === 'Long' ? '#35C4A1' : '#FF5C5C';
  return <span style={{ color, fontWeight: 600 }}>{value}</span>;
}

export default function StrategyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: strategy, isLoading: stratLoading, isError: stratError, error: stratErr } = useStrategy(id);
  const { data: trades = [], isLoading: tradesLoading } = useStrategyTrades(id);

  const archiveMutation = useArchiveStrategy();
  const deleteMutation = useDeleteStrategy();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  /* ---------- KPI computation ---------- */
  const kpis = useMemo(() => {
    if (!trades.length) {
      return {
        total: 0, wins: 0, losses: 0,
        winRate: 0, net: 0, best: null, worst: null,
      };
    }
    let wins = 0, losses = 0, net = 0;
    let best = null, worst = null;
    for (const t of trades) {
      const pnl = Number(t.pnl) || 0;
      net += pnl;
      if (pnl > 0) wins++;
      else if (pnl < 0) losses++;
      if (best === null || pnl > best) best = pnl;
      if (worst === null || pnl < worst) worst = pnl;
    }
    const decided = wins + losses;
    return {
      total: trades.length,
      wins,
      losses,
      winRate: decided > 0 ? (wins / decided) * 100 : 0,
      net,
      best,
      worst,
    };
  }, [trades]);

  /* ---------- Trade list columns ---------- */
  const columns = useMemo(() => [
    {
      id: 'date',
      accessorKey: 'date',
      header: 'Date',
      meta: { label: 'Date' },
      size: 110,
      cell: (ctx) => ctx.getValue() || '—',
    },
    {
      id: 'entry',
      accessorKey: 'entryTime',
      header: 'Entry',
      meta: { label: 'Entry' },
      size: 80,
      cell: (ctx) => ctx.getValue() || '—',
    },
    {
      id: 'exit',
      accessorKey: 'exitTime',
      header: 'Exit',
      meta: { label: 'Exit' },
      size: 80,
      cell: (ctx) => ctx.getValue() || '—',
    },
    {
      id: 'direction',
      accessorKey: 'direction',
      header: 'Dir',
      meta: { label: 'Direction' },
      size: 70,
      cell: (ctx) => <DirText value={ctx.getValue()} />,
    },
    {
      id: 'symbol',
      accessorKey: 'symbol',
      header: 'Symbol',
      meta: { label: 'Symbol' },
      size: 90,
      cell: (ctx) => ctx.getValue() || '—',
    },
    {
      id: 'pnl',
      accessorKey: 'pnl',
      header: 'P&L',
      meta: { label: 'P&L' },
      size: 110,
      cell: (ctx) => {
        const v = Number(ctx.getValue() ?? 0);
        const cls = v >= 0 ? 'dt-cell-pos' : 'dt-cell-neg';
        return <span className={cls}>{fmtMoney(v)}</span>;
      },
    },
    {
      id: 'quantity',
      accessorKey: 'quantity',
      header: 'Qty',
      meta: { label: 'Quantity' },
      size: 70,
      cell: (ctx) => {
        const v = ctx.getValue();
        return v == null ? '—' : String(v);
      },
    },
    {
      id: 'notes',
      accessorKey: 'notes',
      header: 'Notes',
      meta: { label: 'Notes' },
      size: 240,
      cell: (ctx) => ctx.getValue() || '—',
    },
  ], []);

  /* ---------- Handlers ---------- */
  const handleArchive = async () => {
    try {
      await archiveMutation.mutateAsync(strategy.id);
      toast.success(`"${strategy.name}" archived`);
      setArchiveOpen(false);
    } catch (err) {
      toast.error(err?.message || 'Archive failed');
      setArchiveOpen(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await deleteMutation.mutateAsync(strategy.id);
      const detached = res?.detachedTrades ?? kpis.total;
      toast.success(
        detached > 0
          ? `Deleted — ${detached} trade${detached === 1 ? '' : 's'} untagged`
          : 'Strategy deleted'
      );
      setDeleteOpen(false);
      navigate('/manage/strategies', { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Delete failed');
      setDeleteOpen(false);
    }
  };

  /* ---------- Early returns ---------- */
  if (stratLoading) return <PageSkeleton />;

  if (stratError || !strategy) {
    return (
      <div className="strat-detail-root">
        <Link to="/manage/strategies" className="strat-back">
          <FaArrowLeft size={11} /> Back to Strategies
        </Link>
        <div className="strat-empty">
          <h3>Strategy not found</h3>
          <p>{stratErr?.message || 'The strategy you tried to open does not exist.'}</p>
        </div>
      </div>
    );
  }

  const statusClass =
    strategy.status === 'active' ? 'is-active'
    : strategy.status === 'paused' ? 'is-paused'
    : 'is-archived';

  return (
    <>
      <div className="strat-detail-root">

        <Link to="/manage/strategies" className="strat-back">
          <FaArrowLeft size={11} /> Back to Strategies
        </Link>

        {/* ---------- Header ---------- */}
        <div className="ph" style={{ '--strat-color': strategy.color }}>
          <div className="ph-row">
            <div className="ph-left">
              <span className="ph-eyebrow">Strategy</span>
              <div className="ph-title-row">
                <h1 className="ph-title">{strategy.name}</h1>
                <span className={`strat-tile-status ${statusClass}`}>
                  {strategy.status}
                </span>
              </div>
              {strategy.description && (
                <p className="ph-sub">{strategy.description}</p>
              )}
            </div>

            <div className="ph-right">
              <button
                type="button"
                className="strat-btn"
                onClick={() => setEditOpen(true)}
              >
                <FaEdit size={11} /> Edit
              </button>
              {strategy.status !== 'archived' && (
                <button
                  type="button"
                  className="strat-btn"
                  onClick={() => setArchiveOpen(true)}
                  disabled={archiveMutation.isPending}
                >
                  <FaArchive size={11} /> Archive
                </button>
              )}
              <button
                type="button"
                className="strat-btn"
                style={{
                  color: '#f87171',
                  borderColor: 'rgba(239,68,68,.35)',
                  background: 'rgba(239,68,68,.05)',
                }}
                onClick={() => setDeleteOpen(true)}
                disabled={deleteMutation.isPending}
              >
                <FaTrash size={11} /> Delete
              </button>
            </div>
          </div>
        </div>

        {/* ---------- KPI strip ---------- */}
        <div className="strat-kpi-grid">
          <div className="strat-kpi">
            <div className="strat-kpi-icon is-amber">
              <span style={{ fontSize: 14 }}>Σ</span>
            </div>
            <div>
              <span className="strat-kpi-label">Total Trades</span>
              <span className="strat-kpi-value">{kpis.total}</span>
            </div>
          </div>
          <div className="strat-kpi">
            <div className="strat-kpi-icon is-win">
              <span style={{ fontSize: 14 }}>W</span>
            </div>
            <div>
              <span className="strat-kpi-label">Win Rate</span>
              <span className="strat-kpi-value">{fmtPct(kpis.winRate)}</span>
            </div>
          </div>
          <div className="strat-kpi">
            <div className="strat-kpi-icon is-muted">
              <span style={{ fontSize: 14 }}>W/L</span>
            </div>
            <div>
              <span className="strat-kpi-label">Wins / Losses</span>
              <span className="strat-kpi-value">
                {kpis.wins} / {kpis.losses}
              </span>
            </div>
          </div>
          <div className="strat-kpi">
            <div className={`strat-kpi-icon ${kpis.net >= 0 ? 'is-win' : ''}`}>
              <span style={{ fontSize: 14 }}>$</span>
            </div>
            <div>
              <span className="strat-kpi-label">Net P&amp;L</span>
              <span className="strat-kpi-value">{fmtMoney(kpis.net)}</span>
            </div>
          </div>
          <div className="strat-kpi">
            <div className="strat-kpi-icon is-win">
              <span style={{ fontSize: 14 }}>▲</span>
            </div>
            <div>
              <span className="strat-kpi-label">Best Trade</span>
              <span className="strat-kpi-value">{fmtMoney(kpis.best)}</span>
            </div>
          </div>
          <div className="strat-kpi">
            <div className="strat-kpi-icon is-amber">
              <span style={{ fontSize: 14 }}>▼</span>
            </div>
            <div>
              <span className="strat-kpi-label">Worst Trade</span>
              <span className="strat-kpi-value">{fmtMoney(kpis.worst)}</span>
            </div>
          </div>
        </div>

        {/* ---------- Meta grid ---------- */}
        <div className="strat-card strat-detail-meta">
          <div className="strat-meta-item">
            <span className="strat-meta-label">Direction</span>
            <span className="strat-meta-value">{strategy.direction || 'Both'}</span>
          </div>
          <div className="strat-meta-item">
            <span className="strat-meta-label">Timeframe</span>
            <span className="strat-meta-value">{strategy.timeframe || '—'}</span>
          </div>
          <div className="strat-meta-item">
            <span className="strat-meta-label">Colour</span>
            <span className="strat-meta-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 14, height: 14, borderRadius: 4,
                  background: strategy.color,
                  boxShadow: `0 0 12px ${strategy.color}80`,
                }}
              />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                {strategy.color}
              </span>
            </span>
          </div>
          <div className="strat-meta-item">
            <span className="strat-meta-label">Created</span>
            <span className="strat-meta-value">{fmtDate(strategy.createdAt)}</span>
          </div>
          <div className="strat-meta-item">
            <span className="strat-meta-label">Updated</span>
            <span className="strat-meta-value">{fmtDate(strategy.updatedAt)}</span>
          </div>
          {strategy.tags && strategy.tags.length > 0 && (
            <div className="strat-meta-item" style={{ gridColumn: '1 / -1' }}>
              <span className="strat-meta-label">Tags</span>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {strategy.tags.map((t) => (
                  <span key={t} className="strat-tag">{t}</span>
                ))}
              </span>
            </div>
          )}
        </div>

        {/* ---------- Rules ---------- */}
        {strategy.rules && strategy.rules.trim() && (
          <div className="strat-card">
            <div style={{ padding: '14px 20px 0' }}>
              <span className="strat-meta-label">Rules</span>
            </div>
            <pre className="strat-rules">{strategy.rules}</pre>
          </div>
        )}

        {/* ---------- Trade list ---------- */}
        <div className="strat-card" style={{ padding: '16px 18px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
              gap: 12,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>
              Tagged Trades
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                opacity: .85,
              }}
            >
              {kpis.total} {kpis.total === 1 ? 'trade' : 'trades'}
            </span>
          </div>

          {tradesLoading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
              Loading trades…
            </div>
          ) : trades.length === 0 ? (
            <div className="strat-empty" style={{ padding: '40px 20px' }}>
              <h3 style={{ fontSize: 14 }}>No trades tagged yet</h3>
              <p style={{ fontSize: 12, marginBottom: 0 }}>
                Tag a trade with this strategy from the Trade Logs page or
                the Add Trade modal.
              </p>
            </div>
          ) : (
            <DataTable
              data={trades}
              columns={columns}
              getRowId={(row) => row.id}
              searchPlaceholder="Search trades…"
              searchableColumnIds={['date', 'symbol', 'notes']}
              initialSort={[{ id: 'date', desc: true }]}
              estimateRowHeight={36}
              maxHeight={520}
              emptyMessage="No trades match."
            />
          )}
        </div>
      </div>

      {/* ---------- Modals ---------- */}
      <StrategyFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        strategy={strategy}
      />

      <Alert
        isOpen={archiveOpen}
        type="confirm"
        title="Archive this strategy?"
        message={`"${strategy.name}" will be hidden from pickers but its ${kpis.total} tagged trade${kpis.total === 1 ? '' : 's'} will keep the tag. You can reactivate it later by editing the strategy.`}
        confirmText="Archive"
        cancelText="Cancel"
        onConfirm={handleArchive}
        onCancel={() => setArchiveOpen(false)}
      />

      <Alert
        isOpen={deleteOpen}
        type="confirm"
        title="Delete strategy?"
        message={`"${strategy.name}" will be permanently deleted. ${kpis.total > 0 ? `${kpis.total} tagged trade${kpis.total === 1 ? '' : 's'} will be UNTAGGED but kept. ` : ''}This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}