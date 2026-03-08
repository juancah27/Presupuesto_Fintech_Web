import type { Account, AppDataState, Asset, CurrencyCode, Debt } from "../types";
import { APP_VERSION, STORAGE_KEY_PREFIX } from "./constants";
import { makeId } from "./id";
import { createSeedData } from "./seed";

interface PersistedEnvelope {
  version: number;
  data: AppDataState;
}

export type BackupImportMode = "replace" | "merge";

type MergeCollectionKey =
  | "categories"
  | "subcategories"
  | "sources"
  | "transactions"
  | "budgets"
  | "goals"
  | "goalContributions"
  | "investments"
  | "investmentSnapshots"
  | "debts"
  | "debtPayments"
  | "debtHistory"
  | "accounts"
  | "accountTransfers"
  | "loans"
  | "loanPayments"
  | "assets"
  | "liabilities"
  | "netWorthHistory";

export interface BackupImportPreviewModule {
  key: MergeCollectionKey;
  label: string;
  incomingCount: number;
  currentCount: number;
  additions: number;
  updatesFromImport: number;
  keptCurrent: number;
  unchanged: number;
  replaceWouldDelete: number;
}

export interface BackupImportPreview {
  generatedAt: string;
  mode: BackupImportMode;
  totals: {
    additions: number;
    updatesFromImport: number;
    keptCurrent: number;
    unchanged: number;
    replaceWouldDelete: number;
  };
  modules: BackupImportPreviewModule[];
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

const normalizeAccount = (raw: Partial<Account>, fallback: Account, order: number): Account => ({
  ...fallback,
  ...raw,
  type: raw.type ?? fallback.type,
  initialBalance: Number(raw.initialBalance ?? fallback.initialBalance) || 0,
  currency: raw.currency ?? fallback.currency,
  color: raw.color ?? fallback.color,
  icon: raw.icon ?? fallback.icon,
  includeInTotal: typeof raw.includeInTotal === "boolean" ? raw.includeInTotal : fallback.includeInTotal,
  includeInNetWorth:
    typeof raw.includeInNetWorth === "boolean" ? raw.includeInNetWorth : fallback.includeInNetWorth,
  creditLimit: raw.creditLimit ?? fallback.creditLimit,
  statementDay: raw.statementDay ?? fallback.statementDay,
  paymentDay: raw.paymentDay ?? fallback.paymentDay,
  sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : order,
  createdAt: raw.createdAt ?? fallback.createdAt,
  updatedAt: raw.updatedAt ?? fallback.updatedAt,
});

const isAssetMigrableToAccount = (asset: Asset): boolean =>
  asset.type === "bank" || asset.type === "investment";

const accountTypeFromAsset = (asset: Asset): Account["type"] =>
  asset.type === "investment" ? "investment" : "bank";

const MERGE_COLLECTIONS: Array<{ key: MergeCollectionKey; label: string }> = [
  { key: "categories", label: "Categorias" },
  { key: "subcategories", label: "Subcategorias" },
  { key: "sources", label: "Fuentes" },
  { key: "transactions", label: "Transacciones" },
  { key: "budgets", label: "Presupuestos" },
  { key: "goals", label: "Metas" },
  { key: "goalContributions", label: "Aportes a metas" },
  { key: "investments", label: "Inversiones" },
  { key: "investmentSnapshots", label: "Snapshots de inversion" },
  { key: "debts", label: "Deudas" },
  { key: "debtPayments", label: "Pagos de deuda" },
  { key: "debtHistory", label: "Evolucion de deudas" },
  { key: "accounts", label: "Cuentas" },
  { key: "accountTransfers", label: "Transferencias entre cuentas" },
  { key: "loans", label: "Prestamos otorgados" },
  { key: "loanPayments", label: "Abonos de prestamos" },
  { key: "assets", label: "Activos manuales" },
  { key: "liabilities", label: "Pasivos manuales" },
  { key: "netWorthHistory", label: "Historico de patrimonio" },
];

type IdRecord = { id: string; updatedAt?: string; createdAt?: string };

const safeTime = (value?: string): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const preferIncomingRecord = <T extends IdRecord>(current: T, incoming: T): boolean => {
  const incomingTime = safeTime(incoming.updatedAt ?? incoming.createdAt);
  const currentTime = safeTime(current.updatedAt ?? current.createdAt);
  if (incomingTime === null && currentTime === null) return false;
  if (incomingTime === null) return false;
  if (currentTime === null) return true;
  return incomingTime > currentTime;
};

const sameRecord = <T extends IdRecord>(a: T, b: T): boolean => JSON.stringify(a) === JSON.stringify(b);

const modulePreview = (
  key: MergeCollectionKey,
  label: string,
  currentItems: IdRecord[],
  incomingItems: IdRecord[],
): BackupImportPreviewModule => {
  const currentById = new Map(currentItems.map((item) => [item.id, item]));
  let additions = 0;
  let updatesFromImport = 0;
  let keptCurrent = 0;
  let unchanged = 0;
  for (const incoming of incomingItems) {
    const current = currentById.get(incoming.id);
    if (!current) {
      additions += 1;
      continue;
    }
    if (sameRecord(current, incoming)) {
      unchanged += 1;
      continue;
    }
    if (preferIncomingRecord(current, incoming)) {
      updatesFromImport += 1;
    } else {
      keptCurrent += 1;
    }
  }
  const incomingIds = new Set(incomingItems.map((item) => item.id));
  const replaceWouldDelete = currentItems.filter((item) => !incomingIds.has(item.id)).length;
  return {
    key,
    label,
    incomingCount: incomingItems.length,
    currentCount: currentItems.length,
    additions,
    updatesFromImport,
    keptCurrent,
    unchanged,
    replaceWouldDelete,
  };
};

const buildImportPreview = (
  mode: BackupImportMode,
  current: AppDataState,
  incoming: AppDataState,
): BackupImportPreview => {
  const modules = MERGE_COLLECTIONS.map(({ key, label }) =>
    modulePreview(key, label, current[key] as IdRecord[], incoming[key] as IdRecord[]),
  );
  const totals = modules.reduce(
    (acc, item) => ({
      additions: acc.additions + item.additions,
      updatesFromImport: acc.updatesFromImport + item.updatesFromImport,
      keptCurrent: acc.keptCurrent + item.keptCurrent,
      unchanged: acc.unchanged + item.unchanged,
      replaceWouldDelete: acc.replaceWouldDelete + item.replaceWouldDelete,
    }),
    {
      additions: 0,
      updatesFromImport: 0,
      keptCurrent: 0,
      unchanged: 0,
      replaceWouldDelete: 0,
    },
  );
  return {
    generatedAt: new Date().toISOString(),
    mode,
    totals,
    modules,
  };
};

const mergeById = <T extends IdRecord>(currentItems: T[], incomingItems: T[]): T[] => {
  const currentById = new Map(currentItems.map((item) => [item.id, item]));
  const consumed = new Set<string>();
  const merged: T[] = [];

  for (const incoming of incomingItems) {
    const current = currentById.get(incoming.id);
    if (!current) {
      merged.push(incoming);
      consumed.add(incoming.id);
      continue;
    }
    consumed.add(incoming.id);
    if (sameRecord(current, incoming)) {
      merged.push(current);
      continue;
    }
    merged.push(preferIncomingRecord(current, incoming) ? incoming : current);
  }

  for (const current of currentItems) {
    if (!consumed.has(current.id)) merged.push(current);
  }
  return merged;
};

const mergeStates = (current: AppDataState, incoming: AppDataState): AppDataState => ({
  ...current,
  version: APP_VERSION,
  categories: mergeById(current.categories, incoming.categories),
  subcategories: mergeById(current.subcategories, incoming.subcategories),
  sources: mergeById(current.sources, incoming.sources),
  transactions: mergeById(current.transactions, incoming.transactions),
  budgets: mergeById(current.budgets, incoming.budgets),
  goals: mergeById(current.goals, incoming.goals),
  goalContributions: mergeById(current.goalContributions, incoming.goalContributions),
  investments: mergeById(current.investments, incoming.investments),
  investmentSnapshots: mergeById(current.investmentSnapshots, incoming.investmentSnapshots),
  debts: mergeById(current.debts, incoming.debts),
  debtPayments: mergeById(current.debtPayments, incoming.debtPayments),
  debtHistory: mergeById(current.debtHistory, incoming.debtHistory),
  accounts: mergeById(current.accounts, incoming.accounts),
  accountTransfers: mergeById(current.accountTransfers, incoming.accountTransfers),
  loans: mergeById(current.loans, incoming.loans),
  loanPayments: mergeById(current.loanPayments, incoming.loanPayments),
  assets: mergeById(current.assets, incoming.assets),
  liabilities: mergeById(current.liabilities, incoming.liabilities),
  netWorthHistory: mergeById(current.netWorthHistory, incoming.netWorthHistory),
});

const normalizeState = (
  candidate: Partial<AppDataState> | undefined,
  currencyHint?: CurrencyCode,
): AppDataState => {
  const base = createSeedData(currencyHint);
  const data = { ...base, ...(candidate ?? {}) } as Partial<AppDataState>;

  const fallbackAccount = base.accounts[0];
  let normalizedAccounts: Account[] = Array.isArray(data.accounts)
    ? data.accounts.map((item, index) => normalizeAccount(item, base.accounts[index] ?? fallbackAccount, index + 1))
    : [];

  let normalizedAssets: Asset[] = Array.isArray(data.assets) ? data.assets : base.assets;

  if (normalizedAccounts.length === 0 && Array.isArray(data.assets)) {
    const migrable = data.assets.filter(isAssetMigrableToAccount);
    if (migrable.length > 0) {
      normalizedAccounts = migrable.map((asset, index) => ({
        id: makeId("acc"),
        name: asset.name,
        type: accountTypeFromAsset(asset),
        initialBalance: asset.value,
        currency: data.currency ?? base.currency,
        color: asset.type === "investment" ? "#0ea5e9" : "#3b82f6",
        icon: asset.type === "investment" ? "IV" : "BK",
        includeInTotal: asset.type !== "investment",
        includeInNetWorth: true,
        institution: undefined,
        notes: "Migrado desde Patrimonio Neto",
        sortOrder: index + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      normalizedAssets = data.assets.filter((asset) => !isAssetMigrableToAccount(asset));
    }
  }

  if (normalizedAccounts.length === 0) {
    normalizedAccounts = base.accounts;
  }

  const defaultAccountId =
    normalizedAccounts.find((account) => account.type !== "credit_card")?.id ?? normalizedAccounts[0].id;

  const normalizedTransactions = Array.isArray(data.transactions)
    ? data.transactions.map((tx) => (tx.accountId ? tx : { ...tx, accountId: defaultAccountId }))
    : base.transactions;

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
    transactions: normalizedTransactions,
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
    accounts: normalizedAccounts,
    accountTransfers: Array.isArray(data.accountTransfers) ? data.accountTransfers : base.accountTransfers,
    accountSortMode: data.accountSortMode ?? base.accountSortMode,
    loans: Array.isArray(data.loans) ? data.loans : base.loans,
    loanPayments: Array.isArray(data.loanPayments) ? data.loanPayments : base.loanPayments,
    assets: normalizedAssets,
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

export const previewBackupJson = (
  jsonText: string,
  currentState: AppDataState,
  mode: BackupImportMode = "merge",
  currencyHint?: CurrencyCode,
): BackupImportPreview => {
  const incoming = importBackupJson(jsonText, currencyHint);
  return buildImportPreview(mode, currentState, incoming);
};

export const importBackupJsonWithMode = (
  jsonText: string,
  currentState: AppDataState,
  mode: BackupImportMode = "replace",
  currencyHint?: CurrencyCode,
): { nextState: AppDataState; preview: BackupImportPreview } => {
  const incoming = importBackupJson(jsonText, currencyHint);
  const preview = buildImportPreview(mode, currentState, incoming);
  const nextState = mode === "replace" ? incoming : mergeStates(currentState, incoming);
  return { nextState, preview };
};
