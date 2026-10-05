// apps/web/src/app/router/routes.jsx

import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '@/app/layout/AppLayout';
import { RequireAuth, RequireVerified, RequireGuest } from './guards';
import { useAuth } from '@/app/providers/AuthProvider';
import { RequireAdmin } from '@/features/admin/guards';

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
const MarketChartPage = lazy(() => import('@/features/charts/MarketChartPage'));

/* ---- Manage ---- */
const AccountsPage = lazy(() => import('@/features/manage/accounts/AccountsPage'));
const StrategiesPage = lazy(() => import('@/features/manage/strategies/StrategiesPage'));

/* ---- Personal ---- */
const DiscussionPage = lazy(() => import('@/features/personal/discussion/DiscussionPage'));
const ChatsPage = lazy(() => import('@/features/personal/chats/ChatsPage'));

/* ---- Admin ---- */
const AdminLayout = lazy(() => import('@/features/admin/layout/AdminLayout'));
const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('@/features/admin/pages/AdminUsersPage'));
const AdminUserDetailPage = lazy(() => import('@/features/admin/pages/AdminUserDetailPage'));
const AdminAccountsPage = lazy(() => import('@/features/admin/pages/AdminAccountsPage'));
const AdminTradesPage = lazy(() => import('@/features/admin/pages/AdminTradesPage'));

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (user.role === 'admin' || user.role === 'superadmin') {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/journal" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />
      <Route path="/signup" element={<RequireGuest><Signup /></RequireGuest>} />
      <Route path="/forgot-password" element={<RequireGuest><ForgotPassword /></RequireGuest>} />
      <Route path="/reset-password" element={<RequireGuest><ResetPassword /></RequireGuest>} />

      <Route path="/verify-email" element={<RequireAuth><VerifyEmail /></RequireAuth>} />

      {/* ---------------- Admin subtree ---------------- */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index            element={<AdminDashboardPage />} />
        <Route path="users"     element={<AdminUsersPage />} />
        <Route path="users/:id" element={<AdminUserDetailPage />} />
        <Route path="accounts"  element={<AdminAccountsPage />} />
        <Route path="trades"    element={<AdminTradesPage />} />
      </Route>

      {/* ---------------- User app shell ---------------- */}
      <Route element={<RequireVerified><AppLayout /></RequireVerified>}>
        <Route path="/journal" element={<DashboardPage />} />
        <Route path="/journal/analyse" element={<AnalysePage />} />
        <Route path="/journal/logs" element={<TradeLogsPage />} />
        <Route path="/journal/calendar" element={<EconomicCalendarPage />} />

        <Route path="/backtester" element={<BacktesterDashboardPage />} />
        <Route path="/backtester/logs" element={<TestLogsPage />} />
        <Route path="/backtester/simulator" element={<SimulatorPage />} />
        <Route path="/backtester/chart" element={<MarketChartPage />} />

        <Route path="/manage/accounts" element={<AccountsPage />} />
        <Route path="/manage/strategies" element={<StrategiesPage />} />

        <Route path="/personal/discussion" element={<DiscussionPage />} />
        <Route path="/personal/chats" element={<ChatsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}