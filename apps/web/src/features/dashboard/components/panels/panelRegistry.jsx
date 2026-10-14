// apps/web/src/features/dashboard/components/panels/panelRegistry.jsx
import Hero from './Hero';
import KPIGrid from './KPIGrid';
import AdvancedKPIGrid from './AdvancedKPIGrid';
import DurationWidget from './DurationWidget';
import SymbolBreakdownTable from './SymbolBreakdownTable';
import StrategyBreakdownTable from './StrategyBreakdownTable';
import Calendar from './Calendar';
import WeeklyChart from './WeeklyChart';
import RRCompareChart from '../charts/RRCompareChart';
import UnderwaterChart from '../charts/UnderwaterChart';
import TimeChart from '../charts/TimeChart';
import MonthlyChart from '../charts/MonthlyChart';
import RollingExpectancyChart from '../charts/RollingExpectancyChart';
import CategoryBarChart from '../charts/CategoryBarChart';
import { useStats } from '@/features/dashboard/hooks/useStats';

/* ------------------------------------------------------------------ */
/*  Shared Panel shell                                                 */
/*                                                                    */
/*  Phase 1 changes:                                                  */
/*    • outer wrapper adds minWidth: 0 so flex children can shrink    */
/*    • header row gets flexShrink: 0 explicitly (was implicit)       */
/*    • body gains a `scrollable` prop — tables opt in, charts stay   */
/*      hidden so a Chart.js canvas never gets a scrollbar attached.  */
/*    • note span truncates rather than pushing the panel wider.      */
/* ------------------------------------------------------------------ */
function Panel({
  title,
  note,
  children,
  padding = '14px 16px',
  scrollable = false,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {title && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            padding: '14px 18px 10px',
            borderBottom: '1px solid rgba(255,255,255,.05)',
            flexShrink: 0,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: '#E7E9EE',
              letterSpacing: '-.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {title}
          </span>
          {note && (
            <span
              style={{
                fontSize: 10,
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                letterSpacing: '.06em',
                color: '#F59E0B',
                opacity: 0.8,
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {note}
            </span>
          )}
        </div>
      )}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          padding,
          overflow: scrollable ? 'auto' : 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wrapper components                                                 */
/* ------------------------------------------------------------------ */

function HeroPanel() {
  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Hero />
    </div>
  );
}

function CalendarPanel() {
  const { metric } = useStats();
  const isMoney = metric === '$';
  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px 10px',
          borderBottom: '1px solid rgba(255,255,255,.05)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#E7E9EE', letterSpacing: '-.01em' }}>
          Monthly Calendar
        </span>
        <span
          style={{
            fontSize: 10,
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            letterSpacing: '.06em',
            color: '#F59E0B',
            opacity: 0.8,
          }}
        >
          {isMoney ? 'Net P&L & Weekly' : 'Target R & Weekly'}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, minWidth: 0, padding: '14px 18px', overflow: 'auto' }}>
        <Calendar />
        <div style={{ height: 20 }} />
        <WeeklyChart />
      </div>
    </div>
  );
}

function MonthlyPanel() {
  const { metric } = useStats();
  const isMoney = metric === '$';
  return (
    <Panel
      title={isMoney ? 'Monthly Net P&L' : 'Monthly R'}
      note={isMoney ? '$ per month' : 'R per month'}
    >
      <MonthlyChart />
    </Panel>
  );
}

function UnderwaterPanel() {
  return (
    <Panel title="Underwater Curve" note="Drawdown from peak">
      <UnderwaterChart />
    </Panel>
  );
}

function TimeChartPanel() {
  return (
    <Panel>
      <TimeChart />
    </Panel>
  );
}

function RollingExpectancyPanel() {
  const { metric } = useStats();
  const isMoney = metric === '$';
  return (
    <Panel
      title="Rolling 20-Trade Expectancy"
      note={isMoney ? '$ per trade' : 'R per trade'}
    >
      <RollingExpectancyChart />
    </Panel>
  );
}

function RRComparePanel() {
  const { metric } = useStats();
  const isMoney = metric === '$';
  return (
    <Panel
      title={isMoney ? 'Symbol Performance' : 'Target R:R Comparison'}
      note={isMoney ? 'Net $ per symbol' : 'Sweep 1:1 → 1:8'}
    >
      {isMoney ? <SymbolBreakdownTable /> : <RRCompareChart />}
    </Panel>
  );
}

function StrategyBreakdownPanel() {
  // Phase 1: opt into internal scroll since this is a DataTable.
  return (
    <Panel title="By Strategy" note="net per playbook" scrollable>
      <StrategyBreakdownTable />
    </Panel>
  );
}

function CategoryChartsPanel() {
  const { groupBy, metric } = useStats();
  const isMoney = metric === '$';
  const unitLabel = isMoney ? 'Net P&L' : 'Total R';

  const sessionOrder = ['Asia', 'London', 'NY Pre-Market', 'NY AM', 'NY Lunch', 'NY PM', 'After Hours'];
  const dowOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const sessionData = groupBy((o) => o.session, sessionOrder);
  const dowData = groupBy((o) => o.dowName, dowOrder);
  const dirData = groupBy((o) => o.dir);

  const charts = [
    { title: 'Session', note: unitLabel, data: sessionData, horizontal: true },
    { title: 'Day of Week', note: unitLabel, data: dowData, horizontal: false },
    { title: 'Direction', note: 'Long/Short', data: dirData, horizontal: false },
  ];

  return (
    <Panel padding="0">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          height: '100%',
          minHeight: 0,
          minWidth: 0,
        }}
      >
        {charts.map((p) => (
          <div
            key={p.title}
            style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: '1px solid rgba(255,255,255,.05)',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: '#E7E9EE' }}>{p.title}</span>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                  letterSpacing: '.06em',
                  color: '#F59E0B',
                  opacity: 0.8,
                }}
              >
                {p.note}
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
              <CategoryBarChart data={p.data} horizontal={p.horizontal} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*  Registry — every entry has a `Component`                           */
/* ------------------------------------------------------------------ */
export const PANEL_REGISTRY = {
  hero:              { label: 'Cumulative Equity Hero',                Component: HeroPanel },
  kpiGrid:           { label: 'Core KPI Grid',                         Component: KPIGrid },
  advancedKpiGrid:   { label: 'Advanced KPI Grid',                     Component: AdvancedKPIGrid },
  durationWidget:    { label: 'Holding Time Widget',                   Component: DurationWidget },
  calendar:          { label: 'Monthly Calendar & Weekly',             Component: CalendarPanel },
  monthly:           { label: 'Monthly R / Net P&L',                   Component: MonthlyPanel },
  underwater:        { label: 'Underwater Curve',                      Component: UnderwaterPanel },
  timeChart:         { label: 'Time of Day Chart',                     Component: TimeChartPanel },
  rollingExpectancy: { label: 'Rolling 20-Trade Expectancy',           Component: RollingExpectancyPanel },
  rrCompare:         { label: 'RR Comparison / Symbol Breakdown',      Component: RRComparePanel },
  strategyBreakdown: { label: 'Strategy Breakdown',                    Component: StrategyBreakdownPanel },
  categoryCharts:    { label: 'Session / DOW / Direction Charts',      Component: CategoryChartsPanel },
};

export function panelLabel(id) {
  return PANEL_REGISTRY[id]?.label || id;
}