// "rrCompare" panel: R-mode = target R:R sweep; $-mode = symbol table.
import { useMemo } from 'react';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { computeStats } from '@/shared/trading/stats';
import { fmtR, fmtPct } from '@/features/dashboard/components/viz/format';
import PanelChrome, { PanelEmpty } from './PanelChrome';
import SymbolBreakdownTable from './SymbolBreakdownTable';

const LEVELS = [1, 2, 3, 4];

export default function RRCompare() {
  const { filteredTrades, account, metric, currentR } = useStats();
  const isMoney = metric === '$';

  const rows = useMemo(() => {
    if (isMoney || !filteredTrades?.length) return [];
    return LEVELS.map((r) => {
      const s = computeStats(filteredTrades, r, account);
      return { r, total: s.totalR, winRate: s.winRate, exp: s.expectancy };
    });
  }, [filteredTrades, account, isMoney]);

  if (isMoney) {
    return (
      <PanelChrome title="Symbol performance" subtitle="net $ per symbol" scrollable>
        <SymbolBreakdownTable />
      </PanelChrome>
    );
  }

  if (!rows.length) {
    return (
      <PanelChrome title="Target R:R sweep">
        <PanelEmpty title="No data yet" />
      </PanelChrome>
    );
  }

  const best = rows.reduce((a, b) => (b.total > a.total ? b : a));
  const maxPos = Math.max(0, ...rows.map((r) => r.total));
  const maxNeg = Math.max(0, ...rows.map((r) => -r.total));
  const span = maxPos + maxNeg || 1;
  const axis = (maxNeg / span) * 100; // % from bottom

  return (
    <PanelChrome title="Target R:R sweep" note={`best 1:${best.r}`}>
      <div className="rr">
        {rows.map((r) => {
          const h = (Math.abs(r.total) / span) * 100;
          const bottom = r.total >= 0 ? axis : axis - h;
          const isBest = r.r === best.r;
          return (
            <div key={r.r} className={`rr-col${isBest ? ' is-best' : ''}${r.r === currentR ? ' is-current' : ''}`}>
              <div className="rr-val">{fmtR(r.total)}</div>
              <div className="rr-plot">
                {maxPos > 0 && maxNeg > 0 && <i className="rr-axis" style={{ bottom: `${axis}%` }} />}
                <i className={`rr-bar ${r.total >= 0 ? 'w' : 'l'}`} style={{ bottom: `${bottom}%`, height: `${Math.max(h, 2)}%` }} />
              </div>
              <div className="rr-label">1:{r.r}</div>
              <div className="rr-meta">{fmtPct(r.winRate, 0)} win · {fmtR(r.exp, { d: 2 })}</div>
            </div>
          );
        })}
      </div>
    </PanelChrome>
  );
}
