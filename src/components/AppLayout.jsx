// src/components/AppLayout.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import Sidebar from './common/Sidebar';
import DashboardMain from './dashboard/DashboardMain';
import JournalMain from './journal/JournalMain';
import AccountsMain from './accounts/AccountsMain';
import { useStats } from '../hooks/useStats';

export default function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Data aggregations (same as before)
  const { stats, groupBy } = useStats();
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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardMain
            user={user}
            onLogout={handleLogout}
            sessionData={sessionData}
            dowData={dowData}
            dirData={dirData}
            setupData={setupData}
            factorData={factorData}
            maxAbs={maxAbs}
          />
        );
      case 'journal':
        return <JournalMain />;
      case 'accounts':
        return <AccountsMain />;
      default:
        return <div>Not found</div>;
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className={`content-wrapper ${sidebarOpen ? 'with-sidebar-open' : 'with-sidebar-closed'}`}>
        {/* ✅ Header removed from here */}
        <main style={{ maxWidth: 'auto', margin: '0 auto', padding: '26px 28px' }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}