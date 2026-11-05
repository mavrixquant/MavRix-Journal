import { useMemo, useState } from 'react';
import { FaChartBar, FaSearch } from 'react-icons/fa';

import { useAuth } from '@/app/providers/AuthProvider';
import { actions, useAppContext } from '@/app/providers/AppProvider';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { useEnrichedTrades } from '@/features/dashboard/hooks/useEnrichedTrades';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { useFilterUrlSync } from '@/features/dashboard/hooks/useFilterUrlSync';
import { makeFmt } from '@/features/dashboard/components/viz/format';
import { useStrategies } from '@/shared/api/strategies';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import EmptyState from '@/shared/components/EmptyState';

// Chart styles (.vz-*, .sg, .pc-empty) and the --d-* tokens live here.
import '@/features/dashboard/dashboardShell.css';
import './analyse.css';

import AnalyseFilters from './AnalyseFilters';
import { Seg } from './components/Card';
import { InsightGrid, KpiStrip } from './components/Summary';
import { ExplorerTab, OverviewTab, RiskTab, TimeTab, TradesTab } from './components/Tabs';
import { buildBehavior, buildDimensions, buildInsights } from './lib/analysis';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'time', label: 'Time' },
  { value: 'explorer', label: 'Edge explorer' },
  { value: 'risk', label: 'Risk and behavior' },
  { value: 'trades', label: 'Trades' },
];

const R_TARGETS = [1, 2, 3, 4].map((v) => ({ value: v, label: `${v}R` }));
const LOW_SAMPLE = 30;

export default function AnalysePage() {
  const { user } = useAuth();
  const { state, dispatch } = useAppContext();
  const { accountId } = useDashboardAccount();

  const enriched = useEnrichedTrades(accountId);
  useFilterUrlSync();
  const { stats, account } = useStats();
  const { data: strategies = [] } = useStrategies();

  const [tab, setTab] = useState('overview');

  const outcomes = stats.outcomes;
  const isMoney = stats.metric === '$';
  const fmt = useMemo(() => makeFmt(isMoney), [isMoney]);

  const strategyNameById = useMemo(
    () => new Map(strategies.map((s) => [s.id, s.name])),
    [strategies]
  );
  const strategyName = useMemo(
    () => (o) =>
      (o.strategyId != null && strategyNameById.get(o.strategyId)) ||
      (typeof o.strategy === 'string' ? o.strategy : o.strategy?.name) ||
      '',
    [strategyNameById]
  );

  const dims = useMemo(
    () => buildDimensions({ dynamicKeys: enriched.dynamicKeys, strategyNameById }),
    [enriched.dynamicKeys, strategyNameById]
  );
  const insights = useMemo(
    () => buildInsights({ outcomes, stats, dims, fmt }),
    [outcomes, stats, dims, fmt]
  );
  const behavior = useMemo(() => buildBehavior(outcomes), [outcomes]);

  const totalCount = enriched.enrichedTrades.length;
  const filteredCount = stats?.n ?? 0;
  const isHydrating = totalCount > 0 && state.trades.length === 0;
  const isFiltered = totalCount > 0 && filteredCount !== totalCount;

  let subText;
  if (totalCount === 0) subText = 'No trades recorded for this account yet';
  else if (isFiltered) subText = `${filteredCount} of ${totalCount} trades match your filters`;
  else subText = `${totalCount} ${totalCount === 1 ? 'trade' : 'trades'} across this account`;

  const badgeVariant =
    account?.type === 'Demo' ? 'is-demo' : account?.type === 'Backtest' ? 'is-backtest' : 'is-live';

  usePageHeader({
    title: 'Analyse',
    badge: account?.type,
    badgeVariant,
    subtitle: subText,
  });

  if (!user || isHydrating) return <PageSkeleton />;

  const hasAnyTrades = totalCount > 0;
  const isBacktest = account?.type === 'Backtest';

  return (
    <div className="dash-root analyse-root page-fade-in">
      <AnalyseFilters />

      {!hasAnyTrades ? (
        <EmptyState
          size="lg"
          icon={FaChartBar}
          eyebrow="No data"
          title="No trades to analyse"
          description="Add or upload trades to this account. Once there is data, this page shows where you make money, where you lose it, and what to change."
          actions={[{ label: 'Open trade logs', variant: 'primary', to: '/journal/logs' }]}
        />
      ) : filteredCount === 0 ? (
        <EmptyState
          size="lg"
          icon={FaSearch}
          eyebrow="No matches"
          title="No trades match your filters"
          description="Remove a filter chip above, or press Reset to see every trade for this account."
        />
      ) : (
        <>
          {filteredCount < LOW_SAMPLE && (
            <p className="ax-sample" role="note">
              Only {filteredCount} {filteredCount === 1 ? 'trade' : 'trades'} in view. Treat the findings below as
              directional, not proof.
            </p>
          )}

          <InsightGrid insights={insights} />
          <KpiStrip stats={stats} fmt={fmt} />

          <div className="ax-tabbar">
            <div className="ax-tabs" role="tablist" aria-label="Analysis views">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.value}
                  className={`ax-tab ${tab === t.value ? 'on' : ''}`}
                  onClick={() => setTab(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {isBacktest && (
              <div className="ax-target">
                <span>Target</span>
                <Seg
                  value={state.currentR}
                  options={R_TARGETS}
                  label="Target R"
                  onChange={(v) => dispatch({ type: actions.SET_CURRENT_R, payload: v })}
                />
              </div>
            )}
          </div>

          <div role="tabpanel">
            {tab === 'overview' && <OverviewTab stats={stats} outcomes={outcomes} isMoney={isMoney} />}
            {tab === 'time' && <TimeTab outcomes={outcomes} isMoney={isMoney} fmt={fmt} />}
            {tab === 'explorer' && <ExplorerTab outcomes={outcomes} dims={dims} fmt={fmt} />}
            {tab === 'risk' && <RiskTab stats={stats} behavior={behavior} fmt={fmt} />}
            {tab === 'trades' && <TradesTab outcomes={outcomes} fmt={fmt} strategyName={strategyName} />}
          </div>
        </>
      )}
    </div>
  );
}
