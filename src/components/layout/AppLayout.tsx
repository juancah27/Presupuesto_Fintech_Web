import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { CurrencyCode, PageKey, ThemeMode } from "../../types";
import type { AuthUser } from "../../types/auth";
import { useBudgetStore } from "../../store/useBudgetStore";
import { isDebtDueSoon, isDebtOverdue, nextDueDateISO } from "../../utils/debts";
import { todayISO } from "../../utils/date";

interface AppLayoutProps extends PropsWithChildren {
  activePage: PageKey;
  collapsed: boolean;
  currency: CurrencyCode;
  theme: ThemeMode;
  user: AuthUser;
  onToggleSidebar: () => void;
  onCurrencyChange: (currency: CurrencyCode) => void;
  onThemeToggle: () => void;
  onLogout: () => void;
}

export const AppLayout = ({
  activePage,
  collapsed,
  currency,
  theme,
  user,
  onToggleSidebar,
  onCurrencyChange,
  onThemeToggle,
  onLogout,
  children,
}: AppLayoutProps) => {
  const debts = useBudgetStore((state) => state.debts);
  const debtPayments = useBudgetStore((state) => state.debtPayments);

  const dueAlerts = useMemo(() => {
    return debts
      .filter((debt) => debt.remainingBalance > 0)
      .map((debt) => {
        const overdue = isDebtOverdue(debt, debtPayments);
        const dueSoon = !overdue && isDebtDueSoon(debt, 5);
        return {
          id: debt.id,
          creditor: debt.creditor,
          dueDate: nextDueDateISO(debt.dueDayOfMonth),
          overdue,
          dueSoon,
        };
      })
      .filter((item) => item.overdue || item.dueSoon)
      .sort((a, b) => Number(b.overdue) - Number(a.overdue));
  }, [debts, debtPayments]);

  const alertStorageKey = `fintech-alert-dismissed:${user.id}:${todayISO()}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.localStorage.getItem(alertStorageKey) === "1");
  }, [alertStorageKey]);

  const closeAlert = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(alertStorageKey, "1");
    }
  };

  const overdueCount = dueAlerts.filter((item) => item.overdue).length;
  const dueSoonCount = dueAlerts.filter((item) => item.dueSoon).length;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <Sidebar
        activePage={activePage}
        collapsed={collapsed}
        user={user}
        onToggle={onToggleSidebar}
        onLogout={onLogout}
      />
      <main className="w-full overflow-y-auto p-4 lg:p-6">
        <Topbar
          activePage={activePage}
          currency={currency}
          theme={theme}
          onCurrencyChange={onCurrencyChange}
          onThemeToggle={onThemeToggle}
        />
        {dueAlerts.length > 0 && !dismissed ? (
          <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-200">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-semibold">
                  Alerta de pagos: {overdueCount} vencidos y {dueSoonCount} proximos (5 dias).
                </p>
                <p className="text-xs">
                  {dueAlerts
                    .slice(0, 3)
                    .map((item) => `${item.creditor} (${item.overdue ? "vencido" : `vence ${item.dueDate}`})`)
                    .join(" · ")}
                </p>
                <Link to="/app/debts" className="inline-block text-xs font-semibold underline">
                  Ir a Deudas y Pasivos
                </Link>
              </div>
              <button
                type="button"
                onClick={closeAlert}
                className="rounded-lg border border-amber-400/40 px-2 py-1 text-xs hover:bg-amber-100/70 dark:hover:bg-amber-800/30"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : null}
        <div className="space-y-4">{children}</div>
      </main>
    </div>
  );
};
