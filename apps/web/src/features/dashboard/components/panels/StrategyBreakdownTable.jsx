// apps/web/src/features/dashboard/components/panels/StrategyBreakdownTable.jsx
//
// Per-strategy performance table. Groups the CURRENT filtered outcomes by
// strategyId (or "Untagged") and shows trade count, win rate, net R/$,
// avg win/loss, and profit factor per strategy.
//
// Uses the shared useStats() hook so it honours every active filter
// (dynamic, session/time, limits, strategy selection).

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStats } from '@/features/dashboard/hooks/useStats';
import DataTable from '@/shared/ui/data-table';

const UNTAGGED_ID = '__untagged__';

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

function formatPct(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return `${Number(v).toFixed(1)}%`;
}

/**
 * Group the current outcomes by strategyId.
 *
 * Returns rows sorted by net score desc. Always includes an "Untagged"
 * bucket when at least one outcome has no strategyId.
 */
function buildStrategyBreakdown(outcomes) {
  if (!outcomes || outcomes.length === 0) return [];

  const map = new Map();

  for (const o of outcomes) {
    const key = o.strategyId || UNTAGGED_ID;
    const name = o.strategy?.name || 'Untagged';
    const color = o.strategy?.color || '#6C7686';

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name,
        color,
        n: 0,
        wins: [],
        losses: [],
        total: 0,
        rAchievedSum: 0,
        rAchievedCount: 0,
      });
    }
    const e = map.get(key);
    const score = o.score ?? 0;
    e.n += 1;
    e.total += score;
    if (o.result === 'win') e.wins.push(score);
    else if (o.result === 'loss') e.losses.push(score);
    if (typeof o.rAchieved === 'number' && Number.isFinite(o.rAchieved)) {
      e.rAchievedSum += o.rAchieved;
      e.rAchievedCount += 1;
    }
  }

  const rows = [];
  for (const e of map.values()) {
    const decided = e.wins.length + e.losses.length;
    const winSum = e.wins.reduce((a, b) => a + b, 0);
    const lossSum = e.losses.reduce((a, b) => a + b, 0);
    const avgWin = e.wins.length ? winSum / e.wins.length : 0;
    const avgLoss = e.losses.length ? lossSum / e.losses.length : 0;
    const pf = lossSum !== 0
      ? winSum / Math.abs(lossSum)
      : (winSum > 0 ? Infinity : 0);
    rows.push({
      id: e.id,
      name: e.name,
      color: e.color,
      isUntagged: e.id === UNTAGGED_ID,
      n: e.n,
      winRate: decided > 0 ? (e.wins.length / decided) * 100 : 0,
      total: +e.total.toFixed(2),
      avgWin,
      avgLoss,
      profitFactor: pf,
    });
  }

  rows.sort((a, b) => b.total - a.total);
  return rows;
}

function StrategyCell({ row }) {
  if (row.isUntagged) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          color: '#8892A3',
          fontStyle: 'italic',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#6C7686',
            opacity: 0.6,
          }}
        />
        Untagged
      </span>
    );
  }
  return (
    <Link
      to={`/manage/strategies/${row.id}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        color: row.color,
        textDecoration: 'none',
        fontWeight: 600,
      }}
      title={`Open ${row.name}`}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: row.color,
          boxShadow: `0 0 8px ${row.color}aa`,
        }}
      />
      {row.name}
    </Link>
  );
}

export default function StrategyBreakdownTable() {
  const { stats, metric } = useStats();
  const isMoney = metric === '$';

  const rows = useMemo(
    () => buildStrategyBreakdown(stats?.outcomes || []),
    [stats?.outcomes]
  );

  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Strategy',
        meta: { label: 'Strategy' },
        size: 200,
        cell: (ctx) => <StrategyCell row={ctx.row.original} />,
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
        header: isMoney ? 'Net P&L' : 'Total R',
        meta: { label: isMoney ? 'Net P&L' : 'Total R' },
        size: 110,
        cell: (ctx) => {
          const v = Number(ctx.getValue() ?? 0);
          return (
            <span className={v >= 0 ? 'dt-cell-pos' : 'dt-cell-neg'}>
              {isMoney ? formatMoney(v) : formatR(v)}
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
          <span className="dt-cell-pos">
            {isMoney ? formatMoney(ctx.getValue()) : formatR(ctx.getValue())}
          </span>
        ),
      },
      {
        id: 'avgLoss',
        accessorKey: 'avgLoss',
        header: 'Avg Loss',
        meta: { label: 'Avg Loss' },
        size: 100,
        cell: (ctx) => (
          <span className="dt-cell-neg">
            {isMoney ? formatMoney(ctx.getValue()) : formatR(ctx.getValue())}
          </span>
        ),
      },
      {
        id: 'profitFactor',
        accessorKey: 'profitFactor',
        header: 'PF',
        meta: { label: 'Profit Factor' },
        size: 80,
        cell: (ctx) => {
          const v = ctx.getValue();
          if (v === Infinity) return <span className="dt-cell-pos">∞</span>;
          const n = Number(v ?? 0);
          const cls = n >= 1.5 ? 'dt-cell-pos' : n >= 1 ? '' : 'dt-cell-neg';
          return <span className={cls}>{Number.isFinite(n) ? n.toFixed(2) : '—'}</span>;
        },
      },
    ],
    [isMoney]
  );

  if (rows.length === 0) {
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
        No strategy data available
      </div>
    );
  }

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      searchPlaceholder="Search strategies…"
      initialSort={[{ id: 'total', desc: true }]}
      estimateRowHeight={38}
      maxHeight={360}
      emptyMessage="No strategies match."
    />
  );
}