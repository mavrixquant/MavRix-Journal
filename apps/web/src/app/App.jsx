import { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { AppRoutes } from './router/routes';
import { MaintenanceGate } from './router/MaintenanceGate';
import { PageSkeleton } from '@/shared/ui/page-skeleton';

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <MaintenanceGate>
          <AppRoutes />
        </MaintenanceGate>
      </Suspense>
    </BrowserRouter>
  );
}