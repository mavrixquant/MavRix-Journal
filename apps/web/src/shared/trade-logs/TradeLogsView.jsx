// apps/web/src/shared/trade-logs/TradeLogsView.jsx
//
// Shared trade-logs page body. Consumed by BOTH:
//   - features/journal/trade-logs/TradeLogsPage.jsx   (Live + Demo accounts)
//   - features/backtester/test-logs/TestLogsPage.jsx  (Backtest accounts)
//
// ACCOUNT SELECTION
// -----------------
// Account comes from the header's selector (via useDashboardAccount() in
// the calling feature page). This view does not own a selector.
//
// ACTIONS ROW
// -----------
// The four primary actions (Template, Columns, Upload, Add) sit on the
// right of the KPI strip — same row as "Net P&L" and its peers. On narrow
// viewports the row wraps: KPIs stay first, buttons fall to a second line
// right-aligned.

import { useState, useMemo, useCallback } from 'react';
import {
  FaFileUpload,
  FaFolderOpen,
  FaPlus,
  FaDownload,
  FaColumns,
  FaEdit,
  FaTrash,
} from 'react-icons/fa';
import { toast } from 'sonner';

import { useAccounts } from '@/shared/api/accounts';
import { useTrades, useDeleteTrade } from '@/shared/api/trades';
import { useStrategies } from '@/shared/api/strategies';
import { enrichTradesFromDB } from '@/shared/trading/enrich';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import UploadModal from './UploadModal';
import AddTradeModal from './AddTradeModal';
import ColumnManagerModal from './ColumnManagerModal';
import { downloadTradeTemplate } from './downloadTemplate';
import DataTable from '@/shared/ui/data-table';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import Alert from '@/shared/components/Alert';

/* ------------------------------------------------------------------ */
/*  Page-local CSS                                                     */
/* ------------------------------------------------------------------ */
const CSS = `
  .jm-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --win: #22c55e;
    --loss: #ef4444;

    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 18px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* ---------- KPI + actions row ---------- */
  .jm-top-row {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 12px;
  }

  .jm-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    flex: 1 1 480px;
    min-width: 0;
  }
  .jm-kpi {
    padding: 14px 16px;
    border-radius: 12px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 74px;
  }
  .jm-kpi-label {
    display: block;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-bottom: 5px;
  }
  .jm-kpi-value {
    display: block;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -.01em;
    line-height: 1.15;
  }
  .jm-kpi-value.pos { color: var(--win); }
  .jm-kpi-value.neg { color: var(--loss); }
  .jm-kpi-value.amber { color: var(--accent); }

  /* Net P&L card gets a subtle accent so the actions cluster reads as
     "attached" to the primary metric. */
  .jm-kpi.is-anchor {
    background: linear-gradient(180deg, rgba(245,158,11,.05), rgba(245,158,11,.015));
    border-color: var(--accent-soft2);
  }

  /* ---------- Actions cluster ---------- */
  .jm-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
  }

  .jm-icon-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 13px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
    min-height: 40px;
  }
  .jm-icon-btn:hover:not(:disabled) {
    color: var(--accent);
    background: rgba(245,158,11,.06);
    border-color: var(--accent-soft2);
    transform: translateY(-1px);
  }
  .jm-icon-btn:disabled { opacity: .4; cursor: not-allowed; }

  .jm-btn-primary {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 18px;
    border-radius: 10px;
    border: none;
    overflow: hidden;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: .02em;
    cursor: pointer;
    box-shadow:
      0 10px 30px -8px rgba(245,158,11,.55),
      inset 0 1px 0 rgba(255,255,255,.4);
    transition: transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s;
    white-space: nowrap;
    min-height: 40px;
  }
  .jm-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px rgba(245,158,11,.7), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .jm-btn-primary:disabled {
    opacity: .5;
    cursor: not-allowed;
  }

  @media (max-width: 900px) {
    .jm-icon-btn span { display: none; }
    .jm-icon-btn { padding: 10px; }
  }

  /* ---------- Row actions in the table ---------- */
  .jm-row-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }
  .jm-row-btn {
    width: 26px;
    height: 26px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025);
    color: var(--ink-2);
    cursor: pointer;
    transition: all .18s cubic-bezier(.2,.8,.25,1);
    flex-shrink: 0;
  }
  .jm-row-btn:hover {
    color: var(--accent);
    background: rgba(245,158,11,.10);
    border-color: var(--accent-soft2);
    transform: translateY(-1px);
  }
  .jm-row-btn:active { transform: translateY(0) scale(.94); }
  .jm-row-btn.is-danger:hover {
    color: #f87171;
    background: rgba(239,68,68,.10);
    border-color: rgba(239,68,68,.42);
  }
  .jm-row-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(245,158,11,.22);
  }
  .jm-row-btn.is-danger:focus-visible {
    box-shadow: 0 0 0 3px rgba(239,68,68,.22);
  }

  /* Strategy chip */
  .jm-strat-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(255,255,255,.03);
    border: 1px solid rgba(255,255,255,.08);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .01em;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
  }
  .jm-strat-chip-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .jm-strat-chip-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .jm-card {
    position: relative;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow:
      0 20px 50px -30px rgba(0,0,0,.9),
      inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
  }
  .jm-body { padding: 4px 18px 18px; }

  .jm-empty {
    padding: 60px 24px;
    text-align: center;
    border: 1px dashed rgba(255,255,255,.10);
    border-radius: 14px;
    background: rgba(255,255,255,.015);
  }
  .jm-empty-icon {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(245,158,11,.14), rgba(245,158,11,.04));
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    margin-bottom: 16px;
    box-shadow: 0 0 30px -10px rgba(245,158,11,.55);
  }
  .jm-empty h3 {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 700;
    color: var(--ink-1);
  }
  .jm-empty p {
    margin: 0 auto 18px;
    max-width: 360px;
    font-size: 12.5px;
    line-height: 1.65;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }

  @media (max-width: 640px) {
    .jm-root { padding: 16px; }
    .jm-top-row { flex-direction: column; }
    .jm-actions { width: 100%; justify-content: flex-end; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function formatTimeWithAMPM(timeStr) {
  if (!timeStr) return '—';
  if (/^\d{2}:\d{2}/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  return timeStr;
}

function formatMoney(v, currency = 'USD') {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;
  }
}

function formatNum(v, decimals = 2) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(decimals);
}

function DirText({ value }) {
  if (!value) return '—';
  const color = value === 'Long' ? '#35C4A1' : '#FF5C5C';
  return <span style={{ color, fontWeight: 600 }}>{value}</span>;
}

function StrategyCell({ strategy }) {
  if (!strategy) {
    return <span style={{ color: 'var(--ink-3)' }}>—</span>;
  }
  const color = strategy.color || '#8892A3';
  return (
    <span
      className="jm-strat-chip"
      style={{
        color,
        background: `${color}18`,
        borderColor: `${color}44`,
      }}
      title={strategy.name}
    >
      <span
        className="jm-strat-chip-dot"
        style={{
          background: color,
          boxShadow: `0 0 6px ${color}aa`,
        }}
      />
      <span className="jm-strat-chip-name">{strategy.name}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Columns — mode-aware                                              */
/* ------------------------------------------------------------------ */
function buildColumns(dynamicKeys, currency, isBacktest, { onEdit, onDelete }) {
  const common = [
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
      accessorKey: 'entry',
      header: 'Entry',
      meta: { label: 'Entry' },
      size: 96,
      cell: (ctx) => formatTimeWithAMPM(ctx.getValue()),
    },
    {
      id: 'exit',
      accessorKey: 'exit',
      header: 'Exit',
      meta: { label: 'Exit' },
      size: 96,
      cell: (ctx) => formatTimeWithAMPM(ctx.getValue()),
    },
    {
      id: 'dir',
      accessorKey: 'dir',
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
      id: 'strategy',
      accessorFn: (row) => row.strategy?.name || '',
      header: 'Strategy',
      meta: { label: 'Strategy' },
      size: 140,
      cell: (ctx) => <StrategyCell strategy={ctx.row.original.strategy} />,
    },
  ];

  const modeSpecific = isBacktest
    ? [
        {
          id: 'mae',
          accessorKey: 'mae',
          header: 'MAE',
          meta: { label: 'MAE' },
          size: 70,
          cell: (ctx) => formatNum(ctx.getValue()),
        },
        {
          id: 'mfe',
          accessorKey: 'mfe',
          header: 'MFE',
          meta: { label: 'MFE' },
          size: 70,
          cell: (ctx) => formatNum(ctx.getValue()),
        },
        {
          id: 'slPoints',
          accessorKey: 'slPoints',
          header: 'SL',
          meta: { label: 'SL (points)' },
          size: 80,
          cell: (ctx) => formatNum(ctx.getValue()),
        },
      ]
    : [
        {
          id: 'entryPrice',
          accessorKey: 'entryPrice',
          header: 'Entry Price',
          meta: { label: 'Entry Price' },
          size: 110,
          cell: (ctx) => {
            const v = ctx.getValue();
            return v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 6 });
          },
        },
        {
          id: 'takeProfit',
          accessorKey: 'takeProfit',
          header: 'Take Profit',
          meta: { label: 'Take Profit' },
          size: 110,
          cell: (ctx) => {
            const v = ctx.getValue();
            return v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 6 });
          },
        },
        {
          id: 'stopLoss',
          accessorKey: 'stopLoss',
          header: 'Stop Loss',
          meta: { label: 'Stop Loss' },
          size: 110,
          cell: (ctx) => {
            const v = ctx.getValue();
            return v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 6 });
          },
        },
      ];

  const common2 = [
    {
      id: 'pnl',
      accessorKey: 'pnl',
      header: 'P&L',
      meta: { label: 'P&L' },
      size: 110,
      cell: (ctx) => {
        const v = Number(ctx.getValue() ?? 0);
        const cls = v >= 0 ? 'dt-cell-pos' : 'dt-cell-neg';
        return <span className={cls}>{formatMoney(v, currency)}</span>;
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
      size: 200,
      cell: (ctx) => ctx.getValue() || '—',
    },
  ];

  const dynamicCols = dynamicKeys.map((key) => ({
    id: key,
    accessorFn: (row) => row.dynamic?.[key] ?? '—',
    header: key,
    meta: { label: key },
    size: 130,
    cell: (ctx) => String(ctx.getValue() ?? '—'),
  }));

  const actionsCol = {
    id: '__actions',
    header: '',
    meta: { label: 'Actions' },
    size: 92,
    enableSorting: false,
    enableResizing: false,
    enableHiding: false,
    cell: (ctx) => {
      const row = ctx.row.original;
      return (
        <div className="jm-row-actions">
          <button
            type="button"
            className="jm-row-btn"
            onClick={() => onEdit(row)}
            title="Edit"
            aria-label="Edit"
          >
            <FaEdit size={11} />
          </button>
          <button
            type="button"
            className="jm-row-btn is-danger"
            onClick={() => onDelete(row)}
            title="Delete"
            aria-label="Delete"
          >
            <FaTrash size={11} />
          </button>
        </div>
      );
    },
  };

  return [...common, ...modeSpecific, ...common2, ...dynamicCols, actionsCol];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function TradeLogsView({
  accountId,
  allowedTypes = [],
  eyebrow,
  title,
  subtitle,
  noAccountsTitle,
  noAccountsMessage,
}) {
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [addTradeOpen, setAddTradeOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);

  const [editingTrade, setEditingTrade] = useState(null);
  const [deletingTrade, setDeletingTrade] = useState(null);

  const deleteTrade = useDeleteTrade();

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) || null,
    [accounts, accountId]
  );

  const isBacktest = selectedAccount?.type === 'Backtest';

  const { data: rawTrades = [], isLoading: tradesLoading } = useTrades(accountId);

  const { data: strategies = [] } = useStrategies();

  const { enrichedTrades, dynamicKeys } = useMemo(
    () => enrichTradesFromDB(rawTrades),
    [rawTrades]
  );

  const currency = selectedAccount?.currency || 'USD';

  const handleEdit = useCallback((row) => {
    setEditingTrade(row);
    setAddTradeOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((row) => {
    setDeletingTrade(row);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const trade = deletingTrade;
    if (!trade) return;
    setDeletingTrade(null);
    try {
      await deleteTrade.mutateAsync(trade.id);
      toast.success('Trade deleted');
    } catch (err) {
      toast.error(err?.message || 'Could not delete trade');
    }
  }, [deletingTrade, deleteTrade]);

  const handleAddModalClose = useCallback(() => {
    setAddTradeOpen(false);
    setEditingTrade(null);
  }, []);

  const columns = useMemo(
    () =>
      buildColumns(dynamicKeys, currency, isBacktest, {
        onEdit: handleEdit,
        onDelete: handleDeleteRequest,
      }),
    [dynamicKeys, currency, isBacktest, handleEdit, handleDeleteRequest]
  );

  const kpis = useMemo(() => {
    if (enrichedTrades.length === 0) {
      return { total: 0, winRate: 0, wins: 0, losses: 0, netPnl: 0 };
    }
    let wins = 0;
    let losses = 0;
    let netPnl = 0;
    for (const t of enrichedTrades) {
      const pnl = Number(t.pnl) || 0;
      netPnl += pnl;
      if (pnl > 0) wins++;
      else if (pnl < 0) losses++;
    }
    const decided = wins + losses;
    const winRate = decided > 0 ? (wins / decided) * 100 : 0;
    return { total: enrichedTrades.length, winRate, wins, losses, netPnl };
  }, [enrichedTrades]);

  const loading = accountsLoading || (accountId && tradesLoading);

  const searchableIds = useMemo(
    () => ['date', 'entry', 'exit', 'dir', 'symbol', 'strategy', 'notes', ...dynamicKeys],
    [dynamicKeys]
  );

  // ---- Publish title + subtitle to the global header bar ----
  usePageHeader({
    title: title || 'Trade Logs',
    subtitle: subtitle,
  });

  if (loading) return <PageSkeleton />;

  if (!selectedAccount) {
    const typesLabel = allowedTypes.length > 0
      ? allowedTypes.join(' or ')
      : 'matching';
    return (
      <>
        <style>{CSS}</style>
        <div className="jm-root">
          <div className="jm-empty">
            <div className="jm-empty-icon">
              <FaFolderOpen />
            </div>
            <h3>{noAccountsTitle || `No ${typesLabel} accounts`}</h3>
            <p>
              {noAccountsMessage ||
                `Create a ${typesLabel} account first, then come back here to upload and browse your trades.`}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="jm-root">

        {/* ---------- KPI strip + action buttons (single row) ---------- */}
        <div className="jm-top-row">
          <div className="jm-kpis">
            <div className="jm-kpi">
              <span className="jm-kpi-label">Total Trades</span>
              <span className="jm-kpi-value">{kpis.total}</span>
            </div>
            <div className="jm-kpi">
              <span className="jm-kpi-label">Win Rate</span>
              <span
                className={`jm-kpi-value ${
                  kpis.total === 0
                    ? ''
                    : kpis.winRate >= 50
                      ? 'pos'
                      : 'neg'
                }`}
              >
                {kpis.winRate.toFixed(1)}%
              </span>
            </div>
            <div className="jm-kpi">
              <span className="jm-kpi-label">Wins</span>
              <span className="jm-kpi-value pos">{kpis.wins}</span>
            </div>
            <div className="jm-kpi">
              <span className="jm-kpi-label">Losses</span>
              <span className="jm-kpi-value neg">{kpis.losses}</span>
            </div>
            <div className="jm-kpi is-anchor">
              <span className="jm-kpi-label">Net P&amp;L</span>
              <span
                className={`jm-kpi-value ${kpis.netPnl >= 0 ? 'pos' : 'neg'}`}
              >
                {formatMoney(kpis.netPnl, currency)}
              </span>
            </div>
          </div>

          <div className="jm-actions">
            <button
              type="button"
              className="jm-icon-btn"
              onClick={() => downloadTradeTemplate({ account: selectedAccount })}
              title="Download .xlsx template"
            >
              <FaDownload size={11} /> <span>Template</span>
            </button>

            <button
              type="button"
              className="jm-icon-btn"
              onClick={() => setColumnsOpen(true)}
              title="Manage custom columns"
            >
              <FaColumns size={11} /> <span>Columns</span>
            </button>

            <button
              type="button"
              className="jm-icon-btn"
              onClick={() => setUploadOpen(true)}
              title="Bulk-upload from Excel"
            >
              <FaFileUpload size={11} /> <span>Upload</span>
            </button>

            <button
              type="button"
              className="jm-btn-primary"
              onClick={() => setAddTradeOpen(true)}
            >
              <FaPlus size={11} /> Add {isBacktest ? 'Test' : 'Trade'}
            </button>
          </div>
        </div>

        {/* ---------- Table card ---------- */}
        <div className="jm-card jm-body">
          {enrichedTrades.length === 0 ? (
            <div className="jm-empty">
              <div className="jm-empty-icon">
                <FaFileUpload />
              </div>
              <h3>No {isBacktest ? 'tests' : 'trades'} yet</h3>
              <p>
                Add your first {isBacktest ? 'test' : 'trade'} manually, or
                bulk-import an .xlsx log. You can also define custom columns
                to capture more context.
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  className="jm-btn-primary"
                  onClick={() => setAddTradeOpen(true)}
                >
                  <FaPlus size={11} /> Add {isBacktest ? 'Test' : 'Trade'}
                </button>
                <button
                  type="button"
                  className="jm-icon-btn"
                  onClick={() => setUploadOpen(true)}
                >
                  <FaFileUpload size={11} /> <span>Upload</span>
                </button>
              </div>
            </div>
          ) : (
            <DataTable
              data={enrichedTrades}
              columns={columns}
              getRowId={(row, idx) =>
                row.id ?? `${row.date}-${row.entry}-${idx}`
              }
              searchPlaceholder={`Search ${isBacktest ? 'tests' : 'trades'}…`}
              searchableColumnIds={searchableIds}
              initialSort={[{ id: 'date', desc: true }]}
              estimateRowHeight={36}
              maxHeight={620}
              emptyMessage="No records match your search."
              stickyFirstColumn={false}
              stickyLastColumn={true}
            />
          )}
        </div>

        <UploadModal
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          account={selectedAccount}
          existingTrades={rawTrades}
          strategies={strategies}
          onSuccess={() => setUploadOpen(false)}
        />

        <AddTradeModal
          isOpen={addTradeOpen}
          onClose={handleAddModalClose}
          account={selectedAccount}
          trade={editingTrade}
        />

        <ColumnManagerModal
          isOpen={columnsOpen}
          onClose={() => setColumnsOpen(false)}
          account={selectedAccount}
          trades={rawTrades}
        />

        <Alert
          isOpen={!!deletingTrade}
          type="confirm"
          title="Delete trade?"
          message={
            deletingTrade
              ? `Delete the ${deletingTrade.dir || ''} ${deletingTrade.symbol || ''} trade from ${deletingTrade.date} at ${deletingTrade.entry || ''}? This cannot be undone.`
              : ''
          }
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingTrade(null)}
        />
      </div>
    </>
  );
}