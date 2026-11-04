// "strategyBreakdown" panel = per-playbook scoreboard.
import { useMemo } from 'react';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { makeFmt, fmtPct, nf, toneColor } from '@/features/dashboard/components/viz/format';
import PanelChrome, { PanelEmpty } from './PanelChrome';

export default function StrategyPanel() {
  const { stats, metric } = useStats();
  const isMoney = metric === '$';
  const fmt = makeFmt(isMoney);

  const rows = useMemo(() => {
    const map = new Map();
    (stats?.outcomes || []).forEach((o) => {
      const id = o.strategyId ?? 'none';
      const row = map.get(id) || {
        id,
        name: o.strategy?.name || 'Unassigned',
        color: o.strategy?.color || 'var(--d-ink-3)',
        n: 0, wins: 0, total: 0, gw: 0, gl: 0,
      };
      const s = Number(o.score) || 0;
      row.n += 1;
      row.total += s;
      if (o.result === 'win') row.wins += 1;
      if (s > 0) row.gw += s; else row.gl += -s;
      map.set(id, row);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [stats]);

  const maxAbs = Math.max(1e-9, ...rows.map((r) => Math.abs(r.total)));

  return (
    <PanelChrome title="Strategies" subtitle="net per playbook" scrollable>
      {rows.length === 0 ? (
        <PanelEmpty title="No strategies yet" hint="Tag trades with a strategy to compare playbooks" />
      ) : (
        <div className="st">
          <div className="st-row st-headrow">
            <span>Strategy</span><span className="st-n">Trades</span><span className="st-w">Win %</span><span className="st-pf">PF</span><span>Net</span>
          </div>
          {rows.map((r) => (
            <div key={r.id} className="st-row">
              <span className="st-name"><i style={{ background: r.color }} />{r.name}</span>
              <span className="st-n">{r.n}</span>
              <span className="st-w">{fmtPct((r.wins / r.n) * 100, 0)}</span>
              <span className="st-pf">{r.gl > 0 ? nf(r.gw / r.gl) : '∞'}</span>
              <span className="st-net">
                <i className="st-bar"><b className={r.total >= 0 ? 'w' : 'l'} style={{ width: `${(Math.abs(r.total) / maxAbs) * 100}%` }} /></i>
                <em style={{ color: toneColor(r.total) }}>{fmt(r.total)}</em>
              </span>
            </div>
          ))}
        </div>
      )}
    </PanelChrome>
  );
}
