// apps/web/src/features/journal/components/JournalMain.jsx
import { useState, useMemo, useEffect } from 'react';
import { FaFileUpload, FaFolderOpen } from 'react-icons/fa';

import { useAccounts } from '@/shared/api/accounts';
import { useTrades } from '@/shared/api/trades';
import { enrichTradesFromDB } from '@/shared/trading/enrich';
import UploadModal from './UploadModal';
import DataTable from '@/shared/ui/data-table';
import { PageSkeleton } from '@/shared/ui/page-skeleton';

/* ------------------------------------------------------------------ */
/*  Scoped CSS — matches the rest of the app                           */
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

    padding: 24px;
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
  .jm-head {
    padding: 18px 22px 16px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }
  .jm-head::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    border-radius: 18px 18px 0 0;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: jmGrad 4s linear infinite;
    pointer-events: none;
  }
  .jm-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -.02em;
    line-height: 1.1;
  }
  .jm-sub {
    margin: 5px 0 0;
    font-size: 12.5px;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .jm-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .jm-select {
    appearance: none;
    -webkit-appearance: none;
    background: rgba(10,13,19,.6);
    color: var(--ink-1);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    padding: 9px 34px 9px 14px;
    font-size: 12.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-weight: 600;
    cursor: pointer;
    outline: none;
    min-width: 220px;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='%23545E6E'><path d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/></svg>");
    background-repeat: no-repeat;
    background-position: right 10px center;
    transition: all .2s;
  }
  .jm-select:hover { border-color: rgba(255,255,255,.22); }
  .jm-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
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
  }
  .jm-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px rgba(245,158,11,.7), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .jm-btn-primary:disabled {
    opacity: .5;
    cursor: not-allowed;
  }
  .jm-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }
  .jm-kpi {
    padding: 14px 16px;
    border-radius: 12px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
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
  }
  .jm-kpi-value.pos { color: var(--win); }
  .jm-kpi-value.neg { color: var(--loss); }
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
  @keyframes jmGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .jm-head::before { animation: none !important; }
  }
  @media (max-width: 640px) {
    .jm-root { padding: 16px; }
    .jm-head { padding: 16px 18px; }
    .jm-select { min-width: 0; width: 100%; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
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

function DirText({ value }) {
  if (!value) return '—';
  const color = value === 'Long' ? '#35C4A1' : '#FF5C5C';
  return <span style={{ color, fontWeight: 600 }}>{value}</span>;
}

/* ------------------------------------------------------------------ */
/*  Columns — mirrors Dashboard TradeTable                             */
/* ------------------------------------------------------------------ */
function buildColumns(dynamicKeys, currency) {
  const base = [
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
      id: 'mae',
      accessorKey: 'mae',
      header: 'MAE',
      meta: { label: 'MAE' },
      size: 70,
      cell: (ctx) => Number(ctx.getValue() ?? 0).toFixed(2),
    },
    {
      id: 'mfe',
      accessorKey: 'mfe',
      header: 'MFE',
      meta: { label: 'MFE' },
      size: 70,
      cell: (ctx) => Number(ctx.getValue() ?? 0).toFixed(2),
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
        return <span className={cls}>{formatMoney(v, currency)}</span>;
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

  return [...base, ...dynamicCols];
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function JournalMain() {
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Auto-select first account once accounts arrive
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  const { data: rawTrades = [], isLoading: tradesLoading } = useTrades(
    selectedAccountId
  );

  const { enrichedTrades, dynamicKeys } = useMemo(
    () => enrichTradesFromDB(rawTrades),
    [rawTrades]
  );

  const currency = selectedAccount?.currency || 'USD';

  const columns = useMemo(
    () => buildColumns(dynamicKeys, currency),
    [dynamicKeys, currency]
  );

  // Aggregate metrics for the KPI strip
  const kpis = useMemo(() => {
    if (enrichedTrades.length === 0) {
      return { total: 0, wins: 0, losses: 0, netPnl: 0 };
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
    return { total: enrichedTrades.length, wins, losses, netPnl };
  }, [enrichedTrades]);

  const loading = accountsLoading || (selectedAccountId && tradesLoading);

  const searchableIds = useMemo(
    () => ['date', 'entry', 'exit', 'dir', 'symbol', 'notes', ...dynamicKeys],
    [dynamicKeys]
  );

  /* ---- Loading ---- */
  if (loading) return <PageSkeleton />;

  /* ---- No accounts ---- */
  if (accounts.length === 0) {
    return (
      <>
        <style>{CSS}</style>
        <div className="jm-root">
          <div className="jm-card jm-head">
            <div>
              <h1 className="jm-title">Trade Logs</h1>
              <p className="jm-sub">Browse and manage every trade in your journal</p>
            </div>
          </div>
          <div className="jm-empty">
            <div className="jm-empty-icon">
              <FaFolderOpen />
            </div>
            <h3>No accounts yet</h3>
            <p>
              Create a trading account first, then come back here to upload and
              browse your trades.
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
        {/* ---- Header ---- */}
        <div className="jm-card jm-head">
          <div>
            <h1 className="jm-title">Trade Logs</h1>
            <p className="jm-sub">
              Browse, search, and manage every trade in your journal
            </p>
          </div>

          <div className="jm-actions">
            <select
              className="jm-select"
              value={selectedAccountId || ''}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              aria-label="Select account"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type})
                </option>
              ))}
            </select>

            <button
              type="button"
              className="jm-btn-primary"
              onClick={() => setUploadOpen(true)}
              disabled={!selectedAccount}
            >
              <FaFileUpload size={11} /> Upload Trades
            </button>
          </div>
        </div>

        {/* ---- KPI strip ---- */}
        <div className="jm-kpis">
          <div className="jm-kpi">
            <span className="jm-kpi-label">Total Trades</span>
            <span className="jm-kpi-value">{kpis.total}</span>
          </div>
          <div className="jm-kpi">
            <span className="jm-kpi-label">Wins</span>
            <span className="jm-kpi-value pos">{kpis.wins}</span>
          </div>
          <div className="jm-kpi">
            <span className="jm-kpi-label">Losses</span>
            <span className="jm-kpi-value neg">{kpis.losses}</span>
          </div>
          <div className="jm-kpi">
            <span className="jm-kpi-label">Net P&amp;L</span>
            <span
              className={`jm-kpi-value ${kpis.netPnl >= 0 ? 'pos' : 'neg'}`}
            >
              {formatMoney(kpis.netPnl, currency)}
            </span>
          </div>
        </div>

        {/* ---- Table ---- */}
        <div className="jm-card jm-body">
          {enrichedTrades.length === 0 ? (
            <div className="jm-empty">
              <div className="jm-empty-icon">
                <FaFileUpload />
              </div>
              <h3>No trades yet</h3>
              <p>
                Upload an .xlsx trade log to populate this account. You can add
                custom columns and change their types during upload.
              </p>
              <button
                type="button"
                className="jm-btn-primary"
                onClick={() => setUploadOpen(true)}
                style={{ margin: '0 auto' }}
              >
                <FaFileUpload size={11} /> Upload Trades
              </button>
            </div>
          ) : (
            <DataTable
              data={enrichedTrades}
              columns={columns}
              getRowId={(row, idx) =>
                row.id ?? `${row.date}-${row.entry}-${idx}`
              }
              searchPlaceholder="Search trades…"
              searchableColumnIds={searchableIds}
              initialSort={[{ id: 'date', desc: true }]}
              estimateRowHeight={36}
              maxHeight={620}
              emptyMessage="No trades match your search."
            />
          )}
        </div>

        {/* ---- Upload modal ---- */}
        {selectedAccount && (
          <UploadModal
            isOpen={uploadOpen}
            onClose={() => setUploadOpen(false)}
            account={selectedAccount}
            existingTrades={rawTrades}
            onSuccess={() => {
              // React Query hooks re-fetch automatically (SSE + invalidation).
              setUploadOpen(false);
            }}
          />
        )}
      </div>
    </>
  );
}