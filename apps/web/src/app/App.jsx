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
import { PageSkeleton } from '@/shared/ui/page-skeleton';

/* ---- Auth pages ---- */
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

/* ---- Journal ---- */
const DashboardMain = lazy(() =>
  import('@/features/journal/dashboard/DashboardPage')
);
const Analyse = lazy(() =>
  import('@/features/journal/analyse/AnalysePage')
);
const JournalMain = lazy(() =>
  import('@/features/journal/trade-logs/TradeLogsPage')
);
const EconomicCalendar = lazy(() =>
  import('@/features/journal/economic-calendar/EconomicCalendarPage')
);

/* ---- Backtester ---- */
const BacktesterDashboard = lazy(() =>
  import('@/features/backtester/dashboard/BacktesterDashboardPage')
);
const TestLogs = lazy(() =>
  import('@/features/backtester/test-logs/TestLogsPage')
);
const SimulatorPage = lazy(() =>
  import('@/features/backtester/simulator/components/SimulatorPage')
);
const BacktesterChart = lazy(() =>
  import('@/features/backtester/chart/BacktesterChartPage')
);

/* ---- Manage ---- */
const AccountsMain = lazy(() =>
  import('@/features/accounts/components/AccountsMain')
);
const Strategies = lazy(() =>
  import('@/features/strategies/components/Strategies')
);

/* ---- Personal Space ---- */
const Discussion = lazy(() =>
  import('@/features/personal/components/Discussion')
);
const Chats = lazy(() =>
  import('@/features/personal/components/Chats')
);

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  const isVerified = user?.emailVerified;
  const authedHome = isVerified ? '/journal' : '/verify-email';

  /* Guard used by every protected subtree */
  const protect = (element) => {
    if (!user) return <Navigate to="/login" replace />;
    if (!isVerified) return <Navigate to="/verify-email" replace />;
    return element;
  };

  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* Root → redirect based on auth state */}
          <Route
            path="/"
            element={<Navigate to={user ? authedHome : '/login'} replace />}
          />

          {/* Auth routes (unauthenticated only) */}
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
            element={
              user ? <Navigate to={authedHome} replace /> : <ForgotPassword />
            }
          />
          <Route
            path="/reset-password"
            element={
              user ? <Navigate to={authedHome} replace /> : <ResetPassword />
            }
          />
          <Route
            path="/verify-email"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : isVerified ? (
                <Navigate to="/journal" replace />
              ) : (
                <EmailVerification />
              )
            }
          />

          {/* Protected app shell — AppLayout renders <Outlet /> */}
          <Route element={protect(<AppLayout />)}>
            {/* ---- Journal ---- */}
            <Route path="/journal" element={<DashboardMain />} />
            <Route path="/journal/analyse" element={<Analyse />} />
            <Route path="/journal/logs" element={<JournalMain />} />
            <Route path="/journal/calendar" element={<EconomicCalendar />} />

            {/* ---- Backtester ---- */}
            <Route path="/backtester" element={<BacktesterDashboard />} />
            <Route path="/backtester/logs" element={<TestLogs />} />
            <Route path="/backtester/simulator" element={<SimulatorPage />} />
            <Route path="/backtester/chart" element={<BacktesterChart />} />

            {/* ---- Manage ---- */}
            <Route path="/manage/accounts" element={<AccountsMain />} />
            <Route path="/manage/strategies" element={<Strategies />} />

            {/* ---- Personal Space ---- */}
            <Route path="/personal/discussion" element={<Discussion />} />
            <Route path="/personal/chats" element={<Chats />} />
          </Route>

          {/* Catch-all — anything unknown lands on root, which re-routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;