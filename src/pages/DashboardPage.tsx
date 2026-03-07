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
import { computeLoanNumbers, receivableLoansTotal, resolveLoanStatus } from "../utils/loans";
import { debtInterestRate, debtRemainingTotal, isDebtDueSoon, isDebtOverdue, nextDueDateISO } from "../utils/debts";
import { netWorthAccountsAssets, netWorthAccountsLiabilities, topAccountsByBalance, totalAvailableBalance } from "../utils/accounts";

export const DashboardPage = () => {
  const store = useBudgetStore();
  const {
    currency,
    transactions,
    categories,
    investments,
    debts,
    debtPayments,
    loans,
    loanPayments,
    assets,
    liabilities,
    accounts,
    budgets,
  } = store;

  const loansReceivable = receivableLoansTotal(loans, loanPayments);
  const assetsTotal =
    assets.reduce((acc, item) => acc + item.value, 0) +
    loansReceivable +
    netWorthAccountsAssets(accounts, transactions);
  const liabilitiesTotal =
    liabilities.reduce((acc, item) => acc + item.value, 0) +
    debtRemainingTotal(debts) +
    netWorthAccountsLiabilities(accounts, transactions);
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
  const overdueLoans = loans
    .filter((loan) => resolveLoanStatus(loan, loanPayments) === "overdue")
    .map((loan) => ({ loan, pending: computeLoanNumbers(loan, loanPayments).pendingAmount }));

  const recoveredThisMonth = loanPayments
    .filter((payment) => payment.date.slice(0, 7) === month)
    .reduce((acc, payment) => acc + payment.amount, 0);

  const activeLoansCount = loans.filter((loan) => {
    const status = resolveLoanStatus(loan, loanPayments);
    return status === "active" || status === "partial" || status === "overdue";
  }).length;

  const activeDebts = debts.filter((item) => item.remainingBalance > 0);
  const activeDebtTotal = activeDebts.reduce((acc, item) => acc + item.remainingBalance, 0);
  const nextDebtPayment = [...activeDebts].sort((a, b) =>
    nextDueDateISO(a.dueDayOfMonth).localeCompare(nextDueDateISO(b.dueDayOfMonth)),
  )[0];
  const highestDebtInterest = [...activeDebts].sort((a, b) => debtInterestRate(b) - debtInterestRate(a))[0];
  const dueSoonDebts = activeDebts.filter((item) => isDebtDueSoon(item, 5)).length;
  const overdueDebts = activeDebts.filter((item) => isDebtOverdue(item, debtPayments)).length;

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
  const topAccounts = topAccountsByBalance(accounts, transactions, 3);
  const availableBalance = totalAvailableBalance(accounts, transactions);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Saldo actual" value={formatCurrency(metrics.currentBalance, currency)} />
        <KpiCard label="Ingresos del mes" value={formatCurrency(metrics.monthlyIncome, currency)} tone="income" />
        <KpiCard label="Gastos del mes" value={formatCurrency(metrics.monthlyExpense, currency)} tone="expense" />
        <KpiCard label="Patrimonio neto" value={formatCurrency(metrics.netWorth, currency)} tone="investment" />
        <KpiCard
          label="Prestamos activos por cobrar"
          value={formatCurrency(loansReceivable, currency)}
          hint={`${activeLoansCount} prestamos activos`}
          tone="warning"
        />
        <KpiCard
          label="Recuperado este mes"
          value={formatCurrency(recoveredThisMonth, currency)}
          tone="income"
        />
        <KpiCard
          label="Saldo disponible en cuentas"
          value={formatCurrency(availableBalance, currency)}
          hint={`${accounts.length} cuentas`}
        />
      </div>

      <Card title="Top cuentas con mayor saldo">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {topAccounts.map((item) => (
            <div key={item.account.id} className="rounded-xl bg-slate-100 p-2 text-sm dark:bg-slate-800">
              <p className="font-semibold">{item.account.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.account.type}</p>
              <p className="mt-1">{formatCurrency(item.balance, item.account.currency)}</p>
            </div>
          ))}
          {topAccounts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Sin cuentas registradas.</p>
          ) : null}
        </div>
      </Card>

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

      {overdueLoans.length > 0 ? (
        <Card title="Pendientes">
          <p className="mb-2 text-sm font-semibold text-warning">
            Tienes {overdueLoans.length} prestamos vencidos pendientes de cobro.
          </p>
          <div className="space-y-2 text-sm">
            {overdueLoans.map((item) => (
              <div key={item.loan.id} className="flex items-center justify-between rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                <span>{item.loan.personName}</span>
                <span className="text-expense">{formatCurrency(item.pending, currency)}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {(dueSoonDebts > 0 || overdueDebts > 0) ? (
        <Card title="Alertas de Deudas">
          <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <p>
              Proximos 5 dias: <strong>{dueSoonDebts}</strong>
            </p>
            <p>
              Vencidas: <strong className="text-expense">{overdueDebts}</strong>
            </p>
          </div>
        </Card>
      ) : null}

      <Card title="Resumen de Deudas">
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
          <p>Total deudas activas: {formatCurrency(activeDebtTotal, currency)}</p>
          <p>
            Proximo pago:{" "}
            {nextDebtPayment
              ? `${nextDueDateISO(nextDebtPayment.dueDayOfMonth)} - ${formatCurrency(nextDebtPayment.monthlyPayment, currency)}`
              : "-"}
          </p>
          <p>
            Mayor interes:{" "}
            {highestDebtInterest ? `${highestDebtInterest.creditor} (${debtInterestRate(highestDebtInterest).toFixed(1)}%)` : "-"}
          </p>
        </div>
      </Card>

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
