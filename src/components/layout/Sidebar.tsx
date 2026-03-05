import clsx from "clsx";
import { NavLink } from "react-router-dom";
import type { PageKey } from "../../types";
import type { AuthUser } from "../../types/auth";
import { useBudgetStore } from "../../store/useBudgetStore";
import { PAGE_ITEMS } from "../../utils/constants";
import { isDebtDueSoon, isDebtOverdue } from "../../utils/debts";

interface SidebarProps {
  activePage: PageKey;
  collapsed: boolean;
  user: AuthUser;
  onToggle: () => void;
  onLogout: () => void;
}

const initialsFromName = (name: string): string => {
  const chunks = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (chunks.length === 0) return "US";
  return chunks.map((chunk) => chunk[0]?.toUpperCase() ?? "").join("");
};

export const Sidebar = ({ activePage, collapsed, user, onToggle, onLogout }: SidebarProps) => {
  const debts = useBudgetStore((state) => state.debts);
  const debtPayments = useBudgetStore((state) => state.debtPayments);
  const debtAlerts = debts.filter((debt) => isDebtDueSoon(debt, 5) || isDebtOverdue(debt, debtPayments)).length;

  return (
    <aside
      className={clsx(
        "sticky top-0 flex h-screen flex-col border-r border-white/10 bg-slate-900/80 p-3 backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-20" : "w-72",
      )}
    >
    <div className="mb-4 flex items-center justify-between">
      {!collapsed ? (
        <div>
          <p className="text-xs uppercase tracking-wider text-cyan-200/70">Fintech Suite</p>
          <h1 className="text-lg font-bold text-white">Presupuesto Personal</h1>
        </div>
      ) : null}
      <button
        className="rounded-lg border border-white/20 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
        onClick={onToggle}
        type="button"
      >
        {collapsed ? ">>" : "<<"}
      </button>
    </div>

    <nav className="space-y-1 overflow-y-auto">
      {PAGE_ITEMS.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          className={({ isActive }) =>
            clsx(
              "block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors",
              isActive || activePage === item.key
                ? "bg-white/20 text-white"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            )
          }
        >
          <span className="inline-flex items-center gap-2">
            <span className="relative inline-flex h-5 w-5 items-center justify-center text-sm">
              {item.icon}
              {item.key === "debts" && debtAlerts > 0 ? (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
              ) : null}
            </span>
            {!collapsed ? item.label : null}
          </span>
        </NavLink>
      ))}
    </nav>

    <div className="mt-auto rounded-2xl border border-white/10 bg-slate-950/60 p-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-200">
          {initialsFromName(user.fullName)}
        </span>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100">{user.fullName}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="mt-3 w-full rounded-lg border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/15"
      >
        {collapsed ? "OUT" : "Cerrar sesion"}
      </button>
    </div>
    </aside>
  );
};
