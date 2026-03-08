import { useMemo, useState } from "react";
import { SplitPaymentEditor, type SplitDraftRow, buildSplitTotals } from "../components/transactions/SplitPaymentEditor";
import { CashflowChart } from "../components/charts/CashflowChart";
import { ExpenseDonutChart } from "../components/charts/ExpenseDonutChart";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { KpiCard, type KpiSignal, type KpiSignalLevel } from "../components/ui/KpiCard";
import { useBudgetStore } from "../store/useBudgetStore";
import {
  accountBalance,
  netWorthAccountsAssets,
  netWorthAccountsLiabilities,
  topAccountsByBalance,
  totalAvailableBalance,
} from "../utils/accounts";
import { debtInterestRate, debtRemainingTotal, isDebtDueSoon, isDebtOverdue, nextDueDateISO } from "../utils/debts";
import { formatCurrency } from "../utils/currency";
import { getCurrentMonthKey, getDaysElapsedInMonth, todayISO } from "../utils/date";
import { budgetConsumption, cashflowLastSixMonths, computeDashboardMetrics, expenseDistribution } from "../utils/kpi";
import { computeLoanNumbers, receivableLoansTotal, resolveLoanStatus } from "../utils/loans";

const splitRowSeed = (): SplitDraftRow => ({
  id: `dash-split-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  accountId: "",
  amount: "",
});

const signalScores: Record<KpiSignalLevel, number> = {
  red: 25,
  yellow: 55,
  green: 80,
  blue: 100,
};

const levelTextColor: Record<KpiSignalLevel, string> = {
  red: "text-expense",
  yellow: "text-warning",
  green: "text-income",
  blue: "text-investment",
};

const signalFromSavingsRate = (value: number): KpiSignal => {
  if (value > 50) {
    return {
      level: "blue",
      message: "Excelente disciplina financiera",
      tooltip: "Estás ahorrando más del 50%. Mantén tu estrategia y diversifica metas.",
    };
  }
  if (value > 20) {
    return {
      level: "green",
      message: "Vas muy bien",
      tooltip: "Tu ahorro supera 20%. Procura sostenerlo mes a mes.",
    };
  }
  if (value >= 10) {
    return {
      level: "yellow",
      message: "Ahorro mínimo, intenta mejorar",
      tooltip: "Intenta subir el ahorro con recortes en gastos variables.",
    };
  }
  return {
    level: "red",
    message: "Estás gastando casi todo lo que ganas",
    tooltip: "Tu tasa está bajo 10%. Reduce gastos no esenciales o aumenta ingresos.",
  };
};

const signalFromFixedVariableRatio = (value: number): KpiSignal => {
  if (value < 0.6) {
    return {
      level: "green",
      message: "Buena flexibilidad financiera",
      tooltip: "Tus compromisos fijos están controlados frente a gastos variables.",
    };
  }
  if (value <= 0.8) {
    return {
      level: "yellow",
      message: "Tus gastos fijos están creciendo",
      tooltip: "Evalúa suscripciones y cuotas para recuperar margen.",
    };
  }
  return {
    level: "red",
    message: "Demasiados compromisos fijos",
    tooltip: "Tu estructura fija es alta. Prioriza reducir pagos mensuales obligatorios.",
  };
};

const signalFromRunway = (value: number): KpiSignal => {
  if (value > 12) {
    return {
      level: "blue",
      message: "Excelente seguridad financiera",
      tooltip: "Tienes más de 12 meses de colchón. Enfócate en crecimiento e inversión.",
    };
  }
  if (value >= 6) {
    return {
      level: "green",
      message: "Buena estabilidad",
      tooltip: "Tu colchón de emergencia es sólido. Mantén esta reserva.",
    };
  }
  if (value >= 3) {
    return {
      level: "yellow",
      message: "Colchón mínimo, sigue ahorrando",
      tooltip: "Busca subir tu fondo de emergencia hacia 6 meses o más.",
    };
  }
  return {
    level: "red",
    message: "Situación vulnerable",
    tooltip: "Tu runway es menor a 3 meses. Prioriza liquidez y reducción de gastos.",
  };
};

const signalFromRoi = (value: number): KpiSignal => {
  if (value > 15) {
    return {
      level: "blue",
      message: "Rendimiento excelente",
      tooltip: "ROI mayor a 15%. Revisa riesgos para sostener rendimiento.",
    };
  }
  if (value >= 5) {
    return {
      level: "green",
      message: "Buen rendimiento",
      tooltip: "Tus inversiones están en zona saludable. Continúa con disciplina.",
    };
  }
  if (value >= 0) {
    return {
      level: "yellow",
      message: "Rendimiento bajo",
      tooltip: "Tu ROI está entre 0% y 5%. Evalúa comisiones, horizonte y diversificación.",
    };
  }
  return {
    level: "red",
    message: "Tus inversiones están perdiendo valor",
    tooltip: "ROI negativo. Revisa asignación de activos y exposición al riesgo.",
  };
};

const signalFromDebtIncome = (value: number): KpiSignal => {
  if (value < 10) {
    return {
      level: "blue",
      message: "Deuda muy controlada",
      tooltip: "Tu carga mensual de deuda es muy baja respecto a ingresos.",
    };
  }
  if (value <= 20) {
    return {
      level: "green",
      message: "Nivel saludable",
      tooltip: "Tu ratio deuda/ingreso está en rango sano.",
    };
  }
  if (value <= 35) {
    return {
      level: "yellow",
      message: "Empieza a ser preocupante",
      tooltip: "Vigila nuevas deudas y acelera pagos para no superar el 35%.",
    };
  }
  return {
    level: "red",
    message: "Nivel de deuda peligroso",
    tooltip: "Tu ratio supera 35%. Prioriza plan de pago y frena deuda nueva.",
  };
};

const signalFromMonthProjection = (projection: number, monthlyIncome: number): KpiSignal => {
  if (monthlyIncome <= 0) {
    return {
      level: "red",
      message: "Sin ingreso mensual registrado",
      tooltip: "No se puede evaluar margen de cierre sin ingresos del mes.",
    };
  }
  const ratio = projection / monthlyIncome;
  if (ratio < 0.5) {
    return {
      level: "blue",
      message: "Vas a cerrar el mes con mucho margen",
      tooltip: "Tu proyección está por debajo del 50% del ingreso mensual.",
    };
  }
  if (ratio <= 0.7) {
    return {
      level: "green",
      message: "Cierre de mes saludable",
      tooltip: "Tu gasto proyectado está entre 50% y 70% del ingreso.",
    };
  }
  if (ratio <= 0.9) {
    return {
      level: "yellow",
      message: "Cuidado, casi sin margen",
      tooltip: "Estás proyectando entre 70% y 90% del ingreso mensual.",
    };
  }
  return {
    level: "red",
    message: "Vas a pasarte del presupuesto",
    tooltip: "Tu proyección supera 90% del ingreso mensual. Ajusta gastos de inmediato.",
  };
};

const signalFromDailyTrend = (diff: number | null, formatDiff: (value: number) => string): KpiSignal => {
  if (diff === null) {
    return {
      level: "blue",
      message: "Sin comparativa previa",
      tooltip: "Aún no hay suficientes días del mes para comparar contra ayer.",
    };
  }
  if (diff > 0.01) {
    return {
      level: "red",
      message: `⬆️ Subió vs ayer (${formatDiff(diff)})`,
      tooltip: "Tu gasto promedio diario aumentó. Revisa los gastos de hoy para contener el mes.",
    };
  }
  if (diff < -0.01) {
    return {
      level: "green",
      message: `⬇️ Bajó vs ayer (${formatDiff(Math.abs(diff))})`,
      tooltip: "Tu gasto promedio diario bajó. Mantén este ritmo para mejorar el cierre de mes.",
    };
  }
  return {
    level: "yellow",
    message: "↔️ Sin cambios vs ayer",
    tooltip: "El promedio diario está estable frente al día anterior.",
  };
};

const levelFromHealthScore = (score: number): KpiSignalLevel => {
  if (score <= 40) return "red";
  if (score <= 60) return "yellow";
  if (score <= 80) return "green";
  return "blue";
};

const healthLabel = (score: number): string => {
  if (score <= 40) return "Necesita atencion";
  if (score <= 60) return "En desarrollo";
  if (score <= 80) return "Saludable";
  return "Excelente";
};

const HealthIcon = ({ level }: { level: KpiSignalLevel }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 fill-none stroke-current ${levelTextColor[level]}`} strokeWidth="2" aria-hidden="true">
    <path d="M12 3 4 6v6c0 5.5 3.6 8.9 8 10 4.4-1.1 8-4.5 8-10V6l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

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
    addTransaction,
    addSplitExpenseTransaction,
  } = store;

  const [quickExpense, setQuickExpense] = useState({
    amount: "",
    categoryId: categories[0]?.id ?? "",
    accountId: accounts[0]?.id ?? "",
    date: todayISO(),
    description: "",
    motive: "",
    splitEnabled: false,
    splitRows: [splitRowSeed()],
  });

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
  const cashAccounts = accounts.filter((account) => account.type === "cash");
  const cashWalletBalance = cashAccounts.reduce(
    (acc, account) => acc + Math.max(accountBalance(account, transactions), 0),
    0,
  );
  const today = todayISO();
  const monthExpenseToDate = transactions
    .filter((tx) => tx.type === "expense" && tx.date.startsWith(month) && tx.date <= today)
    .reduce((acc, tx) => acc + tx.amount, 0);
  const daysElapsed = getDaysElapsedInMonth(today);
  const avgDailyExpenseNow = daysElapsed > 0 ? monthExpenseToDate / daysElapsed : 0;
  const yesterdayDate = new Date(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayISO = yesterdayDate.toISOString().slice(0, 10);
  const avgDailyExpenseYesterday =
    daysElapsed > 1 && yesterdayISO.startsWith(month)
      ? transactions
          .filter((tx) => tx.type === "expense" && tx.date.startsWith(month) && tx.date <= yesterdayISO)
          .reduce((acc, tx) => acc + tx.amount, 0) /
        (daysElapsed - 1)
      : null;
  const avgDailyDiff = avgDailyExpenseYesterday === null ? null : avgDailyExpenseNow - avgDailyExpenseYesterday;

  const savingsSignal = signalFromSavingsRate(metrics.savingsRate);
  const fixedVsVariableSignal = signalFromFixedVariableRatio(metrics.fixedVsVariableRatio);
  const runwaySignal = signalFromRunway(metrics.runwayMonths);
  const roiSignal = signalFromRoi(metrics.portfolioRoi);
  const debtIncomeSignal = signalFromDebtIncome(metrics.debtToIncomeRatio);
  const avgDailySignal = signalFromDailyTrend(avgDailyDiff, (value) => formatCurrency(value, currency));
  const projectionSignal = signalFromMonthProjection(metrics.monthEndExpenseProjection, metrics.monthlyIncome);
  const healthSignals = [
    savingsSignal,
    fixedVsVariableSignal,
    runwaySignal,
    roiSignal,
    debtIncomeSignal,
    avgDailySignal,
    projectionSignal,
  ];
  const financialHealthScore = Math.round(
    healthSignals.reduce((acc, signal) => acc + signalScores[signal.level], 0) / healthSignals.length,
  );
  const financialHealthLevel = levelFromHealthScore(financialHealthScore);

  const quickSplitTotals = useMemo(
    () => buildSplitTotals(Number(quickExpense.amount || 0), quickExpense.splitRows),
    [quickExpense.amount, quickExpense.splitRows],
  );
  const quickSplitExact = quickSplitTotals.status === "exact";
  const quickExpenseValid =
    Number(quickExpense.amount) > 0 &&
    Boolean(quickExpense.categoryId) &&
    Boolean(quickExpense.description.trim()) &&
    Boolean(quickExpense.motive.trim()) &&
    (!quickExpense.splitEnabled
      ? Boolean(quickExpense.accountId)
      : quickExpense.splitRows.length > 0 &&
        quickExpense.splitRows.every((row) => row.accountId && Number(row.amount) > 0) &&
        quickSplitExact);

  const submitQuickExpense = () => {
    if (!quickExpenseValid) return;
    if (quickExpense.splitEnabled) {
      addSplitExpenseTransaction({
        totalAmount: Number(quickExpense.amount),
        categoryId: quickExpense.categoryId,
        date: quickExpense.date,
        description: quickExpense.description.trim(),
        motive: quickExpense.motive.trim(),
        tags: ["dashboard", "gasto-rapido"],
        isRecurring: false,
        splits: quickExpense.splitRows.map((row) => ({
          accountId: row.accountId,
          amount: Number(row.amount),
        })),
      });
    } else {
      addTransaction({
        amount: Number(quickExpense.amount),
        type: "expense",
        accountId: quickExpense.accountId,
        categoryId: quickExpense.categoryId,
        date: quickExpense.date,
        description: quickExpense.description.trim(),
        motive: quickExpense.motive.trim(),
        tags: ["dashboard", "gasto-rapido"],
        isRecurring: false,
      });
    }
    setQuickExpense((prev) => ({
      ...prev,
      amount: "",
      description: "",
      motive: "",
      splitRows: [splitRowSeed()],
    }));
  };

  return (
    <div className="space-y-4">
      <Card title="Salud Financiera General" subtitle="Promedio de KPIs clave del dashboard">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={`text-3xl font-bold ${levelTextColor[financialHealthLevel]}`}>{financialHealthScore}/100</p>
            <p className={`text-sm font-semibold ${levelTextColor[financialHealthLevel]}`}>{healthLabel(financialHealthScore)}</p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/40 p-2 dark:bg-white/5">
            <HealthIcon level={financialHealthLevel} />
          </div>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800/90">
          <div
            className="h-full rounded-full bg-gradient-to-r from-expense via-warning via-income to-investment transition-all"
            style={{ width: `${financialHealthScore}%` }}
          />
        </div>
      </Card>

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

      <Card
        className="border-emerald-300/60 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/10"
        title="Billetera en efectivo"
        subtitle="Saldo total en cuentas tipo efectivo"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(cashWalletBalance, currency)}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {cashAccounts.length > 0 ? `${cashAccounts.length} cuenta(s) de efectivo` : "No hay cuentas de efectivo"}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-300/50 bg-emerald-100/70 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
            Efectivo
          </div>
        </div>
      </Card>

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

      <Card title="Gasto rapido">
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            placeholder="Monto"
            type="number"
            value={quickExpense.amount}
            onChange={(event) => setQuickExpense((prev) => ({ ...prev, amount: event.target.value }))}
          />
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            value={quickExpense.categoryId}
            onChange={(event) =>
              setQuickExpense((prev) => ({
                ...prev,
                categoryId: event.target.value,
              }))
            }
          >
            <option value="">Categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            type="date"
            value={quickExpense.date}
            onChange={(event) => setQuickExpense((prev) => ({ ...prev, date: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            placeholder="Descripcion"
            value={quickExpense.description}
            onChange={(event) =>
              setQuickExpense((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
          />
          <input
            className="xl:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            placeholder="Motivo"
            value={quickExpense.motive}
            onChange={(event) =>
              setQuickExpense((prev) => ({
                ...prev,
                motive: event.target.value,
              }))
            }
          />
        </div>

        <div className="mt-2">
          <SplitPaymentEditor
            enabled={quickExpense.splitEnabled}
            totalAmount={Number(quickExpense.amount || 0)}
            currency={currency}
            accounts={accounts}
            rows={quickExpense.splitRows}
            onToggle={(next) =>
              setQuickExpense((prev) => ({
                ...prev,
                splitEnabled: next,
                splitRows: next && prev.splitRows.length === 0 ? [splitRowSeed()] : prev.splitRows,
              }))
            }
            onRowsChange={(rows) => setQuickExpense((prev) => ({ ...prev, splitRows: rows }))}
          />
        </div>

        {!quickExpense.splitEnabled ? (
          <select
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            value={quickExpense.accountId}
            onChange={(event) => setQuickExpense((prev) => ({ ...prev, accountId: event.target.value }))}
          >
            <option value="">Cuenta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        ) : null}

        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={submitQuickExpense}
            disabled={!quickExpenseValid}
            className="rounded-lg bg-expense px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Guardar gasto rapido
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Tasa de ahorro" value={`${metrics.savingsRate.toFixed(1)}%`} signal={savingsSignal} />
        <KpiCard
          label="Ratio gastos fijos/variables"
          value={metrics.fixedVsVariableRatio.toFixed(2)}
          signal={fixedVsVariableSignal}
        />
        <KpiCard label="Runway financiero" value={`${metrics.runwayMonths.toFixed(1)} meses`} signal={runwaySignal} />
        <KpiCard label="ROI inversiones" value={`${metrics.portfolioRoi.toFixed(1)}%`} tone="investment" signal={roiSignal} />
        <KpiCard label="Ratio deuda/ingreso" value={`${metrics.debtToIncomeRatio.toFixed(1)}%`} tone="warning" signal={debtIncomeSignal} />
        <KpiCard label="Gasto promedio diario" value={formatCurrency(metrics.avgDailyExpense, currency)} signal={avgDailySignal} />
        <KpiCard
          label="Proyeccion cierre mes"
          value={formatCurrency(metrics.monthEndExpenseProjection, currency)}
          tone="warning"
          signal={projectionSignal}
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
              <div
                key={item.loan.id}
                className="flex items-center justify-between rounded-lg bg-slate-100 p-2 dark:bg-slate-800"
              >
                <span>{item.loan.personName}</span>
                <span className="text-expense">{formatCurrency(item.pending, currency)}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {dueSoonDebts > 0 || overdueDebts > 0 ? (
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
            {highestDebtInterest
              ? `${highestDebtInterest.creditor} (${debtInterestRate(highestDebtInterest).toFixed(1)}%)`
              : "-"}
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
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No hay presupuestos configurados para este mes.
            </p>
          )}
          {consumption.map((item) => {
            const category = categories.find((cat) => cat.id === item.categoryId);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-slate-100 p-2 text-sm dark:bg-slate-800"
              >
                <span>{category?.name ?? "Categoria"}</span>
                <span>
                  {formatCurrency(item.spent, currency)} / {formatCurrency(item.limit, currency)} (
                  {item.progress.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
