// apps/web/src/features/dashboard/components/panels/SymbolBreakdownTable.jsx
import { useMemo } from 'react';
import { useStats } from '@/features/dashboard/hooks/useStats';
import DataTable from '@/shared/ui/data-table';

function formatMoney(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function formatPct(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return `${Number(v).toFixed(1)}%`;
}

export default function SymbolBreakdownTable() {
  const { symbolBreakdown } = useStats();

  const columns = useMemo(
    () => [
      {
        id: 'symbol',
        accessorKey: 'symbol',
        header: 'Symbol',
        meta: { label: 'Symbol' },
        size: 140,
        cell: (ctx) => (
          <span style={{ color: '#E7E9EE', fontWeight: 600 }}>
            {ctx.getValue()}
          </span>
        ),
      },
      {
        id: 'n',
        accessorKey: 'n',
        header: 'Trades',
        meta: { label: 'Trades' },
        size: 90,
        cell: (ctx) => String(ctx.getValue() ?? 0),
      },
      {
        id: 'winRate',
        accessorKey: 'winRate',
        header: 'Win %',
        meta: { label: 'Win Rate' },
        size: 90,
        cell: (ctx) => {
          const v = Number(ctx.getValue() ?? 0);
          return (
            <span className={v >= 50 ? 'dt-cell-pos' : 'dt-cell-neg'}>
              {formatPct(v)}
            </span>
          );
        },
      },
      {
        id: 'total',
        accessorKey: 'total',
        header: 'Net P&L',
        meta: { label: 'Net P&L' },
        size: 110,
        cell: (ctx) => {
          const v = Number(ctx.getValue() ?? 0);
          return (
            <span className={v >= 0 ? 'dt-cell-pos' : 'dt-cell-neg'}>
              {formatMoney(v)}
            </span>
          );
        },
      },
      {
        id: 'avgWin',
        accessorKey: 'avgWin',
        header: 'Avg Win',
        meta: { label: 'Avg Win' },
        size: 100,
        cell: (ctx) => (
          <span className="dt-cell-pos">{formatMoney(ctx.getValue())}</span>
        ),
      },
      {
        id: 'avgLoss',
        accessorKey: 'avgLoss',
        header: 'Avg Loss',
        meta: { label: 'Avg Loss' },
        size: 100,
        cell: (ctx) => (
          <span className="dt-cell-neg">{formatMoney(ctx.getValue())}</span>
        ),
      },
    ],
    []
  );

  if (!symbolBreakdown || symbolBreakdown.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 200,
          color: '#545E6E',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          border: '1px dashed #1A2029',
          borderRadius: 10,
          background: 'rgba(17,21,31,.4)',
        }}
      >
        No symbol data available
      </div>
    );
  }

  return (
    <DataTable
      data={symbolBreakdown}
      columns={columns}
      getRowId={(row) => row.symbol}
      searchPlaceholder="Search symbols…"
      initialSort={[{ id: 'total', desc: true }]}
      estimateRowHeight={38}
      maxHeight={360}
      emptyMessage="No symbols match."
    />
  );
}