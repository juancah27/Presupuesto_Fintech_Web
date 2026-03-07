import type { Account, AccountTransfer, Transaction } from "../types";
import { addDaysISO, getCurrentMonthKey, todayISO } from "./date";

const toDay = (iso: string) => iso.slice(0, 10);

export const accountTypeLabel = (type: Account["type"]): string => {
  switch (type) {
    case "cash":
      return "Efectivo";
    case "bank":
      return "Banco";
    case "credit_card":
      return "Tarjeta de credito";
    case "digital_wallet":
      return "Billetera digital";
    case "investment":
      return "Inversion";
    case "crypto":
      return "Crypto";
    default:
      return "Otro";
  }
};

const txEffectForAccount = (tx: Transaction, accountType: Account["type"]): number => {
  if (accountType === "credit_card") {
    if (tx.type === "income") return -tx.amount;
    if (tx.type === "expense" || tx.type === "investment") return tx.amount;
    return 0;
  }
  if (tx.type === "income") return tx.amount;
  if (tx.type === "expense" || tx.type === "investment") return -tx.amount;
  return 0;
};

export const accountTransactions = (accountId: string, transactions: Transaction[]): Transaction[] =>
  transactions.filter((tx) => tx.accountId === accountId);

export const accountBalance = (account: Account, transactions: Transaction[]): number =>
  account.initialBalance +
  accountTransactions(account.id, transactions).reduce((acc, tx) => acc + txEffectForAccount(tx, account.type), 0);

export const accountMonthTotals = (
  account: Account,
  transactions: Transaction[],
  monthKey: string = getCurrentMonthKey(),
): { incoming: number; outgoing: number } => {
  const txs = accountTransactions(account.id, transactions).filter((tx) => tx.date.startsWith(monthKey));
  if (account.type === "credit_card") {
    const incoming = txs.filter((tx) => tx.type === "income").reduce((acc, tx) => acc + tx.amount, 0);
    const outgoing = txs
      .filter((tx) => tx.type === "expense" || tx.type === "investment")
      .reduce((acc, tx) => acc + tx.amount, 0);
    return { incoming, outgoing };
  }
  const incoming = txs.filter((tx) => tx.type === "income").reduce((acc, tx) => acc + tx.amount, 0);
  const outgoing = txs
    .filter((tx) => tx.type === "expense" || tx.type === "investment")
    .reduce((acc, tx) => acc + tx.amount, 0);
  return { incoming, outgoing };
};

export const latestAccountTransactions = (
  accountId: string,
  transactions: Transaction[],
  limit: number = 3,
): Transaction[] =>
  accountTransactions(accountId, transactions)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

export const accountBalanceSeries30d = (account: Account, transactions: Transaction[]) => {
  const end = todayISO();
  const start = addDaysISO(end, -29);
  const txs = accountTransactions(account.id, transactions)
    .filter((tx) => tx.date >= start && tx.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));

  const deltas = new Map<string, number>();
  for (const tx of txs) {
    const day = toDay(tx.date);
    deltas.set(day, (deltas.get(day) ?? 0) + txEffectForAccount(tx, account.type));
  }

  let balance = account.initialBalance;
  // replay tx before start to get opening balance
  for (const tx of accountTransactions(account.id, transactions).filter((tx) => tx.date < start)) {
    balance += txEffectForAccount(tx, account.type);
  }

  const series: Array<{ date: string; balance: number }> = [];
  for (let i = 0; i < 30; i += 1) {
    const day = addDaysISO(start, i);
    balance += deltas.get(day) ?? 0;
    series.push({ date: day.slice(5), balance: Number(balance.toFixed(2)) });
  }
  return series;
};

export const accountUsage = (account: Account, balance: number) => {
  if (account.type !== "credit_card") {
    return { used: 0, available: Math.max(balance, 0), utilization: 0 };
  }
  const limit = Math.max(account.creditLimit ?? 0, 0);
  const used = Math.max(balance, 0);
  const available = Math.max(limit - used, 0);
  const utilization = limit > 0 ? (used / limit) * 100 : 0;
  return { used, available, utilization };
};

export const totalAvailableBalance = (accounts: Account[], transactions: Transaction[]): number =>
  accounts.reduce((acc, account) => {
    if (!account.includeInTotal || account.type === "credit_card") return acc;
    const balance = accountBalance(account, transactions);
    return acc + Math.max(balance, 0);
  }, 0);

export const netWorthAccountsAssets = (accounts: Account[], transactions: Transaction[]): number =>
  accounts.reduce((acc, account) => {
    if (!account.includeInNetWorth || account.type === "credit_card") return acc;
    const balance = accountBalance(account, transactions);
    return acc + Math.max(balance, 0);
  }, 0);

export const netWorthAccountsLiabilities = (accounts: Account[], transactions: Transaction[]): number =>
  accounts.reduce((acc, account) => {
    if (!account.includeInNetWorth) return acc;
    const balance = accountBalance(account, transactions);
    if (account.type === "credit_card") return acc + Math.max(balance, 0);
    return acc + Math.max(-balance, 0);
  }, 0);

export const topAccountsByBalance = (
  accounts: Account[],
  transactions: Transaction[],
  limit: number = 3,
): Array<{ account: Account; balance: number }> =>
  accounts
    .map((account) => ({ account, balance: accountBalance(account, transactions) }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit);

export const sortAccounts = (
  accounts: Account[],
  transactions: Transaction[],
  mode: "custom" | "balance_desc" | "name" | "type",
): Account[] => {
  const rows = [...accounts];
  if (mode === "name") return rows.sort((a, b) => a.name.localeCompare(b.name));
  if (mode === "type") return rows.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  if (mode === "balance_desc") {
    return rows.sort(
      (a, b) => accountBalance(b, transactions) - accountBalance(a, transactions) || a.name.localeCompare(b.name),
    );
  }
  return rows.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
};

export const transferLabel = (transfer: AccountTransfer, from?: Account, to?: Account) =>
  `${from?.name ?? transfer.fromAccountId} -> ${to?.name ?? transfer.toAccountId}`;
