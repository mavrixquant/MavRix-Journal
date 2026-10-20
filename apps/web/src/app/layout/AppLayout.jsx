import { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import Sidebar, { SidebarContent } from './Sidebar/Sidebar';
import HeaderBar from './HeaderBar/HeaderBar';
import TopStrip from './TopStrip';
import SettingsModal from './Settings/SettingsModal';
import { SettingsModalProvider } from './Settings/SettingsModalContext';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/shared/ui/sheet';
import { useHotkey } from '@/shared/hooks/useHotkey';
import { useSSEBridge } from '@/shared/api/sse';
import { PageHeaderProvider } from './PageHeaderProvider';

const STORAGE_KEY = 'mavrix:sidebar:collapsed';
const LAST_PATH_KEY = 'mavrix:lastPath';

const STORABLE_PREFIXES = [
  '/journal',
  '/backtester',
  '/manage',
  '/utilities',
  '/personal',
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === '1';
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState({ open: false, tab: 'account' });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    if (!user) return;
    const path = location.pathname;
    if (STORABLE_PREFIXES.some((p) => path.startsWith(p))) {
      try {
        localStorage.setItem(LAST_PATH_KEY, path);
      } catch {
      }
    }
  }, [location.pathname, user]);

  useHotkey('mod+b', () => setCollapsed((v) => !v));

  useSSEBridge({ enabled: !!user, currentUserId: user?.id });

  const openSettings = (tab = 'account') =>
    setSettings({ open: true, tab });

  const closeSettings = () =>
    setSettings((s) => ({ ...s, open: false }));

  const handleLogout = async () => {
    await logout();
  };

  return (
    <TooltipProvider delayDuration={250}>
      <SettingsModalProvider
        openSettings={openSettings}
        closeSettings={closeSettings}
      >
        <PageHeaderProvider>
          <TopStrip />

          <Sidebar
            collapsed={collapsed}
            onCollapseToggle={() => setCollapsed((v) => !v)}
            onClose={() => setCollapsed(true)}
          />

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent
              side="left"
              className="w-[280px] max-w-[85vw] border-r border-white/[.085] bg-transparent p-0 [&>button]:hidden"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent
                collapsed={false}
                showCollapseButton={false}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="app-shell-main min-h-screen">
            <HeaderBar
              collapsed={collapsed}
              onMobileMenuClick={() => setMobileOpen(true)}
              onAccountClick={() => openSettings('account')}
              onSettingsClick={() => openSettings('preferences')}
              onThemeClick={() => openSettings('appearance')}
              onLogout={handleLogout}
            />

            <main className="box-border w-full px-4 py-5 lg:px-7 lg:py-6">
              <Suspense key={location.pathname} fallback={<PageSkeleton />}>
                <Outlet />
              </Suspense>
            </main>
          </div>

          <SettingsModal
            isOpen={settings.open}
            initialTab={settings.tab}
            onClose={closeSettings}
          />
        </PageHeaderProvider>
      </SettingsModalProvider>
    </TooltipProvider>
  );
}