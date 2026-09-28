// apps/web/src/app/App.jsx
import { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { AppRoutes } from './router/routes';
import { PageSkeleton } from '@/shared/ui/page-skeleton';

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  );
}