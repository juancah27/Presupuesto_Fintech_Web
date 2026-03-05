import { useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { Card } from "./components/ui/Card";
import { Skeleton } from "./components/ui/Skeleton";
import { useBudgetStore } from "./store/useBudgetStore";
import { BudgetPage } from "./pages/BudgetPage";
import { CategoriesSourcesPage } from "./pages/CategoriesSourcesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DebtsPage } from "./pages/DebtsPage";
import { GoalsPage } from "./pages/GoalsPage";
import { InvestmentsPage } from "./pages/InvestmentsPage";
import { NetWorthPage } from "./pages/NetWorthPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TransactionsPage } from "./pages/TransactionsPage";

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

export default function App() {
  const store = useBudgetStore();
  const {
    activePage,
    theme,
    currency,
    sidebarCollapsed,
    isLoading,
    setTheme,
    setCurrency,
    setActivePage,
    toggleSidebar,
  } = store;

  useEffect(() => {
    useBudgetStore.getState().hydrate();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("dark", theme === "dark");
  }, [theme]);

  if (isLoading) return <LoadingView />;

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardPage />;
      case "transactions":
        return <TransactionsPage />;
      case "budget":
        return <BudgetPage />;
      case "categories":
        return <CategoriesSourcesPage />;
      case "goals":
        return <GoalsPage />;
      case "investments":
        return <InvestmentsPage />;
      case "debts":
        return <DebtsPage />;
      case "reports":
        return <ReportsPage />;
      case "networth":
        return <NetWorthPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return (
          <Card title="Pagina no encontrada">
            <p>Selecciona una opcion del menu lateral.</p>
          </Card>
        );
    }
  };

  return (
    <AppLayout
      activePage={activePage}
      collapsed={sidebarCollapsed}
      currency={currency}
      theme={theme}
      onNavigate={setActivePage}
      onToggleSidebar={toggleSidebar}
      onCurrencyChange={setCurrency}
      onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {renderPage()}
    </AppLayout>
  );
}
