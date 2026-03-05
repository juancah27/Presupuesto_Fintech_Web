import type { CurrencyCode, PageKey, ThemeMode } from "../../types";
import { PAGE_ITEMS } from "../../utils/constants";

interface TopbarProps {
  activePage: PageKey;
  currency: CurrencyCode;
  theme: ThemeMode;
  onCurrencyChange: (value: CurrencyCode) => void;
  onThemeToggle: () => void;
}

export const Topbar = ({ activePage, currency, theme, onCurrencyChange, onThemeToggle }: TopbarProps) => {
  const pageTitle = PAGE_ITEMS.find((item) => item.key === activePage)?.label ?? "Dashboard";
  return (
    <header className="sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/65">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Administrador</p>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{pageTitle}</h2>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={currency}
          onChange={(event) => onCurrencyChange(event.target.value as CurrencyCode)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="MXN">MXN</option>
          <option value="COP">COP</option>
          <option value="PEN">PEN</option>
          <option value="ARS">ARS</option>
        </select>
        <button
          type="button"
          onClick={onThemeToggle}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-white/20 dark:text-slate-100 dark:hover:bg-white/10"
        >
          {theme === "dark" ? "Modo claro" : "Modo oscuro"}
        </button>
      </div>
    </header>
  );
};
