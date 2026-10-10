// apps/web/src/app/layout/AppLayout.jsx
import { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import Sidebar, {
  SidebarContent,
  SIDEBAR_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
} from './Sidebar/Sidebar';
import HeaderBar from './HeaderBar/HeaderBar';
import TopStrip from './TopStrip';
import AccountModal from '@/features/auth/components/AccountModal';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/shared/ui/sheet';
import { useHotkey } from '@/shared/hooks/useHotkey';
import { useSSEBridge } from '@/shared/api/sse';

const STORAGE_KEY = 'mavrix:sidebar:collapsed';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === '1';
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useHotkey('mod+b', () => setCollapsed((v) => !v));

  // Single SSE connection per app. currentUserId is used by the chat bridge
  // to decide whether an inbound chat:message:new needs a delivery ack.
  useSSEBridge({ enabled: !!user, currentUserId: user?.id });

  const handleLogout = async () => {
    await logout();
  };

  const mainMargin = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <TooltipProvider delayDuration={250}>
      <style>{`
        @media (min-width: 1024px) {
          .app-shell-main {
            margin-left: ${mainMargin}px;
          }
        }
      `}</style>

      <TopStrip />

      <Sidebar
        collapsed={collapsed}
        onCollapseToggle={() => setCollapsed((v) => !v)}
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

      <div
        className="app-shell-main min-h-screen"
        style={{ transition: 'margin-left .4s cubic-bezier(.16, 1, .3, 1)' }}
      >
        <HeaderBar
          collapsed={collapsed}
          onMobileMenuClick={() => setMobileOpen(true)}
          onAccountClick={() => setIsAccountModalOpen(true)}
          onLogout={handleLogout}
        />

        <main className="box-border w-full px-4 py-5 lg:px-7 lg:py-6">
          <Suspense key={location.pathname} fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </TooltipProvider>
  );
}