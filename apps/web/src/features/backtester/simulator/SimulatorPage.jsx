import { useMemo } from 'react';
import { useAppContext } from '@/app/providers/AppProvider';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { useTrades } from '@/shared/api/trades';
import { useAccounts } from '@/shared/api/accounts';
import { enrichTradesFromDB } from '@/shared/trading/enrich';
import { computeStats } from '@/shared/trading/stats';
import { getMetricMode } from '@/shared/trading/sl';

import './simulator.css';
import { useSimulation } from './hooks/useSimulation';
import { MIN_TRADES } from './lib/limits';
import { fmtInt } from './lib/format';
import ControlRail from './components/ControlRail';
import ResultsView from './components/ResultsView';
import { EmptyAccounts, LoadingState, InsufficientData, PreRun, RunningSkeleton } from './components/States';
import { AlertTriangle } from 'lucide-react';

const BADGE_VARIANTS = {
  Backtest: 'is-backtest',
  Live: 'is-live',
  Demo: 'is-demo',
};

/**
 * Monte Carlo Simulator (/backtester/simulator).
 *
 * This component only resolves data (account -> trades -> scores) and picks a
 * state. All simulation state lives in <Workspace>, which is keyed by account
 * so every default resets cleanly when the account changes.
 */
export default function SimulatorPage() {
  const { state } = useAppContext();
  const { accountId } = useDashboardAccount();
  const { data: accounts = [] } = useAccounts();
  const { data: rawTrades = [], isLoading } = useTrades(accountId);

  const simAccount = useMemo(() => accounts.find((a) => a.id === accountId) || null, [accounts, accountId]);

  const simTrades = useMemo(() => {
    if (!rawTrades || rawTrades.length === 0) return [];
    return enrichTradesFromDB(rawTrades).enrichedTrades;
  }, [rawTrades]);

  const isMoney = getMetricMode(simAccount) === '$';

  const stats = useMemo(
    () => computeStats(simTrades, state.currentR, simAccount),
    [simTrades, state.currentR, simAccount]
  );

  const scores = useMemo(() => (stats?.outcomes || []).map((o) => o.score ?? 0), [stats]);
  const actualCurve = useMemo(() => [0, ...(stats?.equity || []).map((p) => p.y)], [stats]);

  usePageHeader({
    title: 'Monte Carlo Simulator',
    badge: simAccount?.type,
    badgeVariant: BADGE_VARIANTS[simAccount?.type] || 'is-default',
  });

  if (accounts.length === 0) return <EmptyAccounts />;
  if (isLoading && scores.length < MIN_TRADES) return <LoadingState />;
  if (scores.length < MIN_TRADES) {
    return <InsufficientData accountName={simAccount?.name} count={scores.length} />;
  }

  return (
    <Workspace
      key={accountId}
      scores={scores}
      actualCurve={actualCurve}
      simAccount={simAccount}
      isMoney={isMoney}
    />
  );
}

function Workspace({ scores, actualCurve, simAccount, isMoney }) {
  const sim = useSimulation({ scores, simAccount, isMoney });
  const { result, summary, previous, isStale, isRunning, progress, error, runs, method, canRun, run, setMethod } = sim;

  const accountMeta = { accountName: simAccount?.name, accountType: simAccount?.type };

  return (
    <div className="sx page-fade-in">
      <aside className="sx-rail sx-card">
        <ControlRail
          sim={sim}
          isMoney={isMoney}
          accountName={simAccount?.name}
          unitLabel={isMoney ? 'USD' : 'R multiples'}
        />
      </aside>

      <main className="sx-main" aria-busy={isRunning}>
        {error && (
          <div className="sx-banner tone-bad" role="alert">
            <AlertTriangle size={16} />
            <span><b>Simulation failed.</b> {error}</span>
          </div>
        )}

        {result && isStale && !isRunning && (
          <div className="sx-banner tone-warn" role="status">
            <AlertTriangle size={16} />
            <span>
              <b>Settings changed.</b> These results use the previous settings. Run again to update them.
            </span>
            <button type="button" className="sx-inline-btn" onClick={run} disabled={!canRun}>Run now</button>
          </div>
        )}

        {isRunning && !result && <RunningSkeleton runs={runs} method={method} progress={progress} />}
        {!result && !isRunning && !error && <PreRun onRun={run} disabled={!canRun} />}

        {result && summary && (
          <ResultsView
            result={result}
            summary={summary}
            previous={previous}
            isMoney={isMoney}
            actualCurve={actualCurve}
            accountMeta={accountMeta}
            busy={isRunning}
            onSwitchToBootstrap={() => setMethod('bootstrap')}
          />
        )}
        {isRunning && result && (
          <div className="sx-busy-bar" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
        )}
        <div className="sx-footnote">
          Simulations resample your recorded trades. They describe the range of outcomes consistent with
          that history ({fmtInt(sim.n)} trades), not a forecast.
        </div>
      </main>
    </div>
  );
}
