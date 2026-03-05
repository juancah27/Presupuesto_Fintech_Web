import { useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useBudgetStore } from "../store/useBudgetStore";
import { formatCurrency } from "../utils/currency";
import { todayISO } from "../utils/date";

export const GoalsPage = () => {
  const store = useBudgetStore();
  const { currency, goals, goalContributions, addGoal, deleteGoal, addGoalContribution } = store;

  const [goalForm, setGoalForm] = useState<{
    name: string;
    targetAmount: string;
    deadline: string;
    accountName: string;
    priority: "low" | "medium" | "high";
  }>({
    name: "",
    targetAmount: "",
    deadline: todayISO(),
    accountName: "",
    priority: "medium",
  });
  const [contribution, setContribution] = useState({ goalId: "", amount: "", date: todayISO() });

  const totalsByGoal = useMemo(() => {
    const map = new Map<string, number>();
    goalContributions.forEach((item) => map.set(item.goalId, (map.get(item.goalId) ?? 0) + item.amount));
    return map;
  }, [goalContributions]);

  const averageByGoal = useMemo(() => {
    const grouped = new Map<string, number[]>();
    goalContributions.forEach((item) => {
      const arr = grouped.get(item.goalId) ?? [];
      arr.push(item.amount);
      grouped.set(item.goalId, arr);
    });
    const avg = new Map<string, number>();
    grouped.forEach((items, goalId) => {
      avg.set(goalId, items.reduce((a, b) => a + b, 0) / items.length);
    });
    return avg;
  }, [goalContributions]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
      <Card title="Crear meta de ahorro">
        <div className="space-y-2">
          <input
            placeholder="Nombre meta"
            value={goalForm.name}
            onChange={(event) => setGoalForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <input
            placeholder="Monto objetivo"
            type="number"
            value={goalForm.targetAmount}
            onChange={(event) => setGoalForm((prev) => ({ ...prev, targetAmount: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <input
            type="date"
            value={goalForm.deadline}
            onChange={(event) => setGoalForm((prev) => ({ ...prev, deadline: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <input
            placeholder="Cuenta asociada"
            value={goalForm.accountName}
            onChange={(event) => setGoalForm((prev) => ({ ...prev, accountName: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <select
            value={goalForm.priority}
            onChange={(event) => setGoalForm((prev) => ({ ...prev, priority: event.target.value as "low" | "medium" | "high" }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
          <button
            type="button"
            onClick={() => {
              if (!goalForm.name.trim() || Number(goalForm.targetAmount) <= 0) return;
              addGoal({
                name: goalForm.name,
                targetAmount: Number(goalForm.targetAmount),
                deadline: goalForm.deadline,
                accountName: goalForm.accountName,
                priority: goalForm.priority,
              });
              setGoalForm({ name: "", targetAmount: "", deadline: todayISO(), accountName: "", priority: "medium" });
            }}
            className="rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white"
          >
            Guardar meta
          </button>
        </div>

        <hr className="my-4 border-slate-200 dark:border-white/10" />
        <h4 className="mb-2 text-sm font-semibold">Registrar aportacion</h4>
        <div className="space-y-2">
          <select
            value={contribution.goalId}
            onChange={(event) => setContribution((prev) => ({ ...prev, goalId: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          >
            <option value="">Meta</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Monto aporte"
            value={contribution.amount}
            onChange={(event) => setContribution((prev) => ({ ...prev, amount: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <input
            type="date"
            value={contribution.date}
            onChange={(event) => setContribution((prev) => ({ ...prev, date: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={() => {
              if (!contribution.goalId || Number(contribution.amount) <= 0) return;
              addGoalContribution({
                goalId: contribution.goalId,
                amount: Number(contribution.amount),
                date: contribution.date,
              });
              setContribution({ goalId: "", amount: "", date: todayISO() });
            }}
            className="rounded-lg bg-income px-3 py-2 text-sm font-semibold text-white"
          >
            Agregar aporte
          </button>
        </div>
      </Card>

      <Card title="Seguimiento de metas">
        <div className="space-y-3">
          {goals.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No hay metas de ahorro creadas.</p>
          )}
          {goals.map((goal) => {
            const totalSaved = totalsByGoal.get(goal.id) ?? 0;
            const progress = goal.targetAmount > 0 ? (totalSaved / goal.targetAmount) * 100 : 0;
            const avgContribution = averageByGoal.get(goal.id) ?? 0;
            const missing = Math.max(goal.targetAmount - totalSaved, 0);
            const estimatedMonths = avgContribution > 0 ? Math.ceil(missing / avgContribution) : null;
            return (
              <div key={goal.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{goal.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {goal.accountName} | Prioridad: {goal.priority}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteGoal(goal.id)}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-expense"
                  >
                    Eliminar
                  </button>
                </div>
                <ProgressBar value={progress} color={progress >= 100 ? "success" : "default"} />
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Ahorrado: {formatCurrency(totalSaved, currency)} / {formatCurrency(goal.targetAmount, currency)}
                  </span>
                  <span>{progress.toFixed(1)}%</span>
                  <span>Fecha limite: {goal.deadline}</span>
                  <span>
                    Cumplimiento estimado: {estimatedMonths === null ? "Sin data" : `${estimatedMonths} mes(es)`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
