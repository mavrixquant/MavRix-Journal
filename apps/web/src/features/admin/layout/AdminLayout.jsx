import { useState, Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/shared/ui/sheet';

import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AdminErrorBoundary from '../AdminErrorBoundary';
import './AdminLayout.css';

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    console.info('[AdminLayout] mounted. path:', location.pathname);
  }, [location.pathname]);

  return (
    <div
      style={{
        display: 'block',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: '#07090D',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <TooltipProvider delayDuration={250}>
        <AdminErrorBoundary>
          <div
            className={`admin-shell${mobileOpen ? ' is-mobile-open' : ''}`}
            style={{ display: 'flex', height: '100%', width: '100%' }}
          >
            <AdminSidebar />

            {/* Only mount the Sheet component if it's actually needed.
                Radix portals can sometimes cause invisible overlays if mismounted. */}
            {mobileOpen && (
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent
                  side="left"
                  className="w-[280px] max-w-[85vw] border-r border-white/[.085] bg-transparent p-0 [&>button]:hidden"
                >
                  <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                  <AdminSidebar onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>
            )}

            <div
              className="admin-main"
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minWidth: 0,
                height: '100%',
              }}
            >
              <AdminHeader
                user={user}
                onMobileMenuClick={() => setMobileOpen(true)}
              />
              <main
                className="admin-body"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 24,
                }}
              >
                <Suspense key={location.pathname} fallback={<PageSkeleton />}>
                  <Outlet />
                </Suspense>
              </main>
            </div>
          </div>
        </AdminErrorBoundary>
      </TooltipProvider>
    </div>
  );
}