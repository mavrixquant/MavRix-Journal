// src/App.jsx
import { useState } from 'react';
import { useAppContext } from "./context/AppContext";
import UploadGate from "./components/upload/UploadGate";
import Sidebar from './components/layout/Sidebar';
import Journal from "./components/tabs/Journal";
import Backtest from "./components/tabs/Backtest";
import Accounts from "./components/tabs/Accounts";
import Dashboard from "./components/tabs/Dashboard";   // <-- new import
import { useStats } from "./hooks/useStats";

function App() {
  const { state } = useAppContext();
  const showDashboard = !state.isUploadGateVisible && state.trades.length > 0;
  const { stats, groupBy } = useStats();

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  // Tab state
  const [activeTab, setActiveTab] = useState('dashboard');

  // Aggregations (same as before)
  const sessionOrder = ["Asia", "London", "NY Pre-Market", "NY AM", "NY Lunch", "NY PM", "After Hours"];
  const dowOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const sessionData = groupBy((o) => o.session, sessionOrder);
  const dowData = groupBy((o) => o.dowName, dowOrder);
  const dirData = groupBy((o) => o.dir);
  const setupData = groupBy((o) => o.setup);
  const factorData = groupBy((o) => o.factors);

  const allBreakdownData = [...setupData, ...factorData];
  const maxAbs = allBreakdownData.length > 0
    ? Math.max(1, ...allBreakdownData.map((d) => Math.abs(d.totalR)))
    : 1;

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            sessionData={sessionData}
            dowData={dowData}
            dirData={dirData}
            setupData={setupData}
            factorData={factorData}
            maxAbs={maxAbs}
          />
        );
      case 'journal':
        return <Journal />;
      case 'backtest':
        return <Backtest />;
      case 'accounts':
        return <Accounts />;
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div>
      {showDashboard ? (
        <>
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={toggleSidebar}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          <div className={`content-wrapper ${sidebarOpen ? 'with-sidebar-open' : 'with-sidebar-closed'}`}>
            <main style={{ maxWidth: 'auto', margin: '0 auto', padding: '26px 28px' }}>
              {renderContent()}
            </main>
          </div>
        </>
      ) : (
        <UploadGate />
      )}
    </div>
  );
}

export default App;