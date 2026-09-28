// apps/web/src/app/AppLayout.jsx
import { useState, useEffect, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import Sidebar, {
  SidebarContent,
  SIDEBAR_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
} from '@/app/shell/Sidebar';
import HeaderBar from '@/app/shell/HeaderBar';
import AccountModal from '@/features/auth/components/AccountModal';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/shared/ui/sheet';
import { useHotkey } from '@/shared/hooks/useHotkey';
import { useSSEBridge } from '@/shared/api/sse';

const STORAGE_KEY = 'mavrix:sidebar:collapsed';

/* ------------------------------------------------------------------ */
/*  Single shared amber strip that spans the full viewport top.        */
/*  Above sidebar (z-40) and header (z-30) via z-index: 100.           */
/* ------------------------------------------------------------------ */
const STRIP_CSS = `
  .app-top-strip {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    z-index: 100;
    pointer-events: none;
    background: linear-gradient(
      90deg,
      transparent,
      #F59E0B,
      #FDE68A,
      #F59E0B,
      transparent
    );
    background-size: 200% 100%;
    animation: appTopStripGrad 4s linear infinite;
  }
  @keyframes appTopStripGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .app-top-strip { animation: none !important; }
  }
`;

export default function AppLayout() {
  const { user, logout } = useAuth();

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

  useSSEBridge({ enabled: !!user });

  const handleLogout = async () => {
    await logout();
  };

  const mainMargin = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <TooltipProvider delayDuration={250}>
      <style>{STRIP_CSS}</style>
      <style>{`
        @media (min-width: 1024px) {
          .app-shell-main {
            margin-left: ${mainMargin}px;
          }
        }
      `}</style>

      {/* Single continuous amber strip across the whole viewport top */}
      <div className="app-top-strip" aria-hidden />

      {/* ---- Desktop sidebar ---- */}
      <Sidebar
        collapsed={collapsed}
        onCollapseToggle={() => setCollapsed((v) => !v)}
      />

      {/* ---- Mobile drawer ---- */}
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

      {/* ---- Main column: HeaderBar (sticky) → page content ---- */}
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
          <Suspense fallback={<PageSkeleton />}>
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