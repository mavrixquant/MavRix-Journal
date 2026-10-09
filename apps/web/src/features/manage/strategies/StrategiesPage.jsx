// apps/web/src/features/manage/strategies/StrategiesPage.jsx
//
// /manage/strategies — the list page.
//
// Shows KPI strip (counts by status + total tagged trades), segmented
// status filter, and a grid of strategy tiles. Click a tile → detail page.
// Tiles have inline Edit + Delete actions.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaBrain,
  FaLayerGroup,
  FaPlay,
  FaPause,
  FaArchive,
} from 'react-icons/fa';
import { toast } from 'sonner';

import {
  useStrategies,
  useDeleteStrategy,
} from '@/shared/api/strategies';
import Alert from '@/shared/components/Alert';
import { PageSkeleton } from '@/shared/ui/page-skeleton';

import StrategyFormModal from './StrategyFormModal';
import './StrategiesPage.css';
import '@/shared/ui/page-header.css';

const FILTERS = [
  { id: 'all',      label: 'All',      icon: null },
  { id: 'active',   label: 'Active',   icon: FaPlay },
  { id: 'paused',   label: 'Paused',   icon: FaPause },
  { id: 'archived', label: 'Archived', icon: FaArchive },
];

function statusClass(status) {
  if (status === 'active') return 'is-active';
  if (status === 'paused') return 'is-paused';
  return 'is-archived';
}

export default function StrategiesPage() {
  const navigate = useNavigate();

  const { data: strategies = [], isLoading } = useStrategies();
  const deleteMutation = useDeleteStrategy();

  const [filter, setFilter] = useState('all');
  const [modalState, setModalState] = useState({ open: false, strategy: null });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const counts = useMemo(() => {
    const c = { all: strategies.length, active: 0, paused: 0, archived: 0 };
    for (const s of strategies) {
      if (s.status === 'active') c.active++;
      else if (s.status === 'paused') c.paused++;
      else if (s.status === 'archived') c.archived++;
    }
    return c;
  }, [strategies]);

  const totalTrades = useMemo(
    () => strategies.reduce((sum, s) => sum + (s.tradeCount || 0), 0),
    [strategies]
  );

  const visible = useMemo(() => {
    if (filter === 'all') return strategies;
    return strategies.filter((s) => s.status === filter);
  }, [strategies, filter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteMutation.mutateAsync(deleteTarget.id);
      const detached = res?.detachedTrades ?? deleteTarget.tradeCount ?? 0;
      toast.success(
        detached > 0
          ? `Deleted "${deleteTarget.name}" — ${detached} trade${detached === 1 ? '' : 's'} untagged`
          : `Deleted "${deleteTarget.name}"`
      );
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.message || 'Delete failed');
      setDeleteTarget(null);
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <>
      <div className="strat-root">

        {/* ---------- Header ---------- */}
        <div className="ph">
          <div className="ph-row">
            <div className="ph-left">
              <span className="ph-eyebrow">Manage</span>
              <h1 className="ph-title">Strategies</h1>
              <p className="ph-sub">
                Define playbooks, tag trades, and track per-strategy edge
              </p>
            </div>

            <div className="ph-right">
              <div className="strat-tabs">
                {FILTERS.map((f) => {
                  const Icon = f.icon;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      className={`strat-tab ${filter === f.id ? 'active' : ''}`}
                      onClick={() => setFilter(f.id)}
                    >
                      {Icon && <Icon size={9} />}
                      <span>{f.label}</span>
                      <span className="strat-tab-count">{counts[f.id]}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="strat-btn-primary"
                onClick={() => setModalState({ open: true, strategy: null })}
              >
                <FaPlus size={11} /> New Strategy
              </button>
            </div>
          </div>
        </div>

        {/* ---------- KPI strip ---------- */}
        <div className="strat-kpi-grid">
          <div className="strat-kpi">
            <div className="strat-kpi-icon is-amber"><FaBrain /></div>
            <div>
              <span className="strat-kpi-label">Total</span>
              <span className="strat-kpi-value">{counts.all}</span>
            </div>
          </div>
          <div className="strat-kpi">
            <div className="strat-kpi-icon is-win"><FaPlay /></div>
            <div>
              <span className="strat-kpi-label">Active</span>
              <span className="strat-kpi-value">{counts.active}</span>
            </div>
          </div>
          <div className="strat-kpi">
            <div className="strat-kpi-icon is-amber"><FaPause /></div>
            <div>
              <span className="strat-kpi-label">Paused</span>
              <span className="strat-kpi-value">{counts.paused}</span>
            </div>
          </div>
          <div className="strat-kpi">
            <div className="strat-kpi-icon is-muted"><FaArchive /></div>
            <div>
              <span className="strat-kpi-label">Archived</span>
              <span className="strat-kpi-value">{counts.archived}</span>
            </div>
          </div>
          <div className="strat-kpi">
            <div className="strat-kpi-icon is-amber"><FaLayerGroup /></div>
            <div>
              <span className="strat-kpi-label">Tagged Trades</span>
              <span className="strat-kpi-value">{totalTrades}</span>
            </div>
          </div>
        </div>

        {/* ---------- Grid ---------- */}
        {visible.length === 0 ? (
          <div className="strat-empty">
            <div className="strat-empty-icon"><FaBrain /></div>
            <h3>
              {strategies.length === 0
                ? 'No strategies yet'
                : `No ${filter} strategies`}
            </h3>
            <p>
              {strategies.length === 0
                ? 'Create your first playbook to start tagging trades and tracking per-strategy edge.'
                : 'Switch filter or create a new strategy.'}
            </p>
            {strategies.length === 0 && (
              <button
                type="button"
                className="strat-btn-primary"
                onClick={() => setModalState({ open: true, strategy: null })}
              >
                <FaPlus size={11} /> Create Strategy
              </button>
            )}
          </div>
        ) : (
          <div className="strat-grid">
            {visible.map((s) => (
              <div
                key={s.id}
                className="strat-card strat-tile"
                style={{ '--strat-color': s.color }}
                onClick={() => navigate(`/manage/strategies/${s.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/manage/strategies/${s.id}`);
                }}
              >
                <div className="strat-tile-head">
                  <h3 className="strat-tile-name">{s.name}</h3>
                  <span className={`strat-tile-status ${statusClass(s.status)}`}>
                    {s.status}
                  </span>
                </div>

                {s.description ? (
                  <p className="strat-tile-desc">{s.description}</p>
                ) : (
                  <p className="strat-tile-desc" style={{ opacity: .5 }}>
                    No description
                  </p>
                )}

                <div className="strat-tile-meta">
                  {s.direction === 'Long' && (
                    <span className="strat-chip is-long">▲ Long</span>
                  )}
                  {s.direction === 'Short' && (
                    <span className="strat-chip is-short">▼ Short</span>
                  )}
                  {!s.direction && (
                    <span className="strat-chip">↕ Both</span>
                  )}
                  {s.timeframe && (
                    <span className="strat-chip">⏱ {s.timeframe}</span>
                  )}
                </div>

                {s.tags && s.tags.length > 0 && (
                  <div className="strat-tile-tags">
                    {s.tags.slice(0, 4).map((t) => (
                      <span key={t} className="strat-tag">{t}</span>
                    ))}
                    {s.tags.length > 4 && (
                      <span className="strat-tag">+{s.tags.length - 4}</span>
                    )}
                  </div>
                )}

                <div className="strat-tile-foot">
                  <span className="strat-tile-trades">
                    {s.tradeCount} {s.tradeCount === 1 ? 'trade' : 'trades'}
                  </span>
                  <div
                    className="strat-tile-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="strat-icon-btn"
                      onClick={() => setModalState({ open: true, strategy: s })}
                      title="Edit"
                      aria-label="Edit strategy"
                    >
                      <FaEdit size={11} />
                    </button>
                    <button
                      type="button"
                      className="strat-icon-btn is-danger"
                      onClick={() => setDeleteTarget(s)}
                      title="Delete"
                      aria-label="Delete strategy"
                    >
                      <FaTrash size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---------- Modals ---------- */}
        <StrategyFormModal
          isOpen={modalState.open}
          onClose={() => setModalState({ open: false, strategy: null })}
          strategy={modalState.strategy}
        />

        <Alert
          isOpen={!!deleteTarget}
          type="confirm"
          title="Delete strategy?"
          message={
            deleteTarget
              ? `"${deleteTarget.name}" will be permanently deleted. ${
                  deleteTarget.tradeCount > 0
                    ? `${deleteTarget.tradeCount} tagged trade${deleteTarget.tradeCount === 1 ? '' : 's'} will be UNTAGGED but kept. `
                    : ''
                }This cannot be undone.`
              : ''
          }
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </>
  );
}