import Hero from './Hero';
import KPIGrid from './KPIGrid';
import AdvancedKPIGrid from './AdvancedKPIGrid';
import DurationWidget from './DurationWidget';
import Calendar from './Calendar';
import TimeHeatmap from './TimeHeatmap';
import Breakdown from './Breakdown';
import RRCompare from './RRCompare';
import StrategyPanel from './StrategyPanel';
import { MonthlyPanel, RollingPanel, DistributionPanel } from './ChartPanels';

/**
 * Panel contract (unchanged): panels take no props and read data from useStats().
 * Ids must match DEFAULT_LAYOUT in layout/dashboardLayout.js.
 */
export const PANEL_REGISTRY = {
  kpiGrid:           { label: 'Key metrics ribbon',       Component: KPIGrid },
  hero:              { label: 'Equity & drawdown',        Component: Hero },
  calendar:          { label: 'P&L calendar',             Component: Calendar },
  monthly:           { label: 'Monthly performance',      Component: MonthlyPanel },
  rollingExpectancy: { label: 'Rolling expectancy',       Component: RollingPanel },
  distribution:      { label: 'Trade distribution',       Component: DistributionPanel },
  timeChart:         { label: 'Edge by time (heatmap)',   Component: TimeHeatmap },
  categoryCharts:    { label: 'Session / weekday / side', Component: Breakdown },
  rrCompare:         { label: 'R:R sweep / symbols',      Component: RRCompare },
  advancedKpiGrid:   { label: 'Risk-adjusted ratios',     Component: AdvancedKPIGrid },
  durationWidget:    { label: 'Habits & payoff',          Component: DurationWidget },
  strategyBreakdown: { label: 'Strategies',               Component: StrategyPanel },
};

export function panelLabel(id) {
  return PANEL_REGISTRY[id]?.label || id;
}
