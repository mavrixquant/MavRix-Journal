// src/components/AppLayout.jsx
import { useState, useRef } from 'react';
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
  const [isHovering, setIsHovering] = useState(false);
  const closeTimeoutRef = useRef(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = async () => {
    await signOut(auth);
  };

  const isSidebarOpen = isHovering;

  const handleSidebarMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsHovering(true);
  };

  const handleSidebarMouseLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 300);
  };

  const toggleSidebar = () => {
    // Clear any pending close to avoid immediate closure after manual open
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
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
        return <DashboardMain sessionData={sessionData} dowData={dowData} dirData={dirData} setupData={setupData} factorData={factorData} maxAbs={maxAbs} />;
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
      />
      <div
        className={`content-wrapper ${isSidebarOpen ? 'with-sidebar-open' : 'with-sidebar-closed'}`}
        style={{ transition: 'margin-left 0.3s ease' }}
      >
        <main style={{ padding: '26px 28px', width: '100%', boxSizing: 'border-box' }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}