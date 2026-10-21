import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '@/app/layout/AppLayout';
import { RequireAuth, RequireVerified, RequireGuest } from './guards';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import { RequireAdmin, RequireSuperadmin } from '@/features/admin/guards';
import { BootLoader } from '@/shared/ui/boot-loader';

const LandingPage = lazy(() => import('@/features/landing/LandingPage'));

const Login = lazy(() => import('@/features/auth/pages/LoginPage'));
const Signup = lazy(() => import('@/features/auth/pages/SignupPage'));
const VerifyEmail = lazy(() => import('@/features/auth/pages/VerifyEmailPage'));
const SetUsername = lazy(() => import('@/features/auth/pages/SetUsernamePage'));
const ForgotPassword = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPassword = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));

const DashboardPage = lazy(() => import('@/features/journal/dashboard/DashboardPage'));
const AnalysePage = lazy(() => import('@/features/journal/analyse/AnalysePage'));
const TradeLogsPage = lazy(() => import('@/features/journal/trade-logs/TradeLogsPage'));
const EconomicCalendarPage = lazy(() =>
  import('@/features/journal/economic-calendar/EconomicCalendarPage')
);

const BacktesterDashboardPage = lazy(() =>
  import('@/features/backtester/dashboard/BacktesterDashboardPage')
);
const TestLogsPage = lazy(() => import('@/features/backtester/test-logs/TestLogsPage'));
const SimulatorPage = lazy(() => import('@/features/backtester/simulator/SimulatorPage'));
const MarketChartPage = lazy(() => import('@/features/charts/MarketChartPage'));

const AccountsPage = lazy(() => import('@/features/manage/accounts/AccountsPage'));
const StrategiesPage = lazy(() => import('@/features/manage/strategies/StrategiesPage'));
const StrategyDetailPage = lazy(() => import('@/features/manage/strategies/StrategyDetailPage'));

const GexPage = lazy(() => import('@/features/utilities/gex/GexPage'));

const ChatsPage = lazy(() => import('@/features/personal/chats/ChatsPage'));

const AdminLayout = lazy(() => import('@/features/admin/layout/AdminLayout'));
const AdminDashboardPage    = lazy(() => import('@/features/admin/pages/AdminDashboardPage'));
const AdminUsersPage        = lazy(() => import('@/features/admin/pages/AdminUsersPage'));
const AdminUserDetailPage   = lazy(() => import('@/features/admin/pages/AdminUserDetailPage'));
const AdminAccountsPage     = lazy(() => import('@/features/admin/pages/AdminAccountsPage'));
const AdminTradesPage       = lazy(() => import('@/features/admin/pages/AdminTradesPage'));
const AdminStrategiesPage   = lazy(() => import('@/features/admin/pages/AdminStrategiesPage'));
const AdminGroupsPage       = lazy(() => import('@/features/admin/pages/AdminGroupsPage'));
const AdminAuditPage        = lazy(() => import('@/features/admin/pages/AdminAuditPage'));
const AdminSessionsPage     = lazy(() => import('@/features/admin/pages/AdminSessionsPage'));
const AdminSystemPage       = lazy(() => import('@/features/admin/pages/AdminSystemPage'));
const AdminCalendarPage     = lazy(() => import('@/features/admin/pages/AdminCalendarPage'));
const AdminSettingsPage     = lazy(() => import('@/features/admin/pages/AdminSettingsPage'));
const AdminBroadcastPage    = lazy(() => import('@/features/admin/pages/AdminBroadcastPage'));
const AdminGexPage          = lazy(() => import('@/features/admin/pages/AdminGexPage'));
const AdminHealthCheckPage  = lazy(() => import('@/features/admin/pages/AdminHealthCheckPage'));
const AdminBugReportsPage   = lazy(() => import('@/features/admin/pages/AdminBugReportsPage'));

const LAST_PATH_KEY = 'mavrix:lastPath';

function HomeRoute() {
  const { user, loading } = useAuth();
  const { settings } = useSettings();

  if (loading) return <BootLoader label="Loading" />;

  if (!user) {
    return (
      <Suspense fallback={<BootLoader label="Loading" />}>
        <LandingPage />
      </Suspense>
    );
  }

  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (!user.username) return <Navigate to="/set-username" replace />;

  if (user.role === 'admin' || user.role === 'superadmin') {
    return <Navigate to="/admin" replace />;
  }

  const landing = settings.preferences.defaultLanding;

  if (landing === 'backtester') return <Navigate to="/backtester" replace />;

  if (landing === 'last') {
    let last = null;
    try {
      last = localStorage.getItem(LAST_PATH_KEY);
    } catch {
    }
    if (last && last.startsWith('/') && last !== '/') {
      return <Navigate to={last} replace />;
    }
  }

  return <Navigate to="/journal" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />

      <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />
      <Route path="/signup" element={<RequireGuest><Signup /></RequireGuest>} />
      <Route path="/forgot-password" element={<RequireGuest><ForgotPassword /></RequireGuest>} />
      <Route path="/reset-password" element={<RequireGuest><ResetPassword /></RequireGuest>} />

      <Route path="/verify-email" element={<RequireAuth><VerifyEmail /></RequireAuth>} />
      <Route path="/set-username" element={<RequireAuth><SetUsername /></RequireAuth>} />

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
        <Route path="strategies" element={<AdminStrategiesPage />} />
        <Route path="groups"    element={<AdminGroupsPage />} />
        <Route path="audit"     element={<AdminAuditPage />} />
        <Route path="bug-reports" element={<AdminBugReportsPage />} />
        <Route path="sessions"  element={<AdminSessionsPage />} />
        <Route path="system"    element={<AdminSystemPage />} />
        <Route path="calendar"  element={<AdminCalendarPage />} />
        <Route path="gex"       element={<AdminGexPage />} />
        <Route path="settings"  element={<AdminSettingsPage />} />
        <Route path="broadcast" element={<AdminBroadcastPage />} />
        <Route
          path="health-check"
          element={<RequireSuperadmin><AdminHealthCheckPage /></RequireSuperadmin>}
        />
      </Route>

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
        <Route path="/manage/strategies/:id" element={<StrategyDetailPage />} />

        <Route path="/utilities/gex" element={<GexPage />} />

        <Route path="/personal/chats" element={<ChatsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}