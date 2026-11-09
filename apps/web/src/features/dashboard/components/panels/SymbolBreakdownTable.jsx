import { useStats } from '@/features/dashboard/hooks/useStats';
import { makeFmt, fmtPct, toneColor } from '@/features/dashboard/components/viz/format';
import { PanelEmpty } from './PanelChrome';

/** $-mode body of the rrCompare panel: net result per symbol. Defensive about the shape. */
export default function SymbolBreakdownTable() {
  const { symbolBreakdown } = useStats();
  const fmt = makeFmt(true);

  const raw = Array.isArray(symbolBreakdown) ? symbolBreakdown : Object.values(symbolBreakdown || {});
  const rows = raw
    .map((r) => ({
      symbol: r.symbol ?? r.name ?? r.key ?? '—',
      n: r.n ?? r.trades ?? r.count ?? 0,
      total: Number(r.total ?? r.net ?? r.pnl ?? 0),
      winRate: r.winRate ?? (r.wins != null && r.n ? (r.wins / r.n) * 100 : null),
    }))
    .sort((a, b) => b.total - a.total);

  if (!rows.length) return <PanelEmpty title="No symbols yet" />;
  const maxAbs = Math.max(1e-9, ...rows.map((r) => Math.abs(r.total)));

  return (
    <div className="st">
      <div className="st-row st-headrow st-sym">
        <span>Symbol</span><span className="st-n">Trades</span><span className="st-w">Win %</span><span>Net</span>
      </div>
      {rows.map((r) => (
        <div key={r.symbol} className="st-row st-sym">
          <span className="st-name">{r.symbol}</span>
          <span className="st-n">{r.n}</span>
          <span className="st-w">{r.winRate == null ? '—' : fmtPct(r.winRate, 0)}</span>
          <span className="st-net">
            <i className="st-bar"><b className={r.total >= 0 ? 'w' : 'l'} style={{ width: `${(Math.abs(r.total) / maxAbs) * 100}%` }} /></i>
            <em style={{ color: toneColor(r.total) }}>{fmt(r.total)}</em>
          </span>
        </div>
      ))}
    </div>
  );
}
