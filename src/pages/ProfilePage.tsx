import { useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { useAuthStore } from "../store/useAuthStore";
import { useBudgetStore } from "../store/useBudgetStore";
import type { AppDataState, CurrencyCode, LanguageCode } from "../types";
import { downloadTextFile } from "../utils/csv";
import { exportBackupJson } from "../utils/storage";

const currencyOptions: CurrencyCode[] = ["USD", "EUR", "MXN", "COP", "PEN", "ARS"];
const languageOptions: Array<{ value: LanguageCode; label: string }> = [
  { value: "es", label: "Espanol" },
  { value: "en", label: "English" },
];

export const ProfilePage = () => {
  const user = useAuthStore((state) => state.currentUser);
  const updateProfileSettings = useAuthStore((state) => state.updateProfileSettings);
  const updatePassword = useAuthStore((state) => state.updatePassword);
  const setCurrency = useBudgetStore((state) => state.setCurrency);
  const importBackup = useBudgetStore((state) => state.importBackup);
  const deleteAllMyData = useBudgetStore((state) => state.deleteAllMyData);

  const budgetStore = useBudgetStore();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currency, setCurrencyLocal] = useState<CurrencyCode>(user?.currency ?? budgetStore.currency);
  const [language, setLanguage] = useState<LanguageCode>(user?.language ?? "es");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [showDangerModal, setShowDangerModal] = useState(false);
  const [dangerInput, setDangerInput] = useState("");

  const exportState: AppDataState = useMemo(
    () => ({
      version: budgetStore.version,
      theme: budgetStore.theme,
      currency: budgetStore.currency,
      activePage: budgetStore.activePage,
      sidebarCollapsed: budgetStore.sidebarCollapsed,
      categories: budgetStore.categories,
      subcategories: budgetStore.subcategories,
      sources: budgetStore.sources,
      transactions: budgetStore.transactions,
      budgets: budgetStore.budgets,
      goals: budgetStore.goals,
      goalContributions: budgetStore.goalContributions,
      investments: budgetStore.investments,
      investmentSnapshots: budgetStore.investmentSnapshots,
      debts: budgetStore.debts,
      debtPayments: budgetStore.debtPayments,
      debtHistory: budgetStore.debtHistory,
      accounts: budgetStore.accounts,
      accountTransfers: budgetStore.accountTransfers,
      accountSortMode: budgetStore.accountSortMode,
      loans: budgetStore.loans,
      loanPayments: budgetStore.loanPayments,
      assets: budgetStore.assets,
      liabilities: budgetStore.liabilities,
      netWorthHistory: budgetStore.netWorthHistory,
    }),
    [budgetStore],
  );

  const saveProfile = async () => {
    setProfileMessage(null);
    setProfileError(null);
    try {
      await updateProfileSettings({
        fullName,
        email,
        currency,
        language,
      });
      setCurrency(currency);
      setProfileMessage("Perfil actualizado.");
    } catch (error) {
      setProfileError((error as Error).message);
    }
  };

  const savePassword = async () => {
    setPasswordMessage(null);
    setPasswordError(null);
    try {
      await updatePassword(currentPassword, newPassword, confirmPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Contrasena actualizada.");
    } catch (error) {
      setPasswordError((error as Error).message);
    }
  };

  const importJson = () => {
    setImportMessage(null);
    setImportError(null);
    try {
      importBackup(importText);
      setImportText("");
      setImportMessage("Backup importado correctamente.");
    } catch (error) {
      setImportError((error as Error).message);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Perfil y configuracion">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500 dark:text-slate-300">Nombre completo</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500 dark:text-slate-300">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500 dark:text-slate-300">Moneda</span>
                <select
                  value={currency}
                  onChange={(event) => setCurrencyLocal(event.target.value as CurrencyCode)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900 dark:text-slate-100"
                >
                  {currencyOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500 dark:text-slate-300">Idioma</span>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as LanguageCode)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900 dark:text-slate-100"
                >
                  {languageOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {profileMessage ? <p className="text-xs text-emerald-500">{profileMessage}</p> : null}
            {profileError ? <p className="text-xs text-red-500">{profileError}</p> : null}
            <button
              type="button"
              onClick={saveProfile}
              className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Guardar cambios
            </button>
          </div>
        </Card>

        <Card title="Cambiar contrasena">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500 dark:text-slate-300">Contrasena actual</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500 dark:text-slate-300">Nueva contrasena</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500 dark:text-slate-300">Confirmar contrasena</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            {passwordMessage ? <p className="text-xs text-emerald-500">{passwordMessage}</p> : null}
            {passwordError ? <p className="text-xs text-red-500">{passwordError}</p> : null}
            <button
              type="button"
              onClick={savePassword}
              className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400"
            >
              Actualizar contrasena
            </button>
          </div>
        </Card>

        <Card title="Backup de datos">
          <div className="space-y-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Exporta e importa tu data completa en formato JSON.
            </p>
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  `backup_presupuesto_${new Date().toISOString().slice(0, 10)}.json`,
                  exportBackupJson(exportState),
                  "application/json;charset=utf-8",
                )
              }
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Exportar backup
            </button>
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Pega aqui un backup JSON"
              className="min-h-44 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={importJson}
              className="rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white"
            >
              Importar backup
            </button>
            {importMessage ? <p className="text-xs text-emerald-500">{importMessage}</p> : null}
            {importError ? <p className="text-xs text-red-500">{importError}</p> : null}
          </div>
        </Card>

        <Card title="Zona de peligro">
          <div className="space-y-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Borra todos tus movimientos y vuelve al estado inicial de seed data.
            </p>
            <button
              type="button"
              onClick={() => setShowDangerModal(true)}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
            >
              Eliminar toda mi data
            </button>
          </div>
        </Card>
      </div>

      {showDangerModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-white">Confirmar borrado total</h3>
            <p className="mt-2 text-sm text-slate-300">
              Escribe <strong>CONFIRMAR</strong> para eliminar toda tu data.
            </p>
            <input
              value={dangerInput}
              onChange={(event) => setDangerInput(event.target.value)}
              className="mt-3 w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              placeholder="CONFIRMAR"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDangerModal(false);
                  setDangerInput("");
                }}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={dangerInput !== "CONFIRMAR"}
                onClick={() => {
                  deleteAllMyData();
                  setShowDangerModal(false);
                  setDangerInput("");
                }}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmar borrado
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
