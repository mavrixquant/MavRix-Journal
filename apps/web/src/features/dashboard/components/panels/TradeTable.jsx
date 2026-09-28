// apps/web/src/features/dashboard/components/panels/TradeTable.jsx
import { useMemo } from 'react';
import { useAppContext } from '@/app/providers/AppProvider';
import { useStats } from '@/features/dashboard/hooks/useStats';
import DataTable from '@/shared/ui/data-table';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatTimeWithAMPM(timeStr) {
  if (!timeStr) return '—';
  if (/^\d{2}:\d{2}/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  }
  return timeStr;
}

function formatMoney(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function formatR(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}R`;
}

/* ------------------------------------------------------------------ */
/*  Cell renderers (pure)                                              */
/* ------------------------------------------------------------------ */
function ResultTag({ value }) {
  if (!value) return '—';
  const cls =
    value === 'win' ? 'dt-tag-win' : value === 'loss' ? 'dt-tag-loss' : 'dt-tag-be';
  return <span className={`dt-tag ${cls}`}>{String(value).toUpperCase()}</span>;
}

function DirText({ value }) {
  if (!value) return '—';
  const color = value === 'Long' ? '#35C4A1' : '#FF5C5C';
  return <span style={{ color, fontWeight: 600 }}>{value}</span>;
}

/* ------------------------------------------------------------------ */
/*  Build columns dynamically (base + dynamic keys)                    */
/* ------------------------------------------------------------------ */
function buildColumns(dynamicKeys, isMoney) {
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
      id: 'mae',
      accessorKey: 'mae',
      header: 'MAE',
      meta: { label: 'MAE' },
      size: 70,
      cell: (ctx) => {
        const v = Number(ctx.getValue() ?? 0);
        return v.toFixed(2);
      },
    },
    {
      id: 'mfe',
      accessorKey: 'mfe',
      header: 'MFE',
      meta: { label: 'MFE' },
      size: 70,
      cell: (ctx) => {
        const v = Number(ctx.getValue() ?? 0);
        return v.toFixed(2);
      },
    },
  ];

  if (isMoney) {
    base.push({
      id: 'score',
      accessorKey: 'score',
      header: 'Net P&L',
      meta: { label: 'Net P&L' },
      size: 100,
      cell: (ctx) => {
        const v = Number(ctx.getValue() ?? 0);
        const cls = v >= 0 ? 'dt-cell-pos' : 'dt-cell-neg';
        return <span className={cls}>{formatMoney(v)}</span>;
      },
    });
  } else {
    base.push({
      id: 'rAchieved',
      accessorKey: 'rAchieved',
      header: 'R Reach',
      meta: { label: 'R Reached' },
      size: 90,
      cell: (ctx) => {
        const v = ctx.getValue();
        if (v == null) return '—';
        return `${Number(v).toFixed(2)}R`;
      },
    });
  }

  base.push({
    id: 'result',
    accessorKey: 'result',
    header: 'Outcome',
    meta: { label: 'Outcome' },
    size: 100,
    cell: (ctx) => <ResultTag value={ctx.getValue()} />,
  });

  // Append dynamic (user-defined) columns
  const dynamicCols = dynamicKeys.map((key) => ({
    id: key,
    accessorFn: (row) => row.dynamic?.[key] ?? '—',
    header: key,
    meta: { label: key },
    size: 120,
    cell: (ctx) => String(ctx.getValue() ?? '—'),
  }));

  return [...base, ...dynamicCols];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function TradeTable() {
  const { state } = useAppContext();
  const { stats, metric } = useStats();

  const isMoney = metric === '$';
  const outcomes = stats?.outcomes || [];
  const dynamicKeys = state.dynamicFilterKeys || [];

  const columns = useMemo(
    () => buildColumns(dynamicKeys, isMoney),
    [dynamicKeys, isMoney]
  );

  // Search should scan all base fields + dynamic fields
  const searchableIds = useMemo(() => {
    const base = ['date', 'entry', 'exit', 'dir', 'mae', 'mfe', 'result'];
    if (isMoney) base.push('score');
    else base.push('rAchieved');
    return [...base, ...dynamicKeys];
  }, [dynamicKeys, isMoney]);

  if (outcomes.length === 0) {
    return (
      <div
        style={{
          color: '#545E6E',
          textAlign: 'center',
          padding: 20,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
        }}
      >
        No trades to display.
      </div>
    );
  }

  return (
    <DataTable
      data={outcomes}
      columns={columns}
      getRowId={(row, idx) => row.id ?? `${row.date}-${row.entry}-${idx}`}
      searchPlaceholder="Search trades…"
      searchableColumnIds={searchableIds}
      initialSort={[{ id: 'date', desc: true }]}
      estimateRowHeight={36}
      maxHeight={560}
      emptyMessage="No trades match your filters."
    />
  );
}