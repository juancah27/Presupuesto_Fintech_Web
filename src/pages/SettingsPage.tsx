import { useState } from "react";
import { Card } from "../components/ui/Card";
import { useBudgetStore } from "../store/useBudgetStore";
import { downloadTextFile } from "../utils/csv";
import { exportBackupJson } from "../utils/storage";
import type { AppDataState } from "../types";

export const SettingsPage = () => {
  const [importText, setImportText] = useState("");
  const store = useBudgetStore();
  const { resetWithSeed, importBackup } = store;
  const state: AppDataState = {
    version: store.version,
    theme: store.theme,
    currency: store.currency,
    activePage: store.activePage,
    sidebarCollapsed: store.sidebarCollapsed,
    categories: store.categories,
    subcategories: store.subcategories,
    sources: store.sources,
    transactions: store.transactions,
    budgets: store.budgets,
    goals: store.goals,
    goalContributions: store.goalContributions,
    investments: store.investments,
    investmentSnapshots: store.investmentSnapshots,
    debts: store.debts,
    assets: store.assets,
    liabilities: store.liabilities,
    netWorthHistory: store.netWorthHistory,
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card title="Backup JSON">
        <div className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Exporta o importa todos tus datos para respaldo y restauracion.
          </p>
          <button
            type="button"
            onClick={() =>
              downloadTextFile(
                `backup_presupuesto_${new Date().toISOString().slice(0, 10)}.json`,
                exportBackupJson(state),
                "application/json;charset=utf-8",
              )
            }
            className="rounded-lg bg-income px-3 py-2 text-sm font-semibold text-white"
          >
            Exportar backup
          </button>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder="Pega aqui el JSON de backup"
            className="min-h-48 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={() => {
              if (!importText.trim()) return;
              try {
                importBackup(importText);
                setImportText("");
                alert("Backup importado correctamente.");
              } catch (error) {
                alert(`Error al importar: ${(error as Error).message}`);
              }
            }}
            className="rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white"
          >
            Importar backup
          </button>
        </div>
      </Card>

      <Card title="Mantenimiento">
        <div className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Esta accion restaura los datos de ejemplo iniciales.
          </p>
          <button
            type="button"
            onClick={() => {
              const ok = window.confirm("Esto reemplazara todos tus datos actuales. Deseas continuar?");
              if (ok) resetWithSeed();
            }}
            className="rounded-lg bg-expense px-3 py-2 text-sm font-semibold text-white"
          >
            Restaurar datos seed
          </button>
        </div>
      </Card>
    </div>
  );
};
