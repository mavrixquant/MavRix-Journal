// src/components/tabs/Dashboard.jsx
import KPIGrid from '../dashboard/KPIGrid';
import Hero from '../dashboard/Hero';
import RRCompareChart from '../dashboard/RRCompareChart';
import CategoryBarChart from '../dashboard/CategoryBarChart';
import TimeChart from '../dashboard/TimeChart';
import BreakdownBars from '../dashboard/BreakdownBars';
import Calendar from '../dashboard/Calendar';
import WeeklyChart from '../dashboard/WeeklyChart';
import TradeTable from '../dashboard/TradeTable';
import DashboardHeader from '../dashboard/DashboardHeader';
import DashboardFooter from '../dashboard/DashboardFooter';

export default function Dashboard({ 
  sessionData, 
  dowData, 
  dirData, 
  setupData, 
  factorData, 
  maxAbs 
}) {
  return (
    <>
      {/* Two-column grid */}
      <DashboardHeader />
      <div className="dashboard-grid">
        {/* LEFT COLUMN */}
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
          <div className="grid-2">
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">By Setup</span>
                <span className="panel-note">Total R · Win Rate</span>
              </div>
              <BreakdownBars data={setupData} maxAbs={maxAbs} />
            </div>
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">By Setup Factor</span>
                <span className="panel-note">Total R · Win Rate</span>
              </div>
              <BreakdownBars data={factorData} maxAbs={maxAbs} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="grid-col">
          <KPIGrid />
          <Hero />
          <div className="time-chart-container">
            <div className="chart-box">
              <TimeChart />
            </div>
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
      </div>

      {/* Trade Log (full width) */}
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