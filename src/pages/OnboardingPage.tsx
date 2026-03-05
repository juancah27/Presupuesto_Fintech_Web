import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { useAuthStore } from "../store/useAuthStore";
import { useBudgetStore } from "../store/useBudgetStore";
import { getCurrentMonthKey } from "../utils/date";

const totalSteps = 3;

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const categories = useBudgetStore((state) => state.categories);
  const addBudget = useBudgetStore((state) => state.addBudget);
  const addSource = useBudgetStore((state) => state.addSource);

  const [step, setStep] = useState(1);
  const [budgetDraft, setBudgetDraft] = useState<Record<string, string>>({});
  const [incomeSource, setIncomeSource] = useState("");

  const mainCategories = useMemo(() => categories.slice(0, 3), [categories]);

  useEffect(() => {
    if (mainCategories.length === 0) return;
    setBudgetDraft((prev) => {
      const next = { ...prev };
      for (const category of mainCategories) {
        if (!(category.id in next)) next[category.id] = "";
      }
      return next;
    });
  }, [mainCategories]);

  const finish = () => {
    const month = getCurrentMonthKey();
    for (const category of mainCategories) {
      const raw = Number(budgetDraft[category.id] ?? 0);
      if (Number.isFinite(raw) && raw > 0) {
        addBudget({ month, categoryId: category.id, limit: raw });
      }
    }
    if (incomeSource.trim()) {
      addSource({ type: "income", name: incomeSource.trim() });
    }
    completeOnboarding();
    navigate("/app/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">Onboarding</p>
          <button
            type="button"
            onClick={finish}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
          >
            Saltar
          </button>
        </div>

        <Card title={`Paso ${step} de ${totalSteps}`}>
          {step === 1 ? (
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Bienvenido{currentUser ? `, ${currentUser.fullName}` : ""}.
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Aqui podras gestionar ingresos, gastos, inversiones y tus principales KPIs para tomar mejores decisiones.
              </p>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Configura un presupuesto mensual inicial para tus categorias principales.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {mainCategories.map((category) => (
                  <label key={category.id} className="block">
                    <span className="mb-1 block text-xs text-slate-500 dark:text-slate-300">{category.name}</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={budgetDraft[category.id] ?? ""}
                      onChange={(event) =>
                        setBudgetDraft((prev) => ({ ...prev, [category.id]: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 dark:border-white/20 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="0.00"
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Agrega tu primera fuente de ingreso para empezar a registrar movimientos.
              </p>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500 dark:text-slate-300">Fuente de ingreso</span>
                <input
                  type="text"
                  value={incomeSource}
                  onChange={(event) => setIncomeSource(event.target.value)}
                  placeholder="Ej: Salario principal"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 dark:border-white/20 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <span
                  key={index}
                  className={`h-2.5 w-2.5 rounded-full ${step === index + 1 ? "bg-cyan-400" : "bg-slate-300 dark:bg-slate-700"}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={step === 1}
                onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Atras
              </button>
              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={() => setStep((prev) => Math.min(totalSteps, prev + 1))}
                  className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finish}
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                >
                  Ir al dashboard
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
