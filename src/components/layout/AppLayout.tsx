import { PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { CurrencyCode, PageKey, ThemeMode } from "../../types";

interface AppLayoutProps extends PropsWithChildren {
  activePage: PageKey;
  collapsed: boolean;
  currency: CurrencyCode;
  theme: ThemeMode;
  onNavigate: (page: PageKey) => void;
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
  onNavigate,
  onToggleSidebar,
  onCurrencyChange,
  onThemeToggle,
  onLogout,
  children,
}: AppLayoutProps) => (
  <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
    <Sidebar activePage={activePage} collapsed={collapsed} onNavigate={onNavigate} onToggle={onToggleSidebar} />
    <main className="w-full overflow-y-auto p-4 lg:p-6">
      <Topbar
        currency={currency}
        theme={theme}
        onCurrencyChange={onCurrencyChange}
        onThemeToggle={onThemeToggle}
        onLogout={onLogout}
      />
      <div className="space-y-4">{children}</div>
    </main>
  </div>
);
