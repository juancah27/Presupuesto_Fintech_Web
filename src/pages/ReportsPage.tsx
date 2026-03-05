import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "../components/ui/Card";
import { useBudgetStore } from "../store/useBudgetStore";
import { formatCurrency } from "../utils/currency";
import { annualIncomeExpense, detectRecurringExpenses, topExpenseCategories } from "../utils/kpi";
import { getCurrentMonthKey } from "../utils/date";
import { NetWorthChart } from "../components/charts/NetWorthChart";

export const ReportsPage = () => {
  const store = useBudgetStore();
  const { currency, transactions, categories, sources, netWorthHistory } = store;

  const monthKey = getCurrentMonthKey();
  const year = Number(monthKey.slice(0, 4));
  const monthTx = transactions.filter((tx) => tx.date.startsWith(monthKey));

  const monthlyIncome = monthTx.filter((tx) => tx.type === "income").reduce((acc, tx) => acc + tx.amount, 0);
  const monthlyExpense = monthTx.filter((tx) => tx.type === "expense").reduce((acc, tx) => acc + tx.amount, 0);
  const monthlySaving = monthlyIncome - monthlyExpense;

  const annualData = annualIncomeExpense(transactions, year);
  const topCategories = topExpenseCategories(transactions, categories);
  const recurring = detectRecurringExpenses(transactions);

  const recurringWithSource = useMemo(
    () =>
      recurring.map((item) => ({
        ...item,
        sourceName: sources.find((src) => src.id === item.sourceId)?.name ?? "Sin fuente",
      })),
    [recurring, sources],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card title="Reporte mensual">
          <p className="text-sm">Ingresos: {formatCurrency(monthlyIncome, currency)}</p>
          <p className="text-sm">Gastos: {formatCurrency(monthlyExpense, currency)}</p>
          <p className={`text-sm font-semibold ${monthlySaving >= 0 ? "text-income" : "text-expense"}`}>
            Ahorro: {formatCurrency(monthlySaving, currency)}
          </p>
        </Card>
        <Card title="Top 5 categorias de gasto">
          <ul className="space-y-1 text-sm">
            {topCategories.map((item) => (
              <li key={item.category} className="flex items-center justify-between">
                <span>{item.category}</span>
                <span>{formatCurrency(item.total, currency)}</span>
              </li>
            ))}
            {topCategories.length === 0 && <li className="text-slate-500 dark:text-slate-400">Sin registros</li>}
          </ul>
        </Card>
        <Card title="Deteccion de suscripciones">
          <ul className="space-y-1 text-sm">
            {recurringWithSource.map((item, index) => (
              <li key={`${item.sourceName}-${index}`} className="flex items-center justify-between">
                <span>{item.sourceName}</span>
                <span>
                  {formatCurrency(item.amount, currency)} x {item.occurrences}
                </span>
              </li>
            ))}
            {recurringWithSource.length === 0 && (
              <li className="text-slate-500 dark:text-slate-400">No se detectaron patrones recurrentes.</li>
            )}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title={`Reporte anual ${year} (comparativo por mes)`}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="income" fill="#22c55e" name="Ingreso" />
                <Bar dataKey="expense" fill="#ef4444" name="Gasto" />
                <Bar dataKey="saving" fill="#3b82f6" name="Ahorro" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Tendencia de patrimonio neto">
          <NetWorthChart data={netWorthHistory} />
        </Card>
      </div>

      <Card title="Tendencia de ahorro mensual">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={annualData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line dataKey="saving" stroke="#3b82f6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
