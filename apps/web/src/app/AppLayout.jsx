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
import { useSSEBridge } from '@/lib/sse';

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

  // Open one SSE stream for the whole authenticated session.
  // Every mutation the user makes (from this tab or any other) will
  // trigger cache invalidations here.
  const { connected: sseConnected, fallbackMode: sseFallback } = useSSEBridge({
    enabled: !!user,
  });

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

      <Sidebar
        collapsed={collapsed}
        onCollapseToggle={() => setCollapsed((v) => !v)}
        user={user}
        onLogout={handleLogout}
        onAccountClick={() => setIsAccountModalOpen(true)}
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
          <SSEIndicator connected={sseConnected} fallback={sseFallback} />
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

/* ------------------------------------------------------------------ */
/*  Small connection status pill (mobile only — desktop has no place)  */
/* ------------------------------------------------------------------ */
function SSEIndicator({ connected, fallback }) {
  const color = fallback ? '#f97316' : connected ? '#22c55e' : '#545E6E';
  const label = fallback
    ? 'Polling'
    : connected
      ? 'Live'
      : 'Connecting';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        marginLeft: 'auto',
        padding: '3px 9px',
        borderRadius: 999,
        border: `1px solid ${color}44`,
        background: `${color}15`,
        color,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
      title={
        fallback
          ? 'Real-time updates unavailable — using periodic polling'
          : connected
            ? 'Real-time connection active'
            : 'Connecting to real-time updates…'
      }
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
      {label}
    </span>
  );
}