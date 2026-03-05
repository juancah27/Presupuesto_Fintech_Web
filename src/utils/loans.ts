import type { LoanPayment, LoanRecord, LoanStatus } from "../types";
import { todayISO } from "./date";

const toDate = (dateISO: string): Date => new Date(`${dateISO}T00:00:00`);

const diffInDays = (fromISO: string, toISO: string): number => {
  const from = toDate(fromISO).getTime();
  const to = toDate(toISO).getTime();
  return Math.max(0, Math.round((to - from) / (1000 * 60 * 60 * 24)));
};

const computeTargetAmount = (loan: LoanRecord): number => {
  if (!loan.hasInterest || !loan.interestRate || loan.interestRate <= 0) return loan.principalAmount;
  const rate = loan.interestRate / 100;
  if (loan.interestType === "annual") {
    const endDate = loan.dueDate ?? todayISO();
    const years = Math.max(diffInDays(loan.lentDate, endDate) / 365, 1 / 12);
    return loan.principalAmount * (1 + rate * years);
  }
  const endDate = loan.dueDate ?? todayISO();
  const months = Math.max(diffInDays(loan.lentDate, endDate) / 30, 1);
  return loan.principalAmount * (1 + rate * months);
};

export const sumLoanPayments = (loanId: string, payments: LoanPayment[]): number =>
  payments.filter((item) => item.loanId === loanId).reduce((acc, item) => acc + item.amount, 0);

export const computeLoanNumbers = (loan: LoanRecord, payments: LoanPayment[]) => {
  const expectedAmount = computeTargetAmount(loan);
  const paidAmount = sumLoanPayments(loan.id, payments);
  const pendingAmount = Math.max(expectedAmount - paidAmount, 0);
  const progress = expectedAmount > 0 ? Math.min((paidAmount / expectedAmount) * 100, 100) : 0;
  return { expectedAmount, paidAmount, pendingAmount, progress };
};

export const resolveLoanStatus = (loan: LoanRecord, payments: LoanPayment[]): LoanStatus => {
  if (loan.statusOverride === "uncollectible") return "uncollectible";
  const { paidAmount, expectedAmount } = computeLoanNumbers(loan, payments);
  if (paidAmount >= expectedAmount) return "paid";
  if (loan.dueDate && loan.dueDate < todayISO()) return "overdue";
  if (paidAmount > 0) return "partial";
  return "active";
};

export const receivableLoansTotal = (loans: LoanRecord[], payments: LoanPayment[]): number =>
  loans.reduce((acc, loan) => {
    const status = resolveLoanStatus(loan, payments);
    if (status === "paid" || status === "uncollectible") return acc;
    return acc + computeLoanNumbers(loan, payments).pendingAmount;
  }, 0);
