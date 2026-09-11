// src/components/AppLayout.jsx
import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import Sidebar from './common/Sidebar';
import AccountModal from './common/AccountModal';
import DashboardMain from './dashboard/DashboardMain';
import JournalMain from './journal/JournalMain';
import AccountsMain from './accounts/AccountsMain';
import SimulatorPage from './simulator/SimulatorPage';
import { useStats } from '../hooks/useStats';

export default function AppLayout() {
  const { user } = useAuth();
  const [isHovering, setIsHovering] = useState(false);
  const closeTimeoutRef = useRef(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const handleLogout = async () => { await signOut(auth); };
  const isSidebarOpen = isHovering;

  const handleSidebarMouseEnter = () => {
    if (closeTimeoutRef.current) { clearTimeout(closeTimeoutRef.current); closeTimeoutRef.current = null; }
    setIsHovering(true);
  };
  const handleSidebarMouseLeave = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setIsHovering(false), 300);
  };
  const toggleSidebar = () => {
    if (closeTimeoutRef.current) { clearTimeout(closeTimeoutRef.current); closeTimeoutRef.current = null; }
    setIsHovering(prev => !prev);
  };

  const { groupBy } = useStats();
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
            sessionData={sessionData}
            dowData={dowData}
            dirData={dirData}
            setupData={setupData}
            factorData={factorData}
            maxAbs={maxAbs}
            onNavigate={setActiveTab}
          />
        );
      case 'simulator':
        return <SimulatorPage />;
      case 'journal':
        return <JournalMain />;
      case 'accounts':
        return <AccountsMain />;
      default:
        return <div>Not found</div>;
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={handleLogout}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        onAccountClick={() => setIsAccountModalOpen(true)}
      />
      <div
        className="content-wrapper"
        style={{
          marginLeft: isSidebarOpen ? '240px' : '68px',
          transition: 'margin-left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          minHeight: '100vh',
          overflowX: 'hidden',
        }}
      >
        <main style={{ padding: '26px 28px', width: '100%', boxSizing: 'border-box' }}>
          {renderContent()}
        </main>
      </div>
      <AccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} />
    </div>
  );
}