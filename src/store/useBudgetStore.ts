import { create } from "zustand";
import type {
  Account,
  AccountSortMode,
  AccountTransfer,
  AppDataState,
  Asset,
  Category,
  CurrencyCode,
  Debt,
  DebtPayment,
  GoalContribution,
  Investment,
  Liability,
  LoanPayment,
  LoanRecord,
  MonthlyBudget,
  PageKey,
  SavingsGoal,
  Source,
  Subcategory,
  ThemeMode,
  Transaction,
} from "../types";
import { nowISO } from "../utils/date";
import { makeId } from "../utils/id";
import { buildNetWorthHistoryPoint } from "../utils/kpi";
import { accountBalance, netWorthAccountsAssets, netWorthAccountsLiabilities } from "../utils/accounts";
import { buildDebtHistoryPoint, debtRemainingTotal } from "../utils/debts";
import { receivableLoansTotal } from "../utils/loans";
import { createSeedData } from "../utils/seed";
import {
  clearStateForUser,
  importBackupJson,
  loadStateForUser,
  saveStateForUser,
} from "../utils/storage";

interface BudgetActions {
  hydrateForUser: (userId: string, currencyHint?: CurrencyCode) => void;
  clearUserContext: () => void;
  resetWithSeed: () => void;
  importBackup: (json: string) => void;
  deleteAllMyData: () => void;
  setTheme: (theme: ThemeMode) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setActivePage: (page: PageKey) => void;
  toggleSidebar: () => void;
  addTransaction: (payload: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => void;
  updateTransaction: (id: string, payload: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addBudget: (payload: Omit<MonthlyBudget, "id">) => void;
  deleteBudget: (id: string) => void;
  addCategory: (payload: Omit<Category, "id">) => void;
  updateCategory: (id: string, payload: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addSubcategory: (payload: Omit<Subcategory, "id">) => void;
  updateSubcategory: (id: string, payload: Partial<Subcategory>) => void;
  deleteSubcategory: (id: string) => void;
  addSource: (payload: Omit<Source, "id">) => void;
  updateSource: (id: string, payload: Partial<Source>) => void;
  deleteSource: (id: string) => void;
  addGoal: (payload: Omit<SavingsGoal, "id" | "createdAt">) => void;
  deleteGoal: (id: string) => void;
  addGoalContribution: (payload: Omit<GoalContribution, "id">) => void;
  addInvestment: (payload: Omit<Investment, "id">) => void;
  updateInvestment: (id: string, payload: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;
  addDebt: (payload: Omit<Debt, "id" | "createdAt" | "updatedAt">) => void;
  updateDebt: (id: string, payload: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  addDebtPayment: (payload: Omit<DebtPayment, "id" | "createdAt"> & { accountId?: string }) => void;
  addAccount: (payload: Omit<Account, "id" | "sortOrder" | "createdAt" | "updatedAt">) => void;
  updateAccount: (id: string, payload: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  setAccountSortMode: (mode: AccountSortMode) => void;
  reorderAccounts: (orderedIds: string[]) => void;
  addAccountTransfer: (payload: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    note: string;
  }) => void;
  adjustAccountBalance: (payload: {
    accountId: string;
    realBalance: number;
    date: string;
    note: string;
  }) => void;
  addLoan: (payload: Omit<LoanRecord, "id" | "createdAt" | "updatedAt" | "statusOverride">) => void;
  updateLoan: (id: string, payload: Partial<LoanRecord>) => void;
  deleteLoan: (id: string) => void;
  addLoanPayment: (payload: Omit<LoanPayment, "id" | "createdAt"> & { accountId?: string }) => void;
  markLoanUncollectible: (loanId: string, note: string) => void;
  addAsset: (payload: Omit<Asset, "id">) => void;
  updateAsset: (id: string, payload: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  addLiability: (payload: Omit<Liability, "id">) => void;
  updateLiability: (id: string, payload: Partial<Liability>) => void;
  deleteLiability: (id: string) => void;
}

interface BudgetStore extends AppDataState, BudgetActions {
  isLoading: boolean;
  currentUserId: string | null;
}

const totalAssetsWithLoans = (
  state: Pick<AppDataState, "assets" | "loans" | "loanPayments" | "accounts" | "transactions">,
): number =>
  state.assets.reduce((acc, item) => acc + item.value, 0) +
  receivableLoansTotal(state.loans, state.loanPayments) +
  netWorthAccountsAssets(state.accounts, state.transactions);

const totalLiabilities = (
  state: Pick<AppDataState, "liabilities" | "debts" | "accounts" | "transactions">,
): number =>
  state.liabilities.reduce((acc, item) => acc + item.value, 0) +
  debtRemainingTotal(state.debts) +
  netWorthAccountsLiabilities(state.accounts, state.transactions);

const defaultAccountId = (accounts: Account[]): string | undefined =>
  accounts.find((item) => item.type !== "credit_card")?.id ?? accounts[0]?.id;

const normalizeSortOrder = (accounts: Account[]): Account[] =>
  [...accounts]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((account, index) => ({ ...account, sortOrder: index + 1 }));

const enrichWithNetWorthPoint = (state: AppDataState): AppDataState => ({
  ...state,
  debtHistory: buildDebtHistoryPoint(state.debtHistory, state.debts),
  netWorthHistory: buildNetWorthHistoryPoint(
    state.netWorthHistory,
    totalAssetsWithLoans(state),
    totalLiabilities(state),
  ),
});

const getSerializable = (state: BudgetStore): AppDataState => ({
  version: state.version,
  theme: state.theme,
  currency: state.currency,
  activePage: state.activePage,
  sidebarCollapsed: state.sidebarCollapsed,
  categories: state.categories,
  subcategories: state.subcategories,
  sources: state.sources,
  transactions: state.transactions,
  budgets: state.budgets,
  goals: state.goals,
  goalContributions: state.goalContributions,
  investments: state.investments,
  investmentSnapshots: state.investmentSnapshots,
  debts: state.debts,
  debtPayments: state.debtPayments,
  debtHistory: state.debtHistory,
  accounts: state.accounts,
  accountTransfers: state.accountTransfers,
  accountSortMode: state.accountSortMode,
  loans: state.loans,
  loanPayments: state.loanPayments,
  assets: state.assets,
  liabilities: state.liabilities,
  netWorthHistory: state.netWorthHistory,
});

const bootstrap = createSeedData();

export const useBudgetStore = create<BudgetStore>((set) => {
  const persist = (state: BudgetStore, updates: Partial<AppDataState>) => {
    if (!state.currentUserId) return;
    const next = { ...getSerializable(state), ...updates } as AppDataState;
    saveStateForUser(state.currentUserId, next);
  };

  return {
    ...bootstrap,
    isLoading: true,
    currentUserId: null,

    hydrateForUser: (userId, currencyHint) => {
      const loaded = enrichWithNetWorthPoint(loadStateForUser(userId, currencyHint));
      set({
        ...loaded,
        currentUserId: userId,
        isLoading: false,
      });
    },

    clearUserContext: () => {
      set({
        ...createSeedData(),
        currentUserId: null,
        isLoading: false,
      });
    },

    resetWithSeed: () =>
      set((state) => {
        const seeded = enrichWithNetWorthPoint(createSeedData(state.currency));
        if (state.currentUserId) saveStateForUser(state.currentUserId, seeded);
        return { ...seeded };
      }),

    importBackup: (json) =>
      set((state) => {
        const imported = enrichWithNetWorthPoint(importBackupJson(json, state.currency));
        if (state.currentUserId) saveStateForUser(state.currentUserId, imported);
        return { ...imported };
      }),

    deleteAllMyData: () =>
      set((state) => {
        if (state.currentUserId) {
          clearStateForUser(state.currentUserId);
          const seeded = enrichWithNetWorthPoint(createSeedData(state.currency));
          saveStateForUser(state.currentUserId, seeded);
          return { ...seeded };
        }
        return {};
      }),

    setTheme: (theme) =>
      set((state) => {
        persist(state, { theme });
        return { theme };
      }),

    setCurrency: (currency) =>
      set((state) => {
        persist(state, { currency });
        return { currency };
      }),

    setActivePage: (activePage) =>
      set((state) => {
        persist(state, { activePage });
        return { activePage };
      }),

    toggleSidebar: () =>
      set((state) => {
        const sidebarCollapsed = !state.sidebarCollapsed;
        persist(state, { sidebarCollapsed });
        return { sidebarCollapsed };
      }),

    addTransaction: (payload) =>
      set((state) => {
        const accountId = payload.accountId ?? defaultAccountId(state.accounts);
        const tx: Transaction = {
          ...payload,
          accountId,
          id: makeId("tx"),
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        const transactions = [tx, ...state.transactions];
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, transactions }),
          totalLiabilities({ ...state, transactions }),
        );
        persist(state, { transactions, netWorthHistory });
        return { transactions, netWorthHistory };
      }),

    updateTransaction: (id, payload) =>
      set((state) => {
        const fallbackAccountId = defaultAccountId(state.accounts);
        const transactions = state.transactions.map((item) =>
          item.id === id
            ? {
                ...item,
                ...payload,
                accountId: payload.accountId ?? item.accountId ?? fallbackAccountId,
                updatedAt: nowISO(),
              }
            : item,
        );
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, transactions }),
          totalLiabilities({ ...state, transactions }),
        );
        persist(state, { transactions, netWorthHistory });
        return { transactions, netWorthHistory };
      }),

    deleteTransaction: (id) =>
      set((state) => {
        const linkedTransfer = state.accountTransfers.find(
          (item) => item.expenseTransactionId === id || item.incomeTransactionId === id,
        );
        const transferTxIds = linkedTransfer
          ? new Set([linkedTransfer.expenseTransactionId, linkedTransfer.incomeTransactionId])
          : new Set<string>([id]);
        const transactions = state.transactions.filter((item) => !transferTxIds.has(item.id));
        const accountTransfers = linkedTransfer
          ? state.accountTransfers.filter((item) => item.id !== linkedTransfer.id)
          : state.accountTransfers;
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, transactions }),
          totalLiabilities({ ...state, transactions }),
        );
        persist(state, { transactions, accountTransfers, netWorthHistory });
        return { transactions, accountTransfers, netWorthHistory };
      }),

    addBudget: (payload) =>
      set((state) => {
        const existing = state.budgets.find(
          (item) => item.month === payload.month && item.categoryId === payload.categoryId,
        );
        const budgets = existing
          ? state.budgets.map((item) =>
              item.id === existing.id ? { ...item, limit: payload.limit } : item,
            )
          : [{ id: makeId("budget"), ...payload }, ...state.budgets];
        persist(state, { budgets });
        return { budgets };
      }),

    deleteBudget: (id) =>
      set((state) => {
        const budgets = state.budgets.filter((item) => item.id !== id);
        persist(state, { budgets });
        return { budgets };
      }),

    addCategory: (payload) =>
      set((state) => {
        const categories = [{ id: makeId("cat"), ...payload }, ...state.categories];
        persist(state, { categories });
        return { categories };
      }),

    updateCategory: (id, payload) =>
      set((state) => {
        const categories = state.categories.map((item) =>
          item.id === id ? { ...item, ...payload } : item,
        );
        persist(state, { categories });
        return { categories };
      }),

    deleteCategory: (id) =>
      set((state) => {
        const categories = state.categories.filter((item) => item.id !== id);
        const subcategories = state.subcategories.filter((item) => item.categoryId !== id);
        persist(state, { categories, subcategories });
        return { categories, subcategories };
      }),

    addSubcategory: (payload) =>
      set((state) => {
        const subcategories = [{ id: makeId("sub"), ...payload }, ...state.subcategories];
        persist(state, { subcategories });
        return { subcategories };
      }),

    updateSubcategory: (id, payload) =>
      set((state) => {
        const subcategories = state.subcategories.map((item) =>
          item.id === id ? { ...item, ...payload } : item,
        );
        persist(state, { subcategories });
        return { subcategories };
      }),

    deleteSubcategory: (id) =>
      set((state) => {
        const subcategories = state.subcategories.filter((item) => item.id !== id);
        persist(state, { subcategories });
        return { subcategories };
      }),

    addSource: (payload) =>
      set((state) => {
        const sources = [{ id: makeId("src"), ...payload }, ...state.sources];
        persist(state, { sources });
        return { sources };
      }),

    updateSource: (id, payload) =>
      set((state) => {
        const sources = state.sources.map((item) => (item.id === id ? { ...item, ...payload } : item));
        persist(state, { sources });
        return { sources };
      }),

    deleteSource: (id) =>
      set((state) => {
        const sources = state.sources.filter((item) => item.id !== id);
        persist(state, { sources });
        return { sources };
      }),

    addGoal: (payload) =>
      set((state) => {
        const goals = [{ id: makeId("goal"), createdAt: nowISO(), ...payload }, ...state.goals];
        persist(state, { goals });
        return { goals };
      }),

    deleteGoal: (id) =>
      set((state) => {
        const goals = state.goals.filter((item) => item.id !== id);
        const goalContributions = state.goalContributions.filter((item) => item.goalId !== id);
        persist(state, { goals, goalContributions });
        return { goals, goalContributions };
      }),

    addGoalContribution: (payload) =>
      set((state) => {
        const goalContributions = [{ ...payload, id: makeId("contrib") }, ...state.goalContributions];
        persist(state, { goalContributions });
        return { goalContributions };
      }),

    addInvestment: (payload) =>
      set((state) => {
        const investment: Investment = { id: makeId("inv"), ...payload };
        const investments = [investment, ...state.investments];
        const investmentSnapshots = [
          {
            id: makeId("snap"),
            investmentId: investment.id,
            date: payload.startDate,
            value: payload.currentValue,
          },
          ...state.investmentSnapshots,
        ];
        persist(state, { investments, investmentSnapshots });
        return { investments, investmentSnapshots };
      }),

    updateInvestment: (id, payload) =>
      set((state) => {
        const current = state.investments.find((item) => item.id === id);
        const investments = state.investments.map((item) =>
          item.id === id ? { ...item, ...payload } : item,
        );
        let investmentSnapshots = state.investmentSnapshots;
        if (current && payload.currentValue !== undefined && payload.currentValue !== current.currentValue) {
          investmentSnapshots = [
            {
              id: makeId("snap"),
              investmentId: id,
              date: nowISO().slice(0, 10),
              value: payload.currentValue,
            },
            ...state.investmentSnapshots,
          ];
        }
        persist(state, { investments, investmentSnapshots });
        return { investments, investmentSnapshots };
      }),

    deleteInvestment: (id) =>
      set((state) => {
        const investments = state.investments.filter((item) => item.id !== id);
        const investmentSnapshots = state.investmentSnapshots.filter(
          (item) => item.investmentId !== id,
        );
        persist(state, { investments, investmentSnapshots });
        return { investments, investmentSnapshots };
      }),

    addDebt: (payload) =>
      set((state) => {
        const debt: Debt = {
          ...payload,
          id: makeId("debt"),
          createdAt: nowISO(),
          updatedAt: nowISO(),
          annualInterestRate: payload.annualInterestRate ?? payload.interestRate,
          interestRate: payload.interestRate ?? payload.annualInterestRate,
        };
        const debts = [debt, ...state.debts];
        const debtHistory = buildDebtHistoryPoint(state.debtHistory, debts);
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans(state),
          totalLiabilities({ ...state, debts }),
        );
        persist(state, { debts, debtHistory, netWorthHistory });
        return { debts, debtHistory, netWorthHistory };
      }),

    updateDebt: (id, payload) =>
      set((state) => {
        const debts = state.debts.map((item) =>
          item.id === id
            ? {
                ...item,
                ...payload,
                interestRate: payload.interestRate ?? payload.annualInterestRate ?? item.interestRate,
                annualInterestRate:
                  payload.annualInterestRate ?? payload.interestRate ?? item.annualInterestRate,
                updatedAt: nowISO(),
              }
            : item,
        );
        const debtHistory = buildDebtHistoryPoint(state.debtHistory, debts);
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans(state),
          totalLiabilities({ ...state, debts }),
        );
        persist(state, { debts, debtHistory, netWorthHistory });
        return { debts, debtHistory, netWorthHistory };
      }),

    deleteDebt: (id) =>
      set((state) => {
        const debts = state.debts.filter((item) => item.id !== id);
        const debtPayments = state.debtPayments.filter((item) => item.debtId !== id);
        const debtHistory = buildDebtHistoryPoint(state.debtHistory, debts);
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans(state),
          totalLiabilities({ ...state, debts }),
        );
        persist(state, { debts, debtPayments, debtHistory, netWorthHistory });
        return { debts, debtPayments, debtHistory, netWorthHistory };
      }),

    addDebtPayment: (payload) =>
      set((state) => {
        const debt = state.debts.find((item) => item.id === payload.debtId);
        if (!debt) return {};

        const amount = Math.max(0, payload.amount);
        if (amount <= 0) return {};

        const debtPayment: DebtPayment = {
          ...payload,
          amount,
          id: makeId("debtpay"),
          createdAt: nowISO(),
        };

        const debtPayments = [debtPayment, ...state.debtPayments];
        const debts = state.debts.map((item) =>
          item.id === payload.debtId
            ? {
                ...item,
                remainingBalance: Math.max(0, item.remainingBalance - amount),
                updatedAt: nowISO(),
              }
            : item,
        );

        let categories = state.categories;
        let debtCategory = categories.find((item) => item.name.toLowerCase() === "pago de deuda");
        if (!debtCategory) {
          debtCategory = {
            id: makeId("cat"),
            name: "Pago de deuda",
            icon: "DEBT",
            color: "#ef4444",
            kind: "fixed",
            ruleBucket: "needs",
          };
          categories = [debtCategory, ...categories];
        }

        let sources = state.sources;
        let debtSource = sources.find(
          (item) => item.type === "expense" && item.name.toLowerCase() === "pago de deuda",
        );
        if (!debtSource) {
          debtSource = {
            id: makeId("src"),
            type: "expense",
            name: "Pago de deuda",
          };
          sources = [debtSource, ...sources];
        }

        const paymentTx: Transaction = {
          id: makeId("tx"),
          amount,
          type: "expense",
          accountId: payload.accountId ?? defaultAccountId(state.accounts),
          categoryId: debtCategory.id,
          sourceId: debtSource.id,
          date: payload.date,
          description: `Pago deuda - ${debt.creditor}`,
          motive: payload.isExtra ? "Pago extra de deuda" : "Pago de deuda",
          tags: ["deuda", payload.isExtra ? "extra" : "cuota"],
          isRecurring: false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        const transactions = [paymentTx, ...state.transactions];

        const debtHistory = buildDebtHistoryPoint(state.debtHistory, debts);
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans(state),
          totalLiabilities({ ...state, debts }),
        );
        persist(state, { debtPayments, debts, categories, sources, transactions, debtHistory, netWorthHistory });
        return { debtPayments, debts, categories, sources, transactions, debtHistory, netWorthHistory };
      }),

    addAccount: (payload) =>
      set((state) => {
        const sortOrder = state.accounts.length + 1;
        const account: Account = {
          ...payload,
          id: makeId("acc"),
          sortOrder,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        const accounts = normalizeSortOrder([account, ...state.accounts]);
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, accounts }),
          totalLiabilities({ ...state, accounts }),
        );
        persist(state, { accounts, netWorthHistory });
        return { accounts, netWorthHistory };
      }),

    updateAccount: (id, payload) =>
      set((state) => {
        const accounts = state.accounts.map((item) =>
          item.id === id ? { ...item, ...payload, updatedAt: nowISO() } : item,
        );
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, accounts }),
          totalLiabilities({ ...state, accounts }),
        );
        persist(state, { accounts, netWorthHistory });
        return { accounts, netWorthHistory };
      }),

    deleteAccount: (id) =>
      set((state) => {
        const remainingBase = state.accounts.filter((item) => item.id !== id);
        const transferIdsToRemove = new Set(
          state.accountTransfers
            .filter((item) => item.fromAccountId === id || item.toAccountId === id)
            .map((item) => item.id),
        );
        const transferTxIdsToRemove = new Set(
          state.accountTransfers
            .filter((item) => transferIdsToRemove.has(item.id))
            .flatMap((item) => [item.expenseTransactionId, item.incomeTransactionId]),
        );
        const fallback = defaultAccountId(remainingBase);
        const transactions = state.transactions
          .filter((item) => !transferTxIdsToRemove.has(item.id))
          .map((item) => {
            if (item.accountId !== id) return item;
            if (!fallback) return item;
            return { ...item, accountId: fallback, updatedAt: nowISO() };
          });
        const accountTransfers = state.accountTransfers.filter((item) => !transferIdsToRemove.has(item.id));

        const accounts: Account[] =
          remainingBase.length > 0
            ? normalizeSortOrder(remainingBase)
            : [
                {
                  id: makeId("acc"),
                  name: "Cuenta principal",
                  type: "cash" as const,
                  initialBalance: 0,
                  currency: state.currency,
                  color: "#22c55e",
                  icon: "EF",
                  includeInTotal: true,
                  includeInNetWorth: true,
                  sortOrder: 1,
                  createdAt: nowISO(),
                  updatedAt: nowISO(),
                },
              ];
        const normalizedTx =
          remainingBase.length > 0
            ? transactions
            : transactions.map((item) => ({
                ...item,
                accountId: accounts[0].id,
              }));

        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, accounts, transactions: normalizedTx }),
          totalLiabilities({ ...state, accounts, transactions: normalizedTx }),
        );
        persist(state, {
          accounts,
          accountTransfers,
          transactions: normalizedTx,
          netWorthHistory,
        });
        return {
          accounts,
          accountTransfers,
          transactions: normalizedTx,
          netWorthHistory,
        };
      }),

    setAccountSortMode: (mode) =>
      set((state) => {
        persist(state, { accountSortMode: mode });
        return { accountSortMode: mode };
      }),

    reorderAccounts: (orderedIds) =>
      set((state) => {
        const orderMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
        const accounts = normalizeSortOrder(
          state.accounts.map((account) => ({
            ...account,
            sortOrder: orderMap.get(account.id) ?? account.sortOrder,
            updatedAt: nowISO(),
          })),
        );
        persist(state, { accounts, accountSortMode: "custom" });
        return { accounts, accountSortMode: "custom" as const };
      }),

    addAccountTransfer: (payload) =>
      set((state) => {
        const from = state.accounts.find((item) => item.id === payload.fromAccountId);
        const to = state.accounts.find((item) => item.id === payload.toAccountId);
        if (!from || !to || from.id === to.id) return {};
        const amount = Math.max(0, payload.amount);
        if (!amount) return {};

        const transferId = makeId("trf");
        const expenseTxId = makeId("tx");
        const incomeTxId = makeId("tx");
        const expenseTx: Transaction = {
          id: expenseTxId,
          amount,
          type: "expense",
          accountId: from.id,
          linkedTransferId: transferId,
          date: payload.date,
          description: `Transferencia a ${to.name}`,
          motive: "Transferencia entre cuentas",
          tags: ["transferencia", "cuenta"],
          isRecurring: false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        const incomeTx: Transaction = {
          id: incomeTxId,
          amount,
          type: "income",
          accountId: to.id,
          linkedTransferId: transferId,
          date: payload.date,
          description: `Transferencia desde ${from.name}`,
          motive: "Transferencia entre cuentas",
          tags: ["transferencia", "cuenta"],
          isRecurring: false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        const transfer: AccountTransfer = {
          id: transferId,
          fromAccountId: from.id,
          toAccountId: to.id,
          amount,
          date: payload.date,
          note: payload.note.trim(),
          expenseTransactionId: expenseTxId,
          incomeTransactionId: incomeTxId,
          createdAt: nowISO(),
        };
        const transactions = [incomeTx, expenseTx, ...state.transactions];
        const accountTransfers = [transfer, ...state.accountTransfers];
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, transactions }),
          totalLiabilities({ ...state, transactions }),
        );
        persist(state, { transactions, accountTransfers, netWorthHistory });
        return { transactions, accountTransfers, netWorthHistory };
      }),

    adjustAccountBalance: (payload) =>
      set((state) => {
        const account = state.accounts.find((item) => item.id === payload.accountId);
        if (!account) return {};
        const current = accountBalance(account, state.transactions);
        const diff = Number((payload.realBalance - current).toFixed(2));
        if (Math.abs(diff) < 0.01) return {};

        const adjustmentTx: Transaction =
          account.type === "credit_card"
            ? {
                id: makeId("tx"),
                amount: Math.abs(diff),
                type: diff > 0 ? "expense" : "income",
                accountId: account.id,
                date: payload.date,
                description: `Ajuste de saldo - ${account.name}`,
                motive: "Ajuste de saldo",
                tags: ["ajuste", "tarjeta"],
                isRecurring: false,
                createdAt: nowISO(),
                updatedAt: nowISO(),
              }
            : {
                id: makeId("tx"),
                amount: Math.abs(diff),
                type: diff > 0 ? "income" : "expense",
                accountId: account.id,
                date: payload.date,
                description: `Ajuste de saldo - ${account.name}`,
                motive: "Ajuste de saldo",
                tags: ["ajuste"],
                isRecurring: false,
                createdAt: nowISO(),
                updatedAt: nowISO(),
              };
        const transactions = [adjustmentTx, ...state.transactions];
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, transactions }),
          totalLiabilities({ ...state, transactions }),
        );
        persist(state, { transactions, netWorthHistory });
        return { transactions, netWorthHistory };
      }),

    addLoan: (payload) =>
      set((state) => {
        const loan: LoanRecord = {
          ...payload,
          id: makeId("loan"),
          statusOverride: null,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        const loans = [loan, ...state.loans];
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, loans }),
          totalLiabilities(state),
        );
        persist(state, { loans, netWorthHistory });
        return { loans, netWorthHistory };
      }),

    updateLoan: (id, payload) =>
      set((state) => {
        const loans = state.loans.map((item) =>
          item.id === id ? { ...item, ...payload, updatedAt: nowISO() } : item,
        );
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, loans }),
          totalLiabilities(state),
        );
        persist(state, { loans, netWorthHistory });
        return { loans, netWorthHistory };
      }),

    deleteLoan: (id) =>
      set((state) => {
        const loans = state.loans.filter((item) => item.id !== id);
        const loanPayments = state.loanPayments.filter((item) => item.loanId !== id);
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, loans, loanPayments }),
          totalLiabilities(state),
        );
        persist(state, { loans, loanPayments, netWorthHistory });
        return { loans, loanPayments, netWorthHistory };
      }),

    addLoanPayment: (payload) =>
      set((state) => {
        const loan = state.loans.find((item) => item.id === payload.loanId);
        if (!loan) return {};

        const payment: LoanPayment = {
          ...payload,
          id: makeId("loanpay"),
          createdAt: nowISO(),
        };
        const loanPayments = [payment, ...state.loanPayments];
        const loans = state.loans.map((item) =>
          item.id === payload.loanId ? { ...item, updatedAt: nowISO() } : item,
        );

        let sources = state.sources;
        let recoverySource = sources.find(
          (item) => item.type === "income" && item.name.toLowerCase() === "recuperacion de prestamo",
        );
        if (!recoverySource) {
          recoverySource = {
            id: makeId("src"),
            type: "income",
            name: "Recuperacion de prestamo",
          };
          sources = [recoverySource, ...sources];
        }

        const recoveryTx: Transaction = {
          id: makeId("tx"),
          amount: payload.amount,
          type: "income",
          accountId: payload.accountId ?? defaultAccountId(state.accounts),
          sourceId: recoverySource.id,
          date: payload.date,
          description: `Abono de prestamo - ${loan.personName}`,
          motive: "Recuperacion de prestamo",
          tags: ["prestamo", "abono"],
          isRecurring: false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        const transactions = [recoveryTx, ...state.transactions];

        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, loans, loanPayments }),
          totalLiabilities(state),
        );
        persist(state, { loanPayments, loans, sources, transactions, netWorthHistory });
        return { loanPayments, loans, sources, transactions, netWorthHistory };
      }),

    markLoanUncollectible: (loanId, note) =>
      set((state) => {
        const loans = state.loans.map((item) =>
          item.id === loanId
            ? {
                ...item,
                statusOverride: "uncollectible" as const,
                uncollectibleNote: note.trim() || "Marcado manualmente como incobrable.",
                updatedAt: nowISO(),
              }
            : item,
        );
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, loans }),
          totalLiabilities(state),
        );
        persist(state, { loans, netWorthHistory });
        return { loans, netWorthHistory };
      }),

    addAsset: (payload) =>
      set((state) => {
        const assets = [{ id: makeId("asset"), ...payload }, ...state.assets];
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, assets }),
          totalLiabilities(state),
        );
        persist(state, { assets, netWorthHistory });
        return { assets, netWorthHistory };
      }),

    updateAsset: (id, payload) =>
      set((state) => {
        const assets = state.assets.map((item) => (item.id === id ? { ...item, ...payload } : item));
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, assets }),
          totalLiabilities(state),
        );
        persist(state, { assets, netWorthHistory });
        return { assets, netWorthHistory };
      }),

    deleteAsset: (id) =>
      set((state) => {
        const assets = state.assets.filter((item) => item.id !== id);
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans({ ...state, assets }),
          totalLiabilities(state),
        );
        persist(state, { assets, netWorthHistory });
        return { assets, netWorthHistory };
      }),

    addLiability: (payload) =>
      set((state) => {
        const liabilities = [{ id: makeId("liab"), ...payload }, ...state.liabilities];
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans(state),
          totalLiabilities({ ...state, liabilities }),
        );
        persist(state, { liabilities, netWorthHistory });
        return { liabilities, netWorthHistory };
      }),

    updateLiability: (id, payload) =>
      set((state) => {
        const liabilities = state.liabilities.map((item) =>
          item.id === id ? { ...item, ...payload } : item,
        );
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans(state),
          totalLiabilities({ ...state, liabilities }),
        );
        persist(state, { liabilities, netWorthHistory });
        return { liabilities, netWorthHistory };
      }),

    deleteLiability: (id) =>
      set((state) => {
        const liabilities = state.liabilities.filter((item) => item.id !== id);
        const netWorthHistory = buildNetWorthHistoryPoint(
          state.netWorthHistory,
          totalAssetsWithLoans(state),
          totalLiabilities({ ...state, liabilities }),
        );
        persist(state, { liabilities, netWorthHistory });
        return { liabilities, netWorthHistory };
      }),
  };
});
