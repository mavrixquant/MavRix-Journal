// src/components/dashboard/DashboardMain.jsx
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';
import Hero from './sections/Hero';
import KPIGrid from './sections/KPIGrid';
import Calendar from './sections/Calendar';
import WeeklyChart from './sections/WeeklyCards';
import TradeTable from './sections/TradeTable';
import RRCompareChart from './charts/RRCompareChart';
import TimeChart from './charts/TimeChart';
import CategoryBarChart from './charts/CategoryBarChart';
import { useAppContext } from '../../context/AppContext';

export default function DashboardMain({ sessionData, dowData, dirData, setupData, factorData, maxAbs }) {
  const { state } = useAppContext();
  const selectedAccount = state.accounts.find(acc => acc.id === state.selectedAccountId) || null;
  const isBacktest = selectedAccount?.type === 'Backtest';

  return (
    <>
      <DashboardHeader />

      <div className="dashboard-grid">
        
        {/* LEFT COLUMN */}
        <div className="grid-col">
          <KPIGrid />
          <Hero />
          <div className="time-chart-container">
            <TimeChart />
          </div>
          <div className="grid-3">
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Session</span>
                <span className="panel-note">Total R</span>
              </div>
              <div className="chart-box small">
                <CategoryBarChart data={sessionData} horizontal={true} />
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Day of Week</span>
                <span className="panel-note">Total R</span>
              </div>
              <div className="chart-box small">
                <CategoryBarChart data={dowData} horizontal={false} />
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Direction</span>
                <span className="panel-note">Long vs Short</span>
              </div>
              <div className="chart-box small">
                <CategoryBarChart data={dirData} horizontal={false} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="grid-col">
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Monthly Calendar</span>
              <span className="panel-note">R at selected target · weekly total on right</span>
            </div>
            <Calendar />
            <span style={{ display: 'block', height: '30px' }}></span>
            <WeeklyChart />
          </div>

          <RRCompareChart />
        </div>

        
      </div>

      {/* Trade Log */}
      <div className="section-title" style={{ marginTop: '40px' }}>
        <span className="idx"></span>Trade Log
        <div className="line"></div>
      </div>
      <div className="panel">
        <TradeTable />
      </div>

      <DashboardFooter />
    </>
  );
}