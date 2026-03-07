import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Card } from "./components/ui/Card";
import { Skeleton } from "./components/ui/Skeleton";
import { AccountsPage } from "./pages/AccountsPage";
import { BudgetPage } from "./pages/BudgetPage";
import { CategoriesSourcesPage } from "./pages/CategoriesSourcesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DebtsPage } from "./pages/DebtsPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { GoalsPage } from "./pages/GoalsPage";
import { InvestmentsPage } from "./pages/InvestmentsPage";
import { LoginPage } from "./pages/LoginPage";
import { LoansPage } from "./pages/LoansPage";
import { NetWorthPage } from "./pages/NetWorthPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { ReportsPage } from "./pages/ReportsPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { useAuthStore } from "./store/useAuthStore";
import { useBudgetStore } from "./store/useBudgetStore";
import { PAGE_ITEMS } from "./utils/constants";

const LoadingView = () => (
  <div className="min-h-screen bg-slate-950 p-6">
    <div className="mx-auto max-w-7xl space-y-4">
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  </div>
);

const resolveProtectedPath = (onboardingCompleted: boolean) =>
  onboardingCompleted ? "/app/dashboard" : "/onboarding";

const useSessionBoot = () => {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.currentUser);
  const hydrateAuth = useAuthStore((state) => state.hydrateAuth);
  const hydrateForUser = useBudgetStore((state) => state.hydrateForUser);
  const clearUserContext = useBudgetStore((state) => state.clearUserContext);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated && currentUser) {
      hydrateForUser(currentUser.id, currentUser.currency);
      return;
    }
    clearUserContext();
  }, [
    isHydrated,
    isAuthenticated,
    currentUser?.id,
    currentUser?.currency,
    hydrateForUser,
    clearUserContext,
  ]);
};

const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.currentUser);

  if (!isHydrated) return <LoadingView />;
  if (isAuthenticated && currentUser) {
    return <Navigate to={resolveProtectedPath(currentUser.onboardingCompleted)} replace />;
  }
  return children;
};

const ProtectedOnboardingRoute = () => {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.currentUser);

  if (!isHydrated) return <LoadingView />;
  if (!isAuthenticated || !currentUser) return <Navigate to="/login" replace />;
  if (currentUser.onboardingCompleted) return <Navigate to="/app/dashboard" replace />;
  return <OnboardingPage />;
};

const ProtectedAppShell = () => {
  const location = useLocation();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const budgetLoading = useBudgetStore((state) => state.isLoading);
  const activePage = useBudgetStore((state) => state.activePage);
  const collapsed = useBudgetStore((state) => state.sidebarCollapsed);
  const currency = useBudgetStore((state) => state.currency);
  const theme = useBudgetStore((state) => state.theme);
  const setTheme = useBudgetStore((state) => state.setTheme);
  const setCurrency = useBudgetStore((state) => state.setCurrency);
  const setActivePage = useBudgetStore((state) => state.setActivePage);
  const toggleSidebar = useBudgetStore((state) => state.toggleSidebar);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const matched = PAGE_ITEMS.find((item) =>
      location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
    );
    if (matched && matched.key !== activePage) {
      setActivePage(matched.key);
    }
  }, [location.pathname, activePage, setActivePage]);

  if (!isHydrated || budgetLoading) return <LoadingView />;
  if (!isAuthenticated || !currentUser) return <Navigate to="/login" replace />;
  if (!currentUser.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  return (
    <AppLayout
      activePage={activePage}
      collapsed={collapsed}
      currency={currency}
      theme={theme}
      user={currentUser}
      onToggleSidebar={toggleSidebar}
      onCurrencyChange={setCurrency}
      onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
      onLogout={logout}
    >
      <Outlet />
    </AppLayout>
  );
};

const HomeRedirect = () => {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.currentUser);
  if (!isHydrated) return <LoadingView />;
  if (!isAuthenticated || !currentUser) return <Navigate to="/login" replace />;
  return <Navigate to={resolveProtectedPath(currentUser.onboardingCompleted)} replace />;
};

const NotFound = () => (
  <div className="min-h-screen bg-slate-950 p-6">
    <div className="mx-auto max-w-xl">
      <Card title="Pagina no encontrada">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          La ruta no existe. Usa el menu lateral para volver al dashboard.
        </p>
      </Card>
    </div>
  </div>
);

export default function App() {
  useSessionBoot();

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route path="/onboarding" element={<ProtectedOnboardingRoute />} />

      <Route path="/app" element={<ProtectedAppShell />}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="loans" element={<LoansPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="budget" element={<BudgetPage />} />
        <Route path="categories" element={<CategoriesSourcesPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="investments" element={<InvestmentsPage />} />
        <Route path="debts" element={<DebtsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="networth" element={<NetWorthPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
