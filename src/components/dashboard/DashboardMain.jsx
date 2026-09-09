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
import { useStats } from '../../hooks/useStats';

export default function DashboardMain({ sessionData, dowData, dirData, setupData, factorData, maxAbs }) {
  const { state } = useAppContext();
  const { stats } = useStats();

  // Check if trading data exists
  const hasData = stats && stats.n > 0;

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <DashboardHeader />

      {!hasData ? (
        /* ================= EMPTY STATE VIEW (NO FOOTER) ================= */
        <div
          style={{
            minHeight: 'calc(100vh - 120px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#11151F',
              border: '1px solid #212836',
              borderRadius: '16px',
              padding: '48px 32px',
              maxWidth: '480px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              fontFamily: "'Inter', sans-serif",
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Empty State Icon */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                backgroundColor: '#161B26',
                border: '1px solid #212836',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFB020"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>

            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#E7E9EE',
              }}
            >
              No Trading Data Available
            </h3>

            <p
              style={{
                margin: '0 0 24px 0',
                fontSize: '13px',
                color: '#8892A3',
                lineHeight: '1.6',
              }}
            >
              Log trades in your journal or adjust your active account filters to populate performance statistics and analytics.
            </p>

            <button
              type="button"
              onClick={() => {
                // Handle navigation or opening trade entry modal
              }}
              style={{
                backgroundColor: '#FFB020',
                color: '#0D1117',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Add Your First Trade
            </button>
          </div>
        </div>
      ) : (
        /* ================= FULL DASHBOARD CONTENT ================= */
        <>
          <div
            className="dashboard-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              gap: '16px',
              alignItems: 'start',
              marginBottom: '24px',
            }}
          >
            {/* LEFT COLUMN */}
            <div className="grid-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
              <div
                className="panel"
                style={{
                  background: 'var(--panel-bg, #12161f)',
                  border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="panel-head"
                  style={{
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--border-soft, rgba(255, 255, 255, 0.06))',
                  }}
                >
                  <span className="panel-title" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text, #f0f2f5)' }}>
                    Monthly Calendar
                  </span>
                  <span className="panel-note" style={{ fontSize: '10px', fontFamily: 'var(--mono, monospace)', color: 'var(--text-dim, #8f9bba)' }}>
                    Target R & Weekly
                  </span>
                </div>
                <Calendar />
                <div style={{ height: '20px' }}></div>
                <WeeklyChart />
              </div>

              <div
                className="panel"
                style={{
                  background: 'var(--panel-bg, #12161f)',
                  border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
                  borderRadius: '12px',
                  padding: '14px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  overflow: 'hidden',
                }}
              >
                <RRCompareChart />
              </div>
            </div>
            

            {/* RIGHT COLUMN */}
            <div className="grid-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
              <KPIGrid />
              <Hero />

              <div
                className="time-chart-container panel"
                style={{
                  background: 'var(--panel-bg, #12161f)',
                  border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
                  borderRadius: '12px',
                  padding: '14px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  overflow: 'hidden',
                }}
              >
                <TimeChart />
              </div>

              {/* Categorical Breakdown Grid */}
              <div
                className="grid-3"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
                  gap: '12px',
                }}
              >
                {/* Session Panel */}
                <div
                  className="panel"
                  style={{
                    background: 'var(--panel-bg, #12161f)',
                    border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                  }}
                >
                  <div
                    className="panel-head"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                      paddingBottom: '6px',
                      borderBottom: '1px solid var(--border-soft, rgba(255, 255, 255, 0.05))',
                    }}
                  >
                    <span className="panel-title" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text, #f0f2f5)' }}>
                      Session
                    </span>
                    <span className="panel-note" style={{ fontSize: '10px', fontFamily: 'var(--mono, monospace)', color: 'var(--text-dim, #8f9bba)' }}>
                      Total R
                    </span>
                  </div>
                  <div className="chart-box small" style={{ minHeight: '150px', flex: 1 }}>
                    <CategoryBarChart data={sessionData} horizontal={true} />
                  </div>
                </div>

                {/* Day of Week Panel */}
                <div
                  className="panel"
                  style={{
                    background: 'var(--panel-bg, #12161f)',
                    border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                  }}
                >
                  <div
                    className="panel-head"
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                      paddingBottom: '6px',
                      borderBottom: '1px solid var(--border-soft, rgba(255, 255, 255, 0.05))',
                    }}
                  >
                    <span className="panel-title" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text, #f0f2f5)' }}>
                      Day of Week
                    </span>
                    <span className="panel-note" style={{ fontSize: '10px', fontFamily: 'var(--mono, monospace)', color: 'var(--text-dim, #8f9bba)' }}>
                      Total R
                    </span>
                  </div>
                  <div className="chart-box small" style={{ minHeight: '150px', flex: 1 }}>
                    <CategoryBarChart data={dowData} horizontal={false} />
                  </div>
                </div>

                {/* Direction Panel */}
                <div
                  className="panel"
                  style={{
                    background: 'var(--panel-bg, #12161f)',
                    border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                  }}
                >
                  <div
                    className="panel-head"
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                      paddingBottom: '6px',
                      borderBottom: '1px solid var(--border-soft, rgba(255, 255, 255, 0.05))',
                    }}
                  >
                    <span className="panel-title" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text, #f0f2f5)' }}>
                      Direction
                    </span>
                    <span className="panel-note" style={{ fontSize: '10px', fontFamily: 'var(--mono, monospace)', color: 'var(--text-dim, #8f9bba)' }}>
                      Long/Short
                    </span>
                  </div>
                  <div className="chart-box small" style={{ minHeight: '150px', flex: 1 }}>
                    <CategoryBarChart data={dirData} horizontal={false} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trade Log Title */}
          <div
            className="section-title"
            style={{
              marginTop: '32px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '15px',
              fontWeight: '600',
              color: 'var(--text, #f0f2f5)',
            }}
          >
            <span
              className="idx"
              style={{
                width: '4px',
                height: '16px',
                background: 'var(--amber, #ffb020)',
                borderRadius: '2px',
                display: 'inline-block',
              }}
            ></span>
            Trade Log
            <div
              className="line"
              style={{
                flex: 1,
                height: '1px',
                background: 'var(--border-soft, rgba(255, 255, 255, 0.08))',
              }}
            ></div>
          </div>

          {/* Trade Table Container */}
          <div
            className="panel"
            style={{
              background: 'var(--panel-bg, #12161f)',
              border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
              borderRadius: '12px',
              padding: '14px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              marginBottom: '24px',
              overflowX: 'auto',
            }}
          >
            <TradeTable />
          </div>

          <DashboardFooter />
        </>
      )}
    </div>
  );
}