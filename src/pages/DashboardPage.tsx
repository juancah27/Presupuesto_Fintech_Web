import { Card } from "../components/ui/Card";
import { KpiCard } from "../components/ui/KpiCard";
import { useBudgetStore } from "../store/useBudgetStore";
import { formatCurrency } from "../utils/currency";
import {
  budgetConsumption,
  cashflowLastSixMonths,
  computeDashboardMetrics,
  expenseDistribution,
} from "../utils/kpi";
import { CashflowChart } from "../components/charts/CashflowChart";
import { ExpenseDonutChart } from "../components/charts/ExpenseDonutChart";
import { getCurrentMonthKey } from "../utils/date";
import { Badge } from "../components/ui/Badge";

export const DashboardPage = () => {
  const store = useBudgetStore();
  const {
    currency,
    transactions,
    categories,
    investments,
    debts,
    assets,
    liabilities,
    budgets,
  } = store;

  const assetsTotal = assets.reduce((acc, item) => acc + item.value, 0);
  const liabilitiesTotal = liabilities.reduce((acc, item) => acc + item.value, 0);
  const metrics = computeDashboardMetrics(
    transactions,
    categories,
    investments,
    debts,
    assetsTotal,
    liabilitiesTotal,
  );

  const month = getCurrentMonthKey();
  const monthBudgets = budgets.filter((item) => item.month === month);
  const consumption = budgetConsumption(monthBudgets, transactions);
  const monthlyBudgetLimit = monthBudgets.reduce((acc, item) => acc + item.limit, 0);
  const isOverBudget = monthlyBudgetLimit > 0 && metrics.monthlyExpense > monthlyBudgetLimit;

  const cashflowData = cashflowLastSixMonths(transactions);
  const expenseData = expenseDistribution(transactions, categories);

  const needsExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => {
      const category = categories.find((item) => item.id === tx.categoryId);
      return acc + (category?.ruleBucket === "needs" ? tx.amount : 0);
    }, 0);
  const wantsExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => {
      const category = categories.find((item) => item.id === tx.categoryId);
      return acc + (category?.ruleBucket === "wants" ? tx.amount : 0);
    }, 0);
  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((acc, tx) => acc + tx.amount, 0);
  const totalExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => acc + tx.amount, 0);
  const savingsAmount = Math.max(totalIncome - totalExpense, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Saldo actual" value={formatCurrency(metrics.currentBalance, currency)} />
        <KpiCard label="Ingresos del mes" value={formatCurrency(metrics.monthlyIncome, currency)} tone="income" />
        <KpiCard label="Gastos del mes" value={formatCurrency(metrics.monthlyExpense, currency)} tone="expense" />
        <KpiCard label="Patrimonio neto" value={formatCurrency(metrics.netWorth, currency)} tone="investment" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Tasa de ahorro" value={`${metrics.savingsRate.toFixed(1)}%`} />
        <KpiCard
          label="Ratio gastos fijos/variables"
          value={metrics.fixedVsVariableRatio.toFixed(2)}
          hint="Mayor a 1 indica mas gasto fijo"
        />
        <KpiCard label="Runway financiero" value={`${metrics.runwayMonths.toFixed(1)} meses`} />
        <KpiCard label="ROI inversiones" value={`${metrics.portfolioRoi.toFixed(1)}%`} tone="investment" />
        <KpiCard label="Ratio deuda/ingreso" value={`${metrics.debtToIncomeRatio.toFixed(1)}%`} tone="warning" />
        <KpiCard label="Gasto promedio diario" value={formatCurrency(metrics.avgDailyExpense, currency)} />
        <KpiCard
          label="Proyeccion cierre mes"
          value={formatCurrency(metrics.monthEndExpenseProjection, currency)}
          tone="warning"
        />
      </div>

      {isOverBudget && (
        <Card>
          <p className="text-sm font-semibold text-warning">
            Alerta: gasto mensual por encima del presupuesto.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Presupuesto: {formatCurrency(monthlyBudgetLimit, currency)} | Gastado:{" "}
            {formatCurrency(metrics.monthlyExpense, currency)}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Flujo de caja (ultimos 6 meses)">
          <CashflowChart data={cashflowData} />
        </Card>
        <Card title="Distribucion de gastos por categoria">
          <ExpenseDonutChart data={expenseData} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Proyeccion de saldo">
          <div className="space-y-2 text-sm">
            <p>30 dias: {formatCurrency(metrics.projectedBalance30d, currency)}</p>
            <p>60 dias: {formatCurrency(metrics.projectedBalance60d, currency)}</p>
            <p>90 dias: {formatCurrency(metrics.projectedBalance90d, currency)}</p>
          </div>
        </Card>
        <Card title="Regla 50/30/20">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Necesidades</span>
              <span>{totalIncome > 0 ? ((needsExpense / totalIncome) * 100).toFixed(1) : "0"}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Deseos</span>
              <span>{totalIncome > 0 ? ((wantsExpense / totalIncome) * 100).toFixed(1) : "0"}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Ahorro</span>
              <span>{totalIncome > 0 ? ((savingsAmount / totalIncome) * 100).toFixed(1) : "0"}%</span>
            </div>
            <div className="flex gap-2">
              <Badge tone={totalIncome > 0 && (needsExpense / totalIncome) * 100 <= 50 ? "success" : "warning"}>
                {"Necesidades <= 50%"}
              </Badge>
              <Badge tone={totalIncome > 0 && (wantsExpense / totalIncome) * 100 <= 30 ? "success" : "warning"}>
                {"Deseos <= 30%"}
              </Badge>
              <Badge tone={totalIncome > 0 && (savingsAmount / totalIncome) * 100 >= 20 ? "success" : "warning"}>
                {"Ahorro >= 20%"}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Presupuesto por categoria (mes actual)">
        <div className="space-y-2">
          {consumption.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No hay presupuestos configurados para este mes.</p>
          )}
          {consumption.map((item) => {
            const category = categories.find((cat) => cat.id === item.categoryId);
            return (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-100 p-2 text-sm dark:bg-slate-800">
                <span>{category?.name ?? "Categoria"}</span>
                <span>
                  {formatCurrency(item.spent, currency)} / {formatCurrency(item.limit, currency)} ({item.progress.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
