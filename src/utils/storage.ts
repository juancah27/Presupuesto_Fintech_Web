import type { AppDataState } from "../types";
import { APP_VERSION, STORAGE_KEY } from "./constants";
import { createSeedData } from "./seed";

interface PersistedEnvelope {
  version: number;
  data: AppDataState;
}

const isBrowser = typeof window !== "undefined";

const normalizeState = (candidate: Partial<AppDataState> | undefined): AppDataState => {
  const base = createSeedData();
  const data = { ...base, ...(candidate ?? {}) } as Partial<AppDataState>;
  return {
    ...base,
    ...data,
    version: APP_VERSION,
    theme: data.theme === "light" ? "light" : "dark",
    currency: data.currency ?? base.currency,
    activePage: data.activePage ?? base.activePage,
    sidebarCollapsed: typeof data.sidebarCollapsed === "boolean" ? data.sidebarCollapsed : base.sidebarCollapsed,
    categories: Array.isArray(data.categories) ? data.categories : base.categories,
    subcategories: Array.isArray(data.subcategories) ? data.subcategories : base.subcategories,
    sources: Array.isArray(data.sources) ? data.sources : base.sources,
    transactions: Array.isArray(data.transactions) ? data.transactions : base.transactions,
    budgets: Array.isArray(data.budgets) ? data.budgets : base.budgets,
    goals: Array.isArray(data.goals) ? data.goals : base.goals,
    goalContributions: Array.isArray(data.goalContributions) ? data.goalContributions : base.goalContributions,
    investments: Array.isArray(data.investments) ? data.investments : base.investments,
    investmentSnapshots: Array.isArray(data.investmentSnapshots) ? data.investmentSnapshots : base.investmentSnapshots,
    debts: Array.isArray(data.debts) ? data.debts : base.debts,
    assets: Array.isArray(data.assets) ? data.assets : base.assets,
    liabilities: Array.isArray(data.liabilities) ? data.liabilities : base.liabilities,
    netWorthHistory: Array.isArray(data.netWorthHistory) ? data.netWorthHistory : base.netWorthHistory,
  };
};

const migrate = (raw: PersistedEnvelope): AppDataState => normalizeState(raw.data);

export const loadState = (): AppDataState => {
  if (!isBrowser) return createSeedData();
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) return createSeedData();
    const parsed = JSON.parse(serialized) as PersistedEnvelope;
    if (!parsed?.data) return createSeedData();
    return migrate(parsed);
  } catch {
    return createSeedData();
  }
};

export const saveState = (state: AppDataState): void => {
  if (!isBrowser) return;
  const envelope: PersistedEnvelope = {
    version: APP_VERSION,
    data: state,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
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

export const importBackupJson = (jsonText: string): AppDataState => {
  const parsed = JSON.parse(jsonText) as PersistedEnvelope & { data?: AppDataState };
  if (!parsed || !parsed.data) {
    throw new Error("Backup invalido.");
  }
  return migrate({ version: parsed.version ?? APP_VERSION, data: parsed.data });
};
