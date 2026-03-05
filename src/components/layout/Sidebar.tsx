import clsx from "clsx";
import { PAGE_ITEMS } from "../../utils/constants";
import type { PageKey } from "../../types";

interface SidebarProps {
  activePage: PageKey;
  collapsed: boolean;
  onNavigate: (page: PageKey) => void;
  onToggle: () => void;
}

export const Sidebar = ({ activePage, collapsed, onNavigate, onToggle }: SidebarProps) => (
  <aside
    className={clsx(
      "flex h-screen flex-col border-r border-white/10 bg-slate-900/70 p-3 backdrop-blur-xl transition-all duration-300",
      collapsed ? "w-20" : "w-72",
    )}
  >
    <div className="mb-4 flex items-center justify-between">
      {!collapsed && (
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Fintech Suite</p>
          <h1 className="text-lg font-bold text-white">Presupuesto Personal</h1>
        </div>
      )}
      <button
        className="rounded-lg border border-white/20 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
        onClick={onToggle}
        type="button"
      >
        {collapsed ? ">>" : "<<"}
      </button>
    </div>

    <nav className="space-y-1 overflow-auto">
      {PAGE_ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onNavigate(item.key)}
          className={clsx(
            "w-full rounded-xl px-3 py-2 text-left text-sm transition-colors",
            activePage === item.key
              ? "bg-white/20 text-white"
              : "text-slate-300 hover:bg-white/10 hover:text-white",
          )}
        >
          {collapsed ? item.label.slice(0, 2) : item.label}
        </button>
      ))}
    </nav>
  </aside>
);
