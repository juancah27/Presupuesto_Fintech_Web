import type { CurrencyCode, ThemeMode } from "../../types";

interface TopbarProps {
  currency: CurrencyCode;
  theme: ThemeMode;
  onCurrencyChange: (value: CurrencyCode) => void;
  onThemeToggle: () => void;
  onLogout: () => void;
}

export const Topbar = ({ currency, theme, onCurrencyChange, onThemeToggle, onLogout }: TopbarProps) => (
  <header className="sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/65">
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Administrador</p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Panel financiero integral</h2>
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
      <button
        type="button"
        onClick={onLogout}
        className="rounded-lg border border-red-300 px-3 py-2 text-sm text-expense hover:bg-red-50 dark:border-red-400/50 dark:hover:bg-red-950/40"
      >
        Cerrar sesion
      </button>
    </div>
  </header>
);
