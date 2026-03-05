import { useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Badge } from "../components/ui/Badge";
import { useBudgetStore } from "../store/useBudgetStore";
import { formatCurrency } from "../utils/currency";
import { budgetConsumption } from "../utils/kpi";
import { getCurrentMonthKey, getPreviousMonthKey, monthLabel } from "../utils/date";

export const BudgetPage = () => {
  const store = useBudgetStore();
  const { currency, budgets, categories, transactions, addBudget, deleteBudget } = store;

  const currentMonth = getCurrentMonthKey();
  const previousMonth = getPreviousMonthKey(currentMonth);
  const [month, setMonth] = useState(currentMonth);
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");

  const expenseCategories = categories;
  const monthBudgets = budgets.filter((item) => item.month === month);
  const consumption = budgetConsumption(monthBudgets, transactions);

  const previousSpentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((tx) => tx.type === "expense" && tx.categoryId)
      .forEach((tx) => {
        if (tx.categoryId && tx.date.startsWith(previousMonth)) {
          map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
        }
      });
    return map;
  }, [transactions, previousMonth]);

  const handleAddBudget = () => {
    if (!categoryId || Number(limit) <= 0) return;
    addBudget({ month, categoryId, limit: Number(limit) });
    setCategoryId("");
    setLimit("");
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
      <Card title="Zero-Based Budgeting" subtitle="Configura limite mensual por categoria">
        <div className="space-y-2">
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          >
            <option value="">Selecciona categoria</option>
            {expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Limite mensual"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={handleAddBudget}
            className="rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white"
          >
            Guardar presupuesto
          </button>
        </div>
      </Card>

      <Card title={`Consumo mensual (${monthLabel(month)})`} subtitle="Alertas al 80% y al 100%">
        <div className="space-y-3">
          {consumption.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No hay categorias presupuestadas para este mes.</p>
          )}
          {consumption.map((item) => {
            const category = categories.find((cat) => cat.id === item.categoryId);
            const prevSpent = previousSpentByCategory.get(item.categoryId) ?? 0;
            const diff = item.spent - prevSpent;
            const tone = item.alert === "danger" ? "danger" : item.alert === "warning" ? "warning" : "success";
            return (
              <div key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{category?.icon}</span>
                    <p className="font-medium">{category?.name ?? "Categoria"}</p>
                  </div>
                  <Badge tone={tone}>{item.progress.toFixed(0)}%</Badge>
                </div>
                <ProgressBar
                  value={item.progress}
                  color={item.alert === "danger" ? "danger" : item.alert === "warning" ? "warning" : "success"}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {formatCurrency(item.spent, currency)} / {formatCurrency(item.limit, currency)}
                  </span>
                  <span>
                    Comparativo vs mes anterior ({monthLabel(previousMonth)}):{" "}
                    <b className={diff >= 0 ? "text-expense" : "text-income"}>
                      {diff >= 0 ? "+" : ""}
                      {formatCurrency(diff, currency)}
                    </b>
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteBudget(item.id)}
                    className="rounded border border-red-300 px-2 py-1 text-expense"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
