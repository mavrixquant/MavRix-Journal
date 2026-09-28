// apps/web/src/app/router/routes.jsx
//
// The full route tree. Uses React.lazy for every page so each route is
// code-split. Guards wrap the protected subtrees.

import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '@/app/layout/AppLayout';
import { RequireAuth, RequireVerified, RequireGuest } from './guards';
import { useAuth } from '@/app/providers/AuthProvider';

/* ---- Auth pages ---- */
const Login = lazy(() => import('@/features/auth/pages/LoginPage'));
const Signup = lazy(() => import('@/features/auth/pages/SignupPage'));
const VerifyEmail = lazy(() => import('@/features/auth/pages/VerifyEmailPage'));
const ForgotPassword = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPassword = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));

/* ---- Journal ---- */
const DashboardPage = lazy(() => import('@/features/journal/dashboard/DashboardPage'));
const AnalysePage = lazy(() => import('@/features/journal/analyse/AnalysePage'));
const TradeLogsPage = lazy(() => import('@/features/journal/trade-logs/TradeLogsPage'));
const EconomicCalendarPage = lazy(() =>
  import('@/features/journal/economic-calendar/EconomicCalendarPage')
);

/* ---- Backtester ---- */
const BacktesterDashboardPage = lazy(() =>
  import('@/features/backtester/dashboard/BacktesterDashboardPage')
);
const TestLogsPage = lazy(() => import('@/features/backtester/test-logs/TestLogsPage'));
const SimulatorPage = lazy(() => import('@/features/backtester/simulator/SimulatorPage'));
const BacktesterChartPage = lazy(() =>
  import('@/features/backtester/chart/BacktesterChartPage')
);

/* ---- Manage ---- */
const AccountsPage = lazy(() => import('@/features/manage/accounts/AccountsPage'));
const StrategiesPage = lazy(() => import('@/features/manage/strategies/StrategiesPage'));

/* ---- Personal ---- */
const DiscussionPage = lazy(() => import('@/features/personal/discussion/DiscussionPage'));
const ChatsPage = lazy(() => import('@/features/personal/chats/ChatsPage'));

/**
 * RootRedirect — sends visitors to the right place based on auth state.
 *   logged-in + verified   → /journal
 *   logged-in + unverified → /verify-email
 *   not logged in          → /login
 */
function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.emailVerified ? '/journal' : '/verify-email'} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Root → redirect based on auth state */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth routes — only reachable when logged out */}
      <Route
        path="/login"
        element={
          <RequireGuest>
            <Login />
          </RequireGuest>
        }
      />
      <Route
        path="/signup"
        element={
          <RequireGuest>
            <Signup />
          </RequireGuest>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <RequireGuest>
            <ForgotPassword />
          </RequireGuest>
        }
      />
      <Route
        path="/reset-password"
        element={
          <RequireGuest>
            <ResetPassword />
          </RequireGuest>
        }
      />

      {/* Verify email — requires login, but NOT verification */}
      <Route
        path="/verify-email"
        element={
          <RequireAuth>
            <VerifyEmail />
          </RequireAuth>
        }
      />

      {/* Protected app shell — AppLayout renders <Outlet /> */}
      <Route
        element={
          <RequireVerified>
            <AppLayout />
          </RequireVerified>
        }
      >
        {/* ---- Journal ---- */}
        <Route path="/journal" element={<DashboardPage />} />
        <Route path="/journal/analyse" element={<AnalysePage />} />
        <Route path="/journal/logs" element={<TradeLogsPage />} />
        <Route path="/journal/calendar" element={<EconomicCalendarPage />} />

        {/* ---- Backtester ---- */}
        <Route path="/backtester" element={<BacktesterDashboardPage />} />
        <Route path="/backtester/logs" element={<TestLogsPage />} />
        <Route path="/backtester/simulator" element={<SimulatorPage />} />
        <Route path="/backtester/chart" element={<BacktesterChartPage />} />

        {/* ---- Manage ---- */}
        <Route path="/manage/accounts" element={<AccountsPage />} />
        <Route path="/manage/strategies" element={<StrategiesPage />} />

        {/* ---- Personal ---- */}
        <Route path="/personal/discussion" element={<DiscussionPage />} />
        <Route path="/personal/chats" element={<ChatsPage />} />
      </Route>

      {/* Catch-all → home, which reroutes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}