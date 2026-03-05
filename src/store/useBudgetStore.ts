import { create } from "zustand";
import type {
  AppDataState,
  Asset,
  Category,
  CurrencyCode,
  Debt,
  GoalContribution,
  Investment,
  Liability,
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
import { createSeedData } from "../utils/seed";
import { importBackupJson, loadState, saveState } from "../utils/storage";

interface BudgetActions {
  hydrate: () => void;
  resetWithSeed: () => void;
  importBackup: (json: string) => void;
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
  addDebt: (payload: Omit<Debt, "id">) => void;
  updateDebt: (id: string, payload: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  addAsset: (payload: Omit<Asset, "id">) => void;
  updateAsset: (id: string, payload: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  addLiability: (payload: Omit<Liability, "id">) => void;
  updateLiability: (id: string, payload: Partial<Liability>) => void;
  deleteLiability: (id: string) => void;
}

interface BudgetStore extends AppDataState, BudgetActions {
  isLoading: boolean;
}

const enrichWithNetWorthPoint = (state: AppDataState): AppDataState => ({
  ...state,
  netWorthHistory: buildNetWorthHistoryPoint(
    state.netWorthHistory,
    state.assets.reduce((acc, item) => acc + item.value, 0),
    state.liabilities.reduce((acc, item) => acc + item.value, 0),
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
  assets: state.assets,
  liabilities: state.liabilities,
  netWorthHistory: state.netWorthHistory,
});

const initialState = enrichWithNetWorthPoint(loadState());

export const useBudgetStore = create<BudgetStore>((set) => ({
  ...initialState,
  isLoading: true,

  hydrate: () => {
    const loaded = enrichWithNetWorthPoint(loadState());
    set({ ...loaded, isLoading: false });
  },

  resetWithSeed: () => {
    const seeded = enrichWithNetWorthPoint(createSeedData());
    saveState(seeded);
    set({ ...seeded });
  },

  importBackup: (json) => {
    const imported = enrichWithNetWorthPoint(importBackupJson(json));
    saveState(imported);
    set({ ...imported });
  },

  setTheme: (theme) =>
    set((state) => {
      const next = { ...state, theme };
      saveState(getSerializable(next));
      return { theme };
    }),

  setCurrency: (currency) =>
    set((state) => {
      const next = { ...state, currency };
      saveState(getSerializable(next));
      return { currency };
    }),

  setActivePage: (activePage) =>
    set((state) => {
      const next = { ...state, activePage };
      saveState(getSerializable(next));
      return { activePage };
    }),

  toggleSidebar: () =>
    set((state) => {
      const sidebarCollapsed = !state.sidebarCollapsed;
      const next = { ...state, sidebarCollapsed };
      saveState(getSerializable(next));
      return { sidebarCollapsed };
    }),

  addTransaction: (payload) =>
    set((state) => {
      const tx: Transaction = {
        ...payload,
        id: makeId("tx"),
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      const next = { ...state, transactions: [tx, ...state.transactions] };
      saveState(getSerializable(next));
      return { transactions: next.transactions };
    }),

  updateTransaction: (id, payload) =>
    set((state) => {
      const transactions = state.transactions.map((item) =>
        item.id === id ? { ...item, ...payload, updatedAt: nowISO() } : item,
      );
      const next = { ...state, transactions };
      saveState(getSerializable(next));
      return { transactions };
    }),

  deleteTransaction: (id) =>
    set((state) => {
      const transactions = state.transactions.filter((item) => item.id !== id);
      const next = { ...state, transactions };
      saveState(getSerializable(next));
      return { transactions };
    }),

  addBudget: (payload) =>
    set((state) => {
      const existing = state.budgets.find(
        (item) => item.month === payload.month && item.categoryId === payload.categoryId,
      );
      const budgets = existing
        ? state.budgets.map((item) => (item.id === existing.id ? { ...item, limit: payload.limit } : item))
        : [{ id: makeId("budget"), ...payload }, ...state.budgets];
      const next = { ...state, budgets };
      saveState(getSerializable(next));
      return { budgets };
    }),

  deleteBudget: (id) =>
    set((state) => {
      const budgets = state.budgets.filter((item) => item.id !== id);
      const next = { ...state, budgets };
      saveState(getSerializable(next));
      return { budgets };
    }),

  addCategory: (payload) =>
    set((state) => {
      const categories = [{ id: makeId("cat"), ...payload }, ...state.categories];
      const next = { ...state, categories };
      saveState(getSerializable(next));
      return { categories };
    }),

  updateCategory: (id, payload) =>
    set((state) => {
      const categories = state.categories.map((item) => (item.id === id ? { ...item, ...payload } : item));
      const next = { ...state, categories };
      saveState(getSerializable(next));
      return { categories };
    }),

  deleteCategory: (id) =>
    set((state) => {
      const categories = state.categories.filter((item) => item.id !== id);
      const subcategories = state.subcategories.filter((item) => item.categoryId !== id);
      const next = { ...state, categories, subcategories };
      saveState(getSerializable(next));
      return { categories, subcategories };
    }),

  addSubcategory: (payload) =>
    set((state) => {
      const subcategories = [{ id: makeId("sub"), ...payload }, ...state.subcategories];
      const next = { ...state, subcategories };
      saveState(getSerializable(next));
      return { subcategories };
    }),

  updateSubcategory: (id, payload) =>
    set((state) => {
      const subcategories = state.subcategories.map((item) => (item.id === id ? { ...item, ...payload } : item));
      const next = { ...state, subcategories };
      saveState(getSerializable(next));
      return { subcategories };
    }),

  deleteSubcategory: (id) =>
    set((state) => {
      const subcategories = state.subcategories.filter((item) => item.id !== id);
      const next = { ...state, subcategories };
      saveState(getSerializable(next));
      return { subcategories };
    }),

  addSource: (payload) =>
    set((state) => {
      const sources = [{ id: makeId("src"), ...payload }, ...state.sources];
      const next = { ...state, sources };
      saveState(getSerializable(next));
      return { sources };
    }),

  updateSource: (id, payload) =>
    set((state) => {
      const sources = state.sources.map((item) => (item.id === id ? { ...item, ...payload } : item));
      const next = { ...state, sources };
      saveState(getSerializable(next));
      return { sources };
    }),

  deleteSource: (id) =>
    set((state) => {
      const sources = state.sources.filter((item) => item.id !== id);
      const next = { ...state, sources };
      saveState(getSerializable(next));
      return { sources };
    }),

  addGoal: (payload) =>
    set((state) => {
      const goals = [{ id: makeId("goal"), createdAt: nowISO(), ...payload }, ...state.goals];
      const next = { ...state, goals };
      saveState(getSerializable(next));
      return { goals };
    }),

  deleteGoal: (id) =>
    set((state) => {
      const goals = state.goals.filter((item) => item.id !== id);
      const goalContributions = state.goalContributions.filter((item) => item.goalId !== id);
      const next = { ...state, goals, goalContributions };
      saveState(getSerializable(next));
      return { goals, goalContributions };
    }),

  addGoalContribution: (payload) =>
    set((state) => {
      const goalContributions = [{ ...payload, id: makeId("contrib") }, ...state.goalContributions];
      const next = { ...state, goalContributions };
      saveState(getSerializable(next));
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
      const next = { ...state, investments, investmentSnapshots };
      saveState(getSerializable(next));
      return { investments, investmentSnapshots };
    }),

  updateInvestment: (id, payload) =>
    set((state) => {
      const current = state.investments.find((item) => item.id === id);
      const investments = state.investments.map((item) => (item.id === id ? { ...item, ...payload } : item));
      let investmentSnapshots = state.investmentSnapshots;
      if (current && payload.currentValue !== undefined && payload.currentValue !== current.currentValue) {
        investmentSnapshots = [
          { id: makeId("snap"), investmentId: id, date: nowISO().slice(0, 10), value: payload.currentValue },
          ...state.investmentSnapshots,
        ];
      }
      const next = { ...state, investments, investmentSnapshots };
      saveState(getSerializable(next));
      return { investments, investmentSnapshots };
    }),

  deleteInvestment: (id) =>
    set((state) => {
      const investments = state.investments.filter((item) => item.id !== id);
      const investmentSnapshots = state.investmentSnapshots.filter((item) => item.investmentId !== id);
      const next = { ...state, investments, investmentSnapshots };
      saveState(getSerializable(next));
      return { investments, investmentSnapshots };
    }),

  addDebt: (payload) =>
    set((state) => {
      const debts = [{ id: makeId("debt"), ...payload }, ...state.debts];
      const next = { ...state, debts };
      saveState(getSerializable(next));
      return { debts };
    }),

  updateDebt: (id, payload) =>
    set((state) => {
      const debts = state.debts.map((item) => (item.id === id ? { ...item, ...payload } : item));
      const next = { ...state, debts };
      saveState(getSerializable(next));
      return { debts };
    }),

  deleteDebt: (id) =>
    set((state) => {
      const debts = state.debts.filter((item) => item.id !== id);
      const next = { ...state, debts };
      saveState(getSerializable(next));
      return { debts };
    }),

  addAsset: (payload) =>
    set((state) => {
      const assets = [{ id: makeId("asset"), ...payload }, ...state.assets];
      const netWorthHistory = buildNetWorthHistoryPoint(
        state.netWorthHistory,
        assets.reduce((acc, item) => acc + item.value, 0),
        state.liabilities.reduce((acc, item) => acc + item.value, 0),
      );
      const next = { ...state, assets, netWorthHistory };
      saveState(getSerializable(next));
      return { assets, netWorthHistory };
    }),

  updateAsset: (id, payload) =>
    set((state) => {
      const assets = state.assets.map((item) => (item.id === id ? { ...item, ...payload } : item));
      const netWorthHistory = buildNetWorthHistoryPoint(
        state.netWorthHistory,
        assets.reduce((acc, item) => acc + item.value, 0),
        state.liabilities.reduce((acc, item) => acc + item.value, 0),
      );
      const next = { ...state, assets, netWorthHistory };
      saveState(getSerializable(next));
      return { assets, netWorthHistory };
    }),

  deleteAsset: (id) =>
    set((state) => {
      const assets = state.assets.filter((item) => item.id !== id);
      const netWorthHistory = buildNetWorthHistoryPoint(
        state.netWorthHistory,
        assets.reduce((acc, item) => acc + item.value, 0),
        state.liabilities.reduce((acc, item) => acc + item.value, 0),
      );
      const next = { ...state, assets, netWorthHistory };
      saveState(getSerializable(next));
      return { assets, netWorthHistory };
    }),

  addLiability: (payload) =>
    set((state) => {
      const liabilities = [{ id: makeId("liab"), ...payload }, ...state.liabilities];
      const netWorthHistory = buildNetWorthHistoryPoint(
        state.netWorthHistory,
        state.assets.reduce((acc, item) => acc + item.value, 0),
        liabilities.reduce((acc, item) => acc + item.value, 0),
      );
      const next = { ...state, liabilities, netWorthHistory };
      saveState(getSerializable(next));
      return { liabilities, netWorthHistory };
    }),

  updateLiability: (id, payload) =>
    set((state) => {
      const liabilities = state.liabilities.map((item) => (item.id === id ? { ...item, ...payload } : item));
      const netWorthHistory = buildNetWorthHistoryPoint(
        state.netWorthHistory,
        state.assets.reduce((acc, item) => acc + item.value, 0),
        liabilities.reduce((acc, item) => acc + item.value, 0),
      );
      const next = { ...state, liabilities, netWorthHistory };
      saveState(getSerializable(next));
      return { liabilities, netWorthHistory };
    }),

  deleteLiability: (id) =>
    set((state) => {
      const liabilities = state.liabilities.filter((item) => item.id !== id);
      const netWorthHistory = buildNetWorthHistoryPoint(
        state.netWorthHistory,
        state.assets.reduce((acc, item) => acc + item.value, 0),
        liabilities.reduce((acc, item) => acc + item.value, 0),
      );
      const next = { ...state, liabilities, netWorthHistory };
      saveState(getSerializable(next));
      return { liabilities, netWorthHistory };
    }),
}));
