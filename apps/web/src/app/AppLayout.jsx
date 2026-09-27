// apps/web/src/app/AppLayout.jsx
import { useState, useEffect, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu as MenuIcon } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import Sidebar, {
  SidebarContent,
  SIDEBAR_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
} from '@/app/shell/Sidebar';
import AccountModal from '@/features/auth/components/AccountModal';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useHotkey } from '@/lib/useHotkey';

const STORAGE_KEY = 'mavrix:sidebar:collapsed';

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

  const handleLogout = async () => {
    await logout();
  };

  const mainMargin = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <TooltipProvider delayDuration={250}>
      {/* Inline media-query scoped to this component. Guarantees the
          main column shifts left by exactly the sidebar width, regardless
          of whether Tailwind generates the arbitrary classes. */}
      <style>{`
        @media (min-width: 1024px) {
          .app-shell-main {
            margin-left: ${mainMargin}px;
          }
        }
      `}</style>

      {/* Desktop sidebar */}
      <Sidebar
        collapsed={collapsed}
        onCollapseToggle={() => setCollapsed((v) => !v)}
        user={user}
        onLogout={handleLogout}
        onAccountClick={() => setIsAccountModalOpen(true)}
      />

      {/* Mobile sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[280px] max-w-[85vw] border-r border-white/[.085] bg-transparent p-0 [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent
            collapsed={false}
            showCollapseButton={false}
            user={user}
            onLogout={async () => {
              setMobileOpen(false);
              await handleLogout();
            }}
            onAccountClick={() => {
              setMobileOpen(false);
              setIsAccountModalOpen(true);
            }}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div
        className="app-shell-main min-h-screen"
        style={{ transition: 'margin-left .4s cubic-bezier(.16, 1, .3, 1)' }}
      >
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[.06] bg-[#0A0D13]/85 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[.03] text-ink-2 transition-colors hover:border-amber-500/30 hover:text-amber-500"
          >
            <MenuIcon size={16} />
          </button>
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink-1">
            Mavrix Journal
          </span>
        </div>

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