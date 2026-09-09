// src/components/AppRouter.jsx
import { useState } from 'react';
import DashboardMain from './dashboard/DashboardMain';
import JournalMain from './journal/JournalMain';
import AccountsMain from './accounts/AccountsMain';
import { useStats } from '../hooks/useStats';

export default function AppRouter() {
  const [activeTab, setActiveTab] = useState('dashboard');
  // ... you already have sessionData, dowData, etc. from useStats.
  // We'll pass these to DashboardMain if needed.

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardMain />; // you may need to pass props
      case 'journal':
        return <JournalMain />;
      case 'accounts':
        return <AccountsMain />;
      default:
        return <div>Not found</div>;
    }
  };

  return <>{renderContent()}</>;
}