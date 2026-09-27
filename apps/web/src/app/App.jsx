// apps/web/src/app/App.jsx
import { lazy, Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import AppLayout from '@/app/AppLayout';
import { PageSkeleton } from '@/components/ui/page-skeleton';

/* ---- Lazy pages ---- */
const Landing = lazy(() => import('@/features/landing/LandingPage'));
const Login = lazy(() => import('@/features/auth/components/LoginPage'));
const Signup = lazy(() => import('@/features/auth/components/SignupPage'));
const EmailVerification = lazy(() =>
  import('@/features/auth/components/EmailVerificationPage')
);
const ForgotPassword = lazy(() =>
  import('@/features/auth/components/ForgotPasswordPage')
);
const ResetPassword = lazy(() =>
  import('@/features/auth/components/ResetPasswordPage')
);

/* ---- Lazy dashboard children (rendered via AppLayout <Outlet />) ---- */
const DashboardMain = lazy(() =>
  import('@/features/dashboard/components/DashboardMain')
);
const JournalMain = lazy(() =>
  import('@/features/journal/components/JournalMain')
);
const AccountsMain = lazy(() =>
  import('@/features/accounts/components/AccountsMain')
);
const SimulatorPage = lazy(() =>
  import('@/features/simulator/components/SimulatorPage')
);

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  const isVerified = user?.emailVerified;
  const authedHome = isVerified ? '/dashboard' : '/verify-email';

  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route
            path="/login"
            element={user ? <Navigate to={authedHome} replace /> : <Login />}
          />
          <Route
            path="/signup"
            element={user ? <Navigate to={authedHome} replace /> : <Signup />}
          />
          <Route
            path="/forgot-password"
            element={user ? <Navigate to={authedHome} replace /> : <ForgotPassword />}
          />
          <Route
            path="/reset-password"
            element={user ? <Navigate to={authedHome} replace /> : <ResetPassword />}
          />

          <Route
            path="/verify-email"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : isVerified ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <EmailVerification />
              )
            }
          />

          {/* Dashboard shell with nested routes */}
          <Route
            path="/dashboard"
            element={
              user ? (
                isVerified ? (
                  <AppLayout />
                ) : (
                  <Navigate to="/verify-email" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            <Route index element={<DashboardMain />} />
            <Route path="journal" element={<JournalMain />} />
            <Route path="accounts" element={<AccountsMain />} />
            <Route path="simulator" element={<SimulatorPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;