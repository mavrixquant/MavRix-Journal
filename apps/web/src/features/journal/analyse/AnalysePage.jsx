// apps/web/src/features/journal/analyse/AnalysePage.jsx
//
// The Analyse route — a full analytical report for the currently selected
// Journal account (Live or Demo).
//
// Sections:
//   01  Snapshot            — Hero equity + KPI grids
//   02  Equity & Drawdown   — underwater curve + daily P&L / R:R
//   03  Monthly             — month bars + calendar heatmap + weekly chips
//   04  Timing              — time-of-day chart + rolling expectancy
//   05  Breakdowns          — session / day-of-week / direction bars
//   06  Symbols & Duration  — symbol table + holding-time widget
//   07  Trade Log           — full filterable table
//
// Filter UI lives in AnalyseFilters (moved here from the Journal dashboard
// header in the Analyse revamp). Everything below the header is driven by
// the shared useStats() hook, which reads the filtered trades produced by
// useFilters() → applyFilters(). So every panel updates live as the user
// toggles filters.

import { useAuth } from '@/app/providers/AuthProvider';
import { useAppContext } from '@/app/providers/AppProvider';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { useEnrichedTrades } from '@/features/dashboard/hooks/useEnrichedTrades';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { useFilterUrlSync } from '@/features/dashboard/hooks/useFilterUrlSync';

import { PageSkeleton } from '@/shared/ui/page-skeleton';

import AnalyseHeader from './AnalyseHeader';
import AnalyseFilters from './AnalyseFilters';
import { AnalyseSection, AnalysePanel } from './AnalyseSection';

// ---- Dashboard panels (allowed: journal → dashboard) ----
import Hero from '@/features/dashboard/components/panels/Hero';
import KPIGrid from '@/features/dashboard/components/panels/KPIGrid';
import AdvancedKPIGrid from '@/features/dashboard/components/panels/AdvancedKPIGrid';
import DurationWidget from '@/features/dashboard/components/panels/DurationWidget';
import SymbolBreakdownTable from '@/features/dashboard/components/panels/SymbolBreakdownTable';
import Calendar from '@/features/dashboard/components/panels/Calendar';
import WeeklyChart from '@/features/dashboard/components/panels/WeeklyChart';
import TradeTable from '@/features/dashboard/components/panels/TradeTable';

// ---- Dashboard charts ----
import MonthlyChart from '@/features/dashboard/components/charts/MonthlyChart';
import RollingExpectancyChart from '@/features/dashboard/components/charts/RollingExpectancyChart';
import UnderwaterChart from '@/features/dashboard/components/charts/UnderwaterChart';
import TimeChart from '@/features/dashboard/components/charts/TimeChart';
import RRCompareChart from '@/features/dashboard/components/charts/RRCompareChart';
import CategoryBarChart from '@/features/dashboard/components/charts/CategoryBarChart';

/* ------------------------------------------------------------------ */
/*  Page CSS.                                                          */
/*  All classes used by AnalyseHeader / AnalyseFilters / AnalyseSection */
/*  live here so this stylesheet is emitted exactly once per route.    */
/* ------------------------------------------------------------------ */
const CSS = `
  .analyse-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --glass-1: rgba(255,255,255,.045);
    --glass-2: rgba(255,255,255,.012);

    position: relative;
    width: 100%;
    max-width: 1560px;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding-bottom: 40px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* ---------- Panel grid ---------- */
  .analyse-panels {
    display: grid;
    gap: 18px;
    min-width: 0;
  }
  .analyse-panels.cols-1 { grid-template-columns: minmax(0, 1fr); }
  .analyse-panels.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .analyse-panels.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

  @media (max-width: 1100px) {
    .analyse-panels.cols-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 760px) {
    .analyse-panels.cols-2,
    .analyse-panels.cols-3 { grid-template-columns: minmax(0, 1fr); }
  }

  /* ---------- Section ---------- */
  .as-root {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  .as-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--line);
  }
  .as-num {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    color: var(--accent);
    padding: 3px 8px;
    border-radius: 6px;
    background: var(--accent-soft);
    border: 1px solid var(--accent-soft2);
    flex-shrink: 0;
    line-height: 1.4;
  }
  .as-title {
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: .22em;
    text-transform: uppercase;
    color: var(--ink-1);
    margin: 0;
    white-space: nowrap;
    line-height: 1.4;
  }
  .as-rule {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, var(--line), transparent);
    min-width: 20px;
  }
  .as-note {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    letter-spacing: .04em;
    flex-shrink: 0;
    line-height: 1.4;
  }
  .as-body {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }

  /* ---------- Panel card ---------- */
  .as-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: 16px;
    background: linear-gradient(180deg, var(--glass-1), var(--glass-2));
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow:
      0 20px 50px -30px rgba(0,0,0,.9),
      inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
    min-width: 0;
    transition: border-color .3s ease, box-shadow .3s ease;
  }
  .as-panel:hover {
    border-color: rgba(245,158,11,.20);
    box-shadow:
      0 24px 60px -30px rgba(0,0,0,.95),
      0 0 32px -14px rgba(245,158,11,.22),
      inset 0 1px 0 rgba(255,255,255,.04);
  }
  .as-panel-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 18px 11px;
    border-bottom: 1px solid var(--line-soft);
    flex-shrink: 0;
  }
  .as-panel-title {
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: -.005em;
    color: var(--ink-1);
  }
  .as-panel-note {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--accent);
    opacity: .8;
    margin-left: auto;
    flex-shrink: 0;
  }
  .as-panel-body {
    flex: 1 1 auto;
    min-height: 0;
    padding: 16px 18px;
    position: relative;
    overflow: auto;
  }

  /* ---------- Filter bar ---------- */
  .af-root {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 18px;
    border-radius: 16px;
    background: linear-gradient(180deg, var(--glass-1), var(--glass-2));
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow:
      0 20px 50px -30px rgba(0,0,0,.9),
      inset 0 1px 0 rgba(255,255,255,.03);
  }
  .af-primary {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .af-spacer { flex: 1; min-width: 8px; }
  .af-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .af-btn:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .af-btn:active { transform: translateY(0) scale(.98); }
  .af-btn.is-active {
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.10);
    color: var(--accent);
    box-shadow: 0 0 20px -8px rgba(245,158,11,.4);
  }
  .af-btn.is-active:hover {
    background: rgba(245,158,11,.16);
    border-color: var(--accent);
  }
  .af-btn svg { flex-shrink: 0; }

  .af-btn-reset {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid rgba(239,68,68,.28);
    background: rgba(239,68,68,.05);
    color: #f87171;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .af-btn-reset:hover:not(:disabled) {
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55);
    color: #fca5a5;
    transform: translateY(-1px);
  }
  .af-btn-reset:disabled {
    opacity: .35;
    cursor: not-allowed;
    transform: none;
  }

  .af-chips {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding-top: 4px;
  }
  .af-chips-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-right: 4px;
  }
  .af-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 4px 4px 10px;
    border-radius: 999px;
    background: var(--accent-soft);
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .01em;
    max-width: 340px;
    line-height: 1.4;
  }
  .af-chip-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .af-chip-x {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: none;
    background: rgba(245,158,11,.15);
    color: inherit;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: all .15s;
  }
  .af-chip-x:hover {
    background: rgba(245,158,11,.32);
    color: #FFFFFF;
  }

  /* ---------- Empty / no-match states ---------- */
  .an-empty {
    padding: 60px 24px;
    text-align: center;
    border: 1px dashed rgba(255,255,255,.10);
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.005));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .an-empty-icon {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(245,158,11,.14), rgba(245,158,11,.04));
    border: 1px solid var(--accent-soft2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
    color: var(--accent);
    box-shadow: 0 0 30px -10px rgba(245,158,11,.55);
  }
  .an-empty h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.01em;
  }
  .an-empty p {
    margin: 0;
    font-size: 12.5px;
    color: var(--ink-2);
    line-height: 1.65;
    max-width: 420px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }

  @media (prefers-reduced-motion: reduce) {
    .as-panel, .af-btn, .af-btn-reset, .af-chip-x { transition: none !important; }
  }

  @media (max-width: 640px) {
    .analyse-root { gap: 22px; }
    .as-head { flex-wrap: wrap; }
    .as-note { margin-left: 0; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Local breakdown wrappers                                           */
/*  CategoryBarChart needs a `data` prop; these tiny wrappers build    */
/*  that data from useStats().groupBy with a canonical ordering.       */
/* ------------------------------------------------------------------ */
const SESSION_ORDER = [
  'Asia', 'London', 'NY Pre-Market', 'NY AM',
  'NY Lunch', 'NY PM', 'After Hours',
];
const DOW_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function SessionBreakdown() {
  const { groupBy } = useStats();
  const data = groupBy((o) => o.session, SESSION_ORDER);
  return <CategoryBarChart data={data} horizontal={true} />;
}

function DowBreakdown() {
  const { groupBy } = useStats();
  const data = groupBy((o) => o.dowName, DOW_ORDER);
  return <CategoryBarChart data={data} horizontal={false} />;
}

function DirectionBreakdown() {
  const { groupBy } = useStats();
  const data = groupBy((o) => o.dir);
  return <CategoryBarChart data={data} horizontal={false} />;
}

/* ------------------------------------------------------------------ */
/*  Empty states                                                       */
/* ------------------------------------------------------------------ */
function EmptyState() {
  return (
    <div className="an-empty">
      <div className="an-empty-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 4 4 5-5" />
        </svg>
      </div>
      <h3>No trades to analyse</h3>
      <p>
        Upload or add trades to this account first. Once there is data, this
        page will break down performance, timing, edge, and drawdown across
        seven report sections.
      </p>
    </div>
  );
}

function NoMatchesState() {
  return (
    <div className="an-empty">
      <div className="an-empty-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <h3>No trades match your filters</h3>
      <p>
        Try removing a filter chip above, or click Reset to see every trade
        for this account.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AnalysePage() {
  const { user } = useAuth();
  const { state } = useAppContext();
  const { accountId } = useDashboardAccount();

  // Load + enrich + dispatch trades. Returns the enriched payload so we can
  // distinguish "account has no trades" from "filters excluded everything".
  const enriched = useEnrichedTrades(accountId);

  // Mirror filter state to the URL for shareable / back-button support.
  useFilterUrlSync();

  const { stats, account } = useStats();

  const totalCount = enriched.enrichedTrades.length;
  const filteredCount = stats?.n ?? 0;

  // On the very first render, the enrichment payload is ready but its
  // useEffect dispatch into AppProvider hasn't fired yet — so state.trades
  // is still empty and stats.n is transiently 0. Detect that window and
  // show a skeleton instead of a false "no matches" screen.
  const isHydrating = totalCount > 0 && state.trades.length === 0;

  if (!user || isHydrating) return <PageSkeleton />;

  const hasAnyTrades = totalCount > 0;

  return (
    <div className="analyse-root">
      <style>{CSS}</style>

      <AnalyseHeader
        account={account}
        totalCount={totalCount}
        filteredCount={filteredCount}
      />

      <AnalyseFilters />

      {!hasAnyTrades ? (
        <EmptyState />
      ) : filteredCount === 0 ? (
        <NoMatchesState />
      ) : (
        <>
          {/* ───────────────────────── 01 Snapshot ───────────────────────── */}
          <AnalyseSection
            num="01"
            title="Snapshot"
            note={`${filteredCount} ${filteredCount === 1 ? 'trade' : 'trades'}`}
          >
            <Hero />
            <KPIGrid />
            <AdvancedKPIGrid />
          </AnalyseSection>

          {/* ───────────────────── 02 Equity & Drawdown ──────────────────── */}
          <AnalyseSection num="02" title="Equity & Drawdown">
            <div className="analyse-panels cols-2">
              <AnalysePanel
                title="Underwater Curve"
                note="Drawdown from peak"
                height={320}
              >
                <UnderwaterChart />
              </AnalysePanel>
              <AnalysePanel
                title={
                  account?.type === 'Backtest'
                    ? 'Target R:R Comparison'
                    : 'Daily Net P&L'
                }
                height={320}
              >
                <RRCompareChart />
              </AnalysePanel>
            </div>
          </AnalyseSection>

          {/* ────────────────────── 03 Monthly Performance ───────────────── */}
          <AnalyseSection num="03" title="Monthly Performance">
            <div className="analyse-panels cols-1">
              <AnalysePanel title="Monthly Breakdown" height={300}>
                <MonthlyChart />
              </AnalysePanel>
            </div>
            <div className="analyse-panels cols-1">
              <AnalysePanel title="Calendar & Weekly Summary" height="auto">
                <Calendar />
                <div style={{ height: 20 }} />
                <WeeklyChart />
              </AnalysePanel>
            </div>
          </AnalyseSection>

          {/* ──────────────────────── 04 Timing ───────────────────────────── */}
          <AnalyseSection num="04" title="Timing & Momentum">
            <div className="analyse-panels cols-2">
              <AnalysePanel title="Time of Day" height={320}>
                <TimeChart />
              </AnalysePanel>
              <AnalysePanel title="Rolling 20-Trade Expectancy" height={320}>
                <RollingExpectancyChart />
              </AnalysePanel>
            </div>
          </AnalyseSection>

          {/* ─────────────────────── 05 Breakdowns ────────────────────────── */}
          <AnalyseSection num="05" title="Breakdowns">
            <div className="analyse-panels cols-3">
              <AnalysePanel title="By Session" height={300}>
                <SessionBreakdown />
              </AnalysePanel>
              <AnalysePanel title="By Day of Week" height={300}>
                <DowBreakdown />
              </AnalysePanel>
              <AnalysePanel title="By Direction" height={300}>
                <DirectionBreakdown />
              </AnalysePanel>
            </div>
          </AnalyseSection>

          {/* ───────────────────── 06 Symbols & Duration ─────────────────── */}
          <AnalyseSection num="06" title="Symbols & Duration">
            <div className="analyse-panels cols-2">
              <AnalysePanel title="Symbol Breakdown" height="auto">
                <SymbolBreakdownTable />
              </AnalysePanel>
              <AnalysePanel title="Holding Time" height="auto">
                <DurationWidget />
              </AnalysePanel>
            </div>
          </AnalyseSection>

          {/* ─────────────────────── 07 Trade Log ─────────────────────────── */}
          <AnalyseSection
            num="07"
            title="Trade Log"
            note={`${filteredCount} ${filteredCount === 1 ? 'row' : 'rows'}`}
          >
            <div className="analyse-panels cols-1">
              <AnalysePanel title="All Filtered Trades" height="auto">
                <TradeTable />
              </AnalysePanel>
            </div>
          </AnalyseSection>
        </>
      )}
    </div>
  );
}