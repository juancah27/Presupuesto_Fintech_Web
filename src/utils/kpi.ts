import type {
  Category,
  Debt,
  Investment,
  MonthlyBudget,
  NetWorthPoint,
  Transaction,
} from "../types";
import { addDaysISO, getCurrentMonthKey, getDaysElapsedInMonth, getDaysInMonth, getMonthKey, todayISO } from "./date";
import { makeId } from "./id";

const percent = (value: number): number => Number.isFinite(value) ? value : 0;

export const sumTransactions = (transactions: Transaction[], type: Transaction["type"]): number =>
  transactions.filter((tx) => tx.type === type).reduce((acc, tx) => acc + tx.amount, 0);

export const monthTransactions = (transactions: Transaction[], monthKey: string): Transaction[] =>
  transactions.filter((tx) => getMonthKey(tx.date) === monthKey);

export const computePortfolioRoi = (investments: Investment[]): number => {
  const invested = investments.reduce((acc, inv) => acc + inv.capitalInvested, 0);
  const current = investments.reduce((acc, inv) => acc + inv.currentValue, 0);
  if (!invested) return 0;
  return ((current - invested) / invested) * 100;
};

export interface DashboardMetrics {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netWorth: number;
  savingsRate: number;
  fixedVsVariableRatio: number;
  runwayMonths: number;
  portfolioRoi: number;
  debtToIncomeRatio: number;
  avgDailyExpense: number;
  monthEndExpenseProjection: number;
  projectedBalance30d: number;
  projectedBalance60d: number;
  projectedBalance90d: number;
}

export const computeDashboardMetrics = (
  transactions: Transaction[],
  categories: Category[],
  investments: Investment[],
  debts: Debt[],
  assetsTotal: number,
  liabilitiesTotal: number,
): DashboardMetrics => {
  const monthKey = getCurrentMonthKey();
  const today = todayISO();
  const thisMonthTx = monthTransactions(transactions, monthKey);

  const monthlyIncome = sumTransactions(thisMonthTx, "income");
  const monthlyExpense = sumTransactions(thisMonthTx, "expense");
  const allIncome = sumTransactions(transactions, "income");
  const allExpense = sumTransactions(transactions, "expense");
  const allInvestmentTx = sumTransactions(transactions, "investment");

  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;

  const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));
  const fixedExpense = thisMonthTx
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => {
      const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
      return acc + (cat?.kind === "fixed" ? tx.amount : 0);
    }, 0);
  const variableExpense = Math.max(monthlyExpense - fixedExpense, 0);
  const fixedVsVariableRatio = variableExpense > 0 ? fixedExpense / variableExpense : 0;

  const monthlyDebtPayment = debts
    .filter((debt) => debt.remainingBalance > 0)
    .reduce((acc, debt) => acc + debt.monthlyPayment, 0);
  const debtToIncomeRatio = monthlyIncome > 0 ? (monthlyDebtPayment / monthlyIncome) * 100 : 0;

  const avgExpenseHistory = (() => {
    const monthSums = new Map<string, number>();
    transactions
      .filter((tx) => tx.type === "expense")
      .forEach((tx) => {
        const key = getMonthKey(tx.date);
        monthSums.set(key, (monthSums.get(key) ?? 0) + tx.amount);
      });
    const values = [...monthSums.values()];
    if (!values.length) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  })();

  const currentBalance = allIncome - allExpense - allInvestmentTx;
  const runwayMonths = avgExpenseHistory > 0 ? currentBalance / avgExpenseHistory : 0;

  const daysElapsed = getDaysElapsedInMonth(today);
  const daysInMonth = getDaysInMonth(monthKey);
  const avgDailyExpense = daysElapsed > 0 ? monthlyExpense / daysElapsed : 0;
  const monthEndExpenseProjection = avgDailyExpense * daysInMonth;

  const historicalNetPerDay = (() => {
    if (!transactions.length) return 0;
    const byMonth = new Map<string, { income: number; expense: number; invest: number; days: number }>();
    transactions.forEach((tx) => {
      const key = getMonthKey(tx.date);
      const item = byMonth.get(key) ?? { income: 0, expense: 0, invest: 0, days: getDaysInMonth(key) };
      if (tx.type === "income") item.income += tx.amount;
      if (tx.type === "expense") item.expense += tx.amount;
      if (tx.type === "investment") item.invest += tx.amount;
      byMonth.set(key, item);
    });
    const perDay = [...byMonth.values()].map((value) => (value.income - value.expense - value.invest) / value.days);
    return perDay.length ? perDay.reduce((a, b) => a + b, 0) / perDay.length : 0;
  })();

  const projectedBalance30d = currentBalance + historicalNetPerDay * 30;
  const projectedBalance60d = currentBalance + historicalNetPerDay * 60;
  const projectedBalance90d = currentBalance + historicalNetPerDay * 90;

  return {
    currentBalance: percent(currentBalance),
    monthlyIncome: percent(monthlyIncome),
    monthlyExpense: percent(monthlyExpense),
    netWorth: percent(assetsTotal - liabilitiesTotal),
    savingsRate: percent(savingsRate),
    fixedVsVariableRatio: percent(fixedVsVariableRatio),
    runwayMonths: percent(runwayMonths),
    portfolioRoi: percent(computePortfolioRoi(investments)),
    debtToIncomeRatio: percent(debtToIncomeRatio),
    avgDailyExpense: percent(avgDailyExpense),
    monthEndExpenseProjection: percent(monthEndExpenseProjection),
    projectedBalance30d: percent(projectedBalance30d),
    projectedBalance60d: percent(projectedBalance60d),
    projectedBalance90d: percent(projectedBalance90d),
  };
};

export const cashflowLastSixMonths = (transactions: Transaction[]) => {
  const data: Array<{ month: string; income: number; expense: number }> = [];
  const today = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthTx = monthTransactions(transactions, key);
    data.push({
      month: date.toLocaleDateString("es-PE", { month: "short" }),
      income: sumTransactions(monthTx, "income"),
      expense: sumTransactions(monthTx, "expense"),
    });
  }
  return data;
};

export const expenseDistribution = (transactions: Transaction[], categories: Category[]) => {
  const map = new Map(categories.map((cat) => [cat.id, cat]));
  const result = new Map<string, { name: string; value: number; color: string }>();
  transactions
    .filter((tx) => tx.type === "expense" && tx.categoryId)
    .forEach((tx) => {
      const cat = map.get(tx.categoryId ?? "");
      if (!cat) return;
      const previous = result.get(cat.id) ?? { name: cat.name, value: 0, color: cat.color };
      previous.value += tx.amount;
      result.set(cat.id, previous);
    });
  return [...result.values()];
};

export const budgetConsumption = (
  budgets: MonthlyBudget[],
  transactions: Transaction[],
) => {
  return budgets.map((budget) => {
    const spent = transactions
      .filter(
        (tx) =>
          tx.type === "expense" &&
          tx.categoryId === budget.categoryId &&
          getMonthKey(tx.date) === budget.month,
      )
      .reduce((acc, tx) => acc + tx.amount, 0);
    const progress = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
    const alert = progress >= 100 ? "danger" : progress >= 80 ? "warning" : "ok";
    return { ...budget, spent, progress, alert };
  });
};

export const detectRecurringExpenses = (transactions: Transaction[]) => {
  const expenseTx = transactions.filter((tx) => tx.type === "expense");
  const grouped = new Map<string, Transaction[]>();
  expenseTx.forEach((tx) => {
    const key = `${tx.sourceId ?? "none"}_${tx.amount.toFixed(2)}`;
    const items = grouped.get(key) ?? [];
    items.push(tx);
    grouped.set(key, items);
  });

  return [...grouped.values()]
    .filter((items) => items.length >= 3)
    .map((items) => ({
      amount: items[0].amount,
      sourceId: items[0].sourceId,
      occurrences: items.length,
      lastDate: items.map((it) => it.date).sort().reverse()[0],
    }));
};

export const annualIncomeExpense = (transactions: Transaction[], year: number) => {
  return Array.from({ length: 12 }).map((_, index) => {
    const monthKey = `${year}-${String(index + 1).padStart(2, "0")}`;
    const tx = monthTransactions(transactions, monthKey);
    return {
      month: new Date(year, index, 1).toLocaleDateString("es-PE", { month: "short" }),
      income: sumTransactions(tx, "income"),
      expense: sumTransactions(tx, "expense"),
      saving: sumTransactions(tx, "income") - sumTransactions(tx, "expense"),
    };
  });
};

export const topExpenseCategories = (transactions: Transaction[], categories: Category[]) => {
  const map = new Map(categories.map((cat) => [cat.id, cat.name]));
  const totals = new Map<string, number>();
  transactions
    .filter((tx) => tx.type === "expense" && tx.categoryId)
    .forEach((tx) => {
      const name = map.get(tx.categoryId ?? "") ?? "Sin categoria";
      totals.set(name, (totals.get(name) ?? 0) + tx.amount);
    });
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
};

export const buildNetWorthHistoryPoint = (
  existing: NetWorthPoint[],
  assetsTotal: number,
  liabilitiesTotal: number,
): NetWorthPoint[] => {
  const month = getCurrentMonthKey();
  const netWorth = assetsTotal - liabilitiesTotal;
  const point: NetWorthPoint = {
    id: makeId("nwh"),
    month,
    assets: assetsTotal,
    liabilities: liabilitiesTotal,
    netWorth,
  };
  const withoutMonth = existing.filter((p) => p.month !== month);
  return [...withoutMonth, point].sort((a, b) => a.month.localeCompare(b.month));
};

export const projectionPoints = (startBalance: number, avgNetDaily: number) => [
  { label: "Hoy", days: 0, date: todayISO(), balance: startBalance },
  { label: "30d", days: 30, date: addDaysISO(todayISO(), 30), balance: startBalance + avgNetDaily * 30 },
  { label: "60d", days: 60, date: addDaysISO(todayISO(), 60), balance: startBalance + avgNetDaily * 60 },
  { label: "90d", days: 90, date: addDaysISO(todayISO(), 90), balance: startBalance + avgNetDaily * 90 },
];
