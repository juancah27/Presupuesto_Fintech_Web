import type { Debt, DebtHistoryPoint, DebtPayment } from "../types";
import { getCurrentMonthKey, todayISO } from "./date";
import { makeId } from "./id";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const startOfDay = (iso: string) => new Date(`${iso}T00:00:00`);

const toMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const addMonths = (date: Date, months: number): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

export const debtRemainingTotal = (debts: Debt[]): number =>
  debts.reduce((acc, debt) => acc + Math.max(0, debt.remainingBalance), 0);

export const debtPaidTotal = (debt: Debt): number =>
  Math.max(0, debt.originalAmount - Math.max(0, debt.remainingBalance));

export const debtPaidProgress = (debt: Debt): number =>
  debt.originalAmount > 0 ? clamp((debtPaidTotal(debt) / debt.originalAmount) * 100, 0, 100) : 0;

export const progressTone = (progress: number): "danger" | "warning" | "success" =>
  progress <= 30 ? "danger" : progress <= 70 ? "warning" : "success";

export const buildDebtHistoryPoint = (existing: DebtHistoryPoint[], debts: Debt[]): DebtHistoryPoint[] => {
  const month = getCurrentMonthKey();
  const point: DebtHistoryPoint = {
    id: makeId("deh"),
    month,
    totalRemaining: debtRemainingTotal(debts),
  };
  const withoutMonth = existing.filter((item) => item.month !== month);
  return [...withoutMonth, point].sort((a, b) => a.month.localeCompare(b.month));
};

export const nextDueDateISO = (dueDayOfMonth: number, fromISO: string = todayISO()): string => {
  const from = startOfDay(fromISO);
  const year = from.getFullYear();
  const month = from.getMonth();
  const dueThisMonth = new Date(year, month, clamp(dueDayOfMonth, 1, 28));
  if (dueThisMonth.getTime() >= from.getTime()) {
    return dueThisMonth.toISOString().slice(0, 10);
  }
  const dueNextMonth = new Date(year, month + 1, clamp(dueDayOfMonth, 1, 28));
  return dueNextMonth.toISOString().slice(0, 10);
};

export const lastDueDateISO = (dueDayOfMonth: number, fromISO: string = todayISO()): string => {
  const from = startOfDay(fromISO);
  const year = from.getFullYear();
  const month = from.getMonth();
  const dueThisMonth = new Date(year, month, clamp(dueDayOfMonth, 1, 28));
  if (dueThisMonth.getTime() <= from.getTime()) {
    return dueThisMonth.toISOString().slice(0, 10);
  }
  const duePrevMonth = new Date(year, month - 1, clamp(dueDayOfMonth, 1, 28));
  return duePrevMonth.toISOString().slice(0, 10);
};

const daysDiff = (fromISO: string, toISO: string): number => {
  const from = startOfDay(fromISO).getTime();
  const to = startOfDay(toISO).getTime();
  return Math.ceil((to - from) / (1000 * 60 * 60 * 24));
};

export const isDebtDueSoon = (debt: Debt, days: number = 5, fromISO: string = todayISO()): boolean => {
  if (debt.remainingBalance <= 0) return false;
  const nextDue = nextDueDateISO(debt.dueDayOfMonth, fromISO);
  const diff = daysDiff(fromISO, nextDue);
  return diff >= 0 && diff <= days;
};

export const isDebtOverdue = (debt: Debt, payments: DebtPayment[], fromISO: string = todayISO()): boolean => {
  if (debt.remainingBalance <= 0) return false;
  const lastDue = lastDueDateISO(debt.dueDayOfMonth, fromISO);
  if (lastDue >= fromISO) return false;
  const monthKey = lastDue.slice(0, 7);
  const hasPaymentInDueMonth = payments.some(
    (payment) => payment.debtId === debt.id && payment.date.slice(0, 7) === monthKey,
  );
  return !hasPaymentInDueMonth;
};

export const debtInterestRate = (debt: Debt): number =>
  debt.hasInterest ? Math.max(0, debt.annualInterestRate || debt.interestRate || 0) : 0;

export const estimateDebtPayoff = (
  balance: number,
  monthlyPayment: number,
  annualRate: number,
): { months: number; totalInterest: number } => {
  if (balance <= 0) return { months: 0, totalInterest: 0 };
  if (monthlyPayment <= 0) return { months: 999, totalInterest: 0 };

  let months = 0;
  let remaining = balance;
  let totalInterest = 0;
  const monthlyRate = Math.max(0, annualRate) / 100 / 12;

  while (remaining > 0 && months < 999) {
    const interest = remaining * monthlyRate;
    remaining += interest;
    totalInterest += interest;
    const paid = Math.min(monthlyPayment, remaining);
    remaining -= paid;
    months += 1;
  }

  return { months, totalInterest };
};

export const estimateDebtPayoffDate = (months: number, fromISO: string = todayISO()): string => {
  const base = startOfDay(fromISO);
  return addMonths(base, months).toISOString().slice(0, 10);
};

export const debtTotalPaidFromHistory = (debtId: string, payments: DebtPayment[]): number =>
  payments.filter((item) => item.debtId === debtId).reduce((acc, item) => acc + item.amount, 0);

export const simulateExtraDebtPayment = (
  debt: Debt,
  extraPayment: number,
): {
  baselineMonths: number;
  baselineInterest: number;
  projectedMonths: number;
  projectedInterest: number;
  savedMonths: number;
  savedInterest: number;
} => {
  const annualRate = debtInterestRate(debt);
  const baseline = estimateDebtPayoff(debt.remainingBalance, debt.monthlyPayment, annualRate);
  const adjustedBalance = Math.max(0, debt.remainingBalance - Math.max(0, extraPayment));
  const projected = estimateDebtPayoff(adjustedBalance, debt.monthlyPayment, annualRate);
  return {
    baselineMonths: baseline.months,
    baselineInterest: baseline.totalInterest,
    projectedMonths: projected.months,
    projectedInterest: projected.totalInterest,
    savedMonths: Math.max(0, baseline.months - projected.months),
    savedInterest: Math.max(0, baseline.totalInterest - projected.totalInterest),
  };
};

type StrategyMode = "snowball" | "avalanche";

interface SimDebt {
  id: string;
  name: string;
  balance: number;
  monthlyPayment: number;
  annualRate: number;
}

export interface DebtAttackPlan {
  strategy: StrategyMode;
  schedule: Array<{ debtId: string; creditor: string; payoffMonth: number }>;
  firstDebtPaidMonth: number;
  debtFreeMonth: number;
  debtFreeDate: string;
  totalInterest: number;
  roadmap: Array<{ month: string; remaining: number }>;
}

const pickTarget = (debts: SimDebt[], strategy: StrategyMode): SimDebt | null => {
  const active = debts.filter((item) => item.balance > 0);
  if (!active.length) return null;
  if (strategy === "snowball") {
    return [...active].sort((a, b) => a.balance - b.balance)[0];
  }
  return [...active].sort((a, b) => b.annualRate - a.annualRate)[0];
};

export const simulateDebtAttack = (
  debtsInput: Debt[],
  monthlyBudget: number,
  strategy: StrategyMode,
  fromISO: string = todayISO(),
): DebtAttackPlan => {
  const debts: SimDebt[] = debtsInput
    .filter((item) => item.remainingBalance > 0)
    .map((item) => ({
      id: item.id,
      name: item.creditor,
      balance: item.remainingBalance,
      monthlyPayment: Math.max(0, item.monthlyPayment),
      annualRate: debtInterestRate(item),
    }));

  if (!debts.length) {
    return {
      strategy,
      schedule: [],
      firstDebtPaidMonth: 0,
      debtFreeMonth: 0,
      debtFreeDate: fromISO,
      totalInterest: 0,
      roadmap: [{ month: toMonthKey(startOfDay(fromISO)), remaining: 0 }],
    };
  }

  const payoffByDebt = new Map<string, number>();
  let month = 0;
  let totalInterest = 0;
  const monthlyTarget = Math.max(0, monthlyBudget);
  const roadmap: Array<{ month: string; remaining: number }> = [];
  const anchor = startOfDay(fromISO);

  while (debts.some((item) => item.balance > 0) && month < 600) {
    month += 1;
    for (const debt of debts) {
      if (debt.balance <= 0) continue;
      const interest = debt.balance * (debt.annualRate / 100 / 12);
      debt.balance += interest;
      totalInterest += interest;
    }

    const active = debts.filter((item) => item.balance > 0);
    const minNeed = active.reduce((acc, item) => acc + Math.min(item.monthlyPayment, item.balance), 0);
    let budgetLeft = Math.max(monthlyTarget, minNeed);

    for (const debt of active) {
      const minPay = Math.min(debt.monthlyPayment, debt.balance, budgetLeft);
      debt.balance -= minPay;
      budgetLeft -= minPay;
      if (debt.balance <= 0 && !payoffByDebt.has(debt.id)) payoffByDebt.set(debt.id, month);
    }

    if (budgetLeft > 0) {
      while (budgetLeft > 0.01) {
        const target = pickTarget(debts, strategy);
        if (!target) break;
        const extra = Math.min(target.balance, budgetLeft);
        target.balance -= extra;
        budgetLeft -= extra;
        if (target.balance <= 0 && !payoffByDebt.has(target.id)) payoffByDebt.set(target.id, month);
      }
    }

    roadmap.push({
      month: toMonthKey(addMonths(anchor, month)),
      remaining: debts.reduce((acc, item) => acc + Math.max(0, item.balance), 0),
    });
  }

  const schedule = debtsInput
    .map((item) => ({
      debtId: item.id,
      creditor: item.creditor,
      payoffMonth: payoffByDebt.get(item.id) ?? month,
    }))
    .sort((a, b) => a.payoffMonth - b.payoffMonth);

  const firstDebtPaidMonth = schedule.length ? schedule[0].payoffMonth : 0;
  const debtFreeMonth = schedule.length ? Math.max(...schedule.map((item) => item.payoffMonth)) : 0;

  return {
    strategy,
    schedule,
    firstDebtPaidMonth,
    debtFreeMonth,
    debtFreeDate: estimateDebtPayoffDate(debtFreeMonth, fromISO),
    totalInterest,
    roadmap,
  };
};

export const compareDebtStrategies = (debts: Debt[], monthlyBudget: number, fromISO: string = todayISO()) => {
  const snowball = simulateDebtAttack(debts, monthlyBudget, "snowball", fromISO);
  const avalanche = simulateDebtAttack(debts, monthlyBudget, "avalanche", fromISO);
  return { snowball, avalanche };
};
