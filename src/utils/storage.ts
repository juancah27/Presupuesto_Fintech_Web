import type { AppDataState, CurrencyCode, Debt } from "../types";
import { APP_VERSION, STORAGE_KEY_PREFIX } from "./constants";
import { createSeedData } from "./seed";

interface PersistedEnvelope {
  version: number;
  data: AppDataState;
}

const isBrowser = typeof window !== "undefined";

const storageKeyForUser = (userId: string): string => `${STORAGE_KEY_PREFIX}:${userId}`;

const normalizeDebt = (raw: Partial<Debt>, fallback: Debt): Debt => ({
  ...fallback,
  ...raw,
  debtType: raw.debtType ?? fallback.debtType,
  hasInterest: typeof raw.hasInterest === "boolean" ? raw.hasInterest : (raw.interestRate ?? 0) > 0,
  interestRate: raw.interestRate ?? raw.annualInterestRate ?? fallback.interestRate,
  annualInterestRate: raw.annualInterestRate ?? raw.interestRate ?? fallback.annualInterestRate,
  dueDayOfMonth:
    typeof raw.dueDayOfMonth === "number" && raw.dueDayOfMonth >= 1 && raw.dueDayOfMonth <= 31
      ? Math.round(raw.dueDayOfMonth)
      : fallback.dueDayOfMonth,
  isKnownPerson: typeof raw.isKnownPerson === "boolean" ? raw.isKnownPerson : false,
  priority: raw.priority ?? fallback.priority,
  color: raw.color ?? fallback.color,
  icon: raw.icon ?? fallback.icon,
  notes: raw.notes ?? "",
  startDate: raw.startDate ?? fallback.startDate,
  createdAt: raw.createdAt ?? fallback.createdAt,
  updatedAt: raw.updatedAt ?? fallback.updatedAt,
});

const normalizeState = (
  candidate: Partial<AppDataState> | undefined,
  currencyHint?: CurrencyCode,
): AppDataState => {
  const base = createSeedData(currencyHint);
  const data = { ...base, ...(candidate ?? {}) } as Partial<AppDataState>;
  return {
    ...base,
    ...data,
    version: APP_VERSION,
    theme: data.theme === "light" ? "light" : "dark",
    currency: data.currency ?? base.currency,
    activePage: data.activePage ?? base.activePage,
    sidebarCollapsed:
      typeof data.sidebarCollapsed === "boolean" ? data.sidebarCollapsed : base.sidebarCollapsed,
    categories: Array.isArray(data.categories) ? data.categories : base.categories,
    subcategories: Array.isArray(data.subcategories) ? data.subcategories : base.subcategories,
    sources: Array.isArray(data.sources) ? data.sources : base.sources,
    transactions: Array.isArray(data.transactions) ? data.transactions : base.transactions,
    budgets: Array.isArray(data.budgets) ? data.budgets : base.budgets,
    goals: Array.isArray(data.goals) ? data.goals : base.goals,
    goalContributions: Array.isArray(data.goalContributions)
      ? data.goalContributions
      : base.goalContributions,
    investments: Array.isArray(data.investments) ? data.investments : base.investments,
    investmentSnapshots: Array.isArray(data.investmentSnapshots)
      ? data.investmentSnapshots
      : base.investmentSnapshots,
    debts: Array.isArray(data.debts)
      ? data.debts.map((item, index) => normalizeDebt(item, base.debts[index] ?? base.debts[0]))
      : base.debts,
    debtPayments: Array.isArray(data.debtPayments) ? data.debtPayments : base.debtPayments,
    debtHistory: Array.isArray(data.debtHistory) ? data.debtHistory : base.debtHistory,
    loans: Array.isArray(data.loans) ? data.loans : base.loans,
    loanPayments: Array.isArray(data.loanPayments) ? data.loanPayments : base.loanPayments,
    assets: Array.isArray(data.assets) ? data.assets : base.assets,
    liabilities: Array.isArray(data.liabilities) ? data.liabilities : base.liabilities,
    netWorthHistory: Array.isArray(data.netWorthHistory) ? data.netWorthHistory : base.netWorthHistory,
  };
};

const migrate = (raw: PersistedEnvelope, currencyHint?: CurrencyCode): AppDataState =>
  normalizeState(raw.data, currencyHint);

export const loadStateForUser = (userId: string, currencyHint?: CurrencyCode): AppDataState => {
  if (!isBrowser) return createSeedData(currencyHint);
  try {
    const serialized = window.localStorage.getItem(storageKeyForUser(userId));
    if (!serialized) return createSeedData(currencyHint);
    const parsed = JSON.parse(serialized) as PersistedEnvelope;
    if (!parsed?.data) return createSeedData(currencyHint);
    return migrate(parsed, currencyHint);
  } catch {
    return createSeedData(currencyHint);
  }
};

export const saveStateForUser = (userId: string, state: AppDataState): void => {
  if (!isBrowser) return;
  const envelope: PersistedEnvelope = {
    version: APP_VERSION,
    data: state,
  };
  window.localStorage.setItem(storageKeyForUser(userId), JSON.stringify(envelope));
};

export const clearStateForUser = (userId: string): void => {
  if (!isBrowser) return;
  window.localStorage.removeItem(storageKeyForUser(userId));
};

export const exportBackupJson = (state: AppDataState): string =>
  JSON.stringify(
    {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      data: state,
    },
    null,
    2,
  );

export const importBackupJson = (
  jsonText: string,
  currencyHint?: CurrencyCode,
): AppDataState => {
  const parsed = JSON.parse(jsonText) as PersistedEnvelope & { data?: AppDataState };
  if (!parsed || !parsed.data) {
    throw new Error("Backup invalido.");
  }
  return migrate({ version: parsed.version ?? APP_VERSION, data: parsed.data }, currencyHint);
};
