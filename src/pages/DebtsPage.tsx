import { useState } from "react";
import { Card } from "../components/ui/Card";
import { useBudgetStore } from "../store/useBudgetStore";
import { formatCurrency } from "../utils/currency";
import { getCurrentMonthKey } from "../utils/date";

export const DebtsPage = () => {
  const store = useBudgetStore();
  const { currency, debts, transactions, addDebt, updateDebt, deleteDebt } = store;

  const [form, setForm] = useState({
    creditor: "",
    originalAmount: "",
    remainingBalance: "",
    interestRate: "",
    monthlyPayment: "",
    endDate: "",
  });

  const month = getCurrentMonthKey();
  const monthlyIncome = transactions
    .filter((tx) => tx.type === "income" && tx.date.startsWith(month))
    .reduce((acc, tx) => acc + tx.amount, 0);
  const monthlyDebtPayment = debts.reduce((acc, debt) => acc + debt.monthlyPayment, 0);
  const debtToIncomeRatio = monthlyIncome > 0 ? (monthlyDebtPayment / monthlyIncome) * 100 : 0;

  const totalRemainingDebt = debts.reduce((acc, debt) => acc + debt.remainingBalance, 0);
  const projectedDebtFreeMonths = monthlyDebtPayment > 0 ? Math.ceil(totalRemainingDebt / monthlyDebtPayment) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
      <Card title="Registrar deuda">
        <div className="space-y-2">
          <input
            placeholder="Acreedor"
            value={form.creditor}
            onChange={(event) => setForm((prev) => ({ ...prev, creditor: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <input
            placeholder="Monto original"
            type="number"
            value={form.originalAmount}
            onChange={(event) => setForm((prev) => ({ ...prev, originalAmount: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <input
            placeholder="Saldo pendiente"
            type="number"
            value={form.remainingBalance}
            onChange={(event) => setForm((prev) => ({ ...prev, remainingBalance: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <input
            placeholder="Tasa de interes anual (%)"
            type="number"
            value={form.interestRate}
            onChange={(event) => setForm((prev) => ({ ...prev, interestRate: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <input
            placeholder="Cuota mensual"
            type="number"
            value={form.monthlyPayment}
            onChange={(event) => setForm((prev) => ({ ...prev, monthlyPayment: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <input
            type="date"
            value={form.endDate}
            onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={() => {
              if (!form.creditor.trim() || Number(form.remainingBalance) <= 0 || Number(form.monthlyPayment) <= 0) return;
              addDebt({
                creditor: form.creditor,
                originalAmount: Number(form.originalAmount),
                remainingBalance: Number(form.remainingBalance),
                interestRate: Number(form.interestRate),
                monthlyPayment: Number(form.monthlyPayment),
                endDate: form.endDate,
              });
              setForm({
                creditor: "",
                originalAmount: "",
                remainingBalance: "",
                interestRate: "",
                monthlyPayment: "",
                endDate: "",
              });
            }}
            className="rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white"
          >
            Guardar deuda
          </button>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card title="Ratio deuda/ingreso">
            <p className="text-2xl font-bold text-warning">{debtToIncomeRatio.toFixed(1)}%</p>
          </Card>
          <Card title="Pago mensual total">
            <p className="text-2xl font-bold">{formatCurrency(monthlyDebtPayment, currency)}</p>
          </Card>
          <Card title="Proyeccion libre de deuda">
            <p className="text-2xl font-bold">{projectedDebtFreeMonths} meses</p>
          </Card>
        </div>

        <Card title="Pasivos registrados">
          <div className="space-y-2">
            {debts.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No hay deudas registradas.</p>
            )}
            {debts.map((debt) => (
              <div key={debt.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{debt.creditor}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Interes anual: {debt.interestRate}%</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteDebt(debt.id)}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-expense"
                  >
                    Eliminar
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                  <span>Original: {formatCurrency(debt.originalAmount, currency)}</span>
                  <span>Pendiente: {formatCurrency(debt.remainingBalance, currency)}</span>
                  <span>Cuota mensual: {formatCurrency(debt.monthlyPayment, currency)}</span>
                  <span>Termino: {debt.endDate || "No definido"}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    placeholder="Nuevo saldo"
                    className="w-40 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-white/20 dark:bg-slate-900"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        const value = Number(event.currentTarget.value);
                        if (value >= 0) {
                          updateDebt(debt.id, { remainingBalance: value });
                          event.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Enter para actualizar saldo</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
