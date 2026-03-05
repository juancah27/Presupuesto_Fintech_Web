export type ThemeMode = "dark" | "light";

export type CurrencyCode = "USD" | "EUR" | "MXN" | "COP" | "PEN" | "ARS";

export type PageKey =
  | "dashboard"
  | "transactions"
  | "budget"
  | "categories"
  | "goals"
  | "investments"
  | "debts"
  | "reports"
  | "networth"
  | "settings";

export type TransactionType = "income" | "expense" | "investment" | "transfer";

export type CategoryKind = "fixed" | "variable";

export type RuleBucket = "needs" | "wants" | "none";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  ruleBucket: RuleBucket;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
}

export type SourceType = "income" | "expense" | "investment" | "transfer";

export interface Source {
  id: string;
  type: SourceType;
  name: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId?: string;
  subcategoryId?: string;
  sourceId?: string;
  date: string;
  description: string;
  motive: string;
  tags: string[];
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyBudget {
  id: string;
  month: string;
  categoryId: string;
  limit: number;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  date: string;
  amount: number;
}

export type GoalPriority = "low" | "medium" | "high";

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  deadline: string;
  accountName: string;
  priority: GoalPriority;
  createdAt: string;
}

export type InvestmentType = "stocks" | "crypto" | "fund" | "real_estate" | "bond" | "other";

export interface InvestmentSnapshot {
  id: string;
  investmentId: string;
  date: string;
  value: number;
}

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  capitalInvested: number;
  currentValue: number;
  startDate: string;
}

export interface Debt {
  id: string;
  creditor: string;
  originalAmount: number;
  remainingBalance: number;
  interestRate: number;
  monthlyPayment: number;
  endDate: string;
}

export type AssetType = "bank" | "investment" | "property" | "vehicle" | "other";
export type LiabilityType = "debt" | "mortgage" | "loan" | "other";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  value: number;
}

export interface Liability {
  id: string;
  name: string;
  type: LiabilityType;
  value: number;
}

export interface NetWorthPoint {
  id: string;
  month: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface TransactionFilters {
  query: string;
  type: TransactionType | "all";
  categoryId: string | "all";
  sourceId: string | "all";
  minAmount: number | null;
  maxAmount: number | null;
  startDate: string;
  endDate: string;
}

export interface AppDataState {
  version: number;
  theme: ThemeMode;
  currency: CurrencyCode;
  activePage: PageKey;
  sidebarCollapsed: boolean;
  categories: Category[];
  subcategories: Subcategory[];
  sources: Source[];
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  goals: SavingsGoal[];
  goalContributions: GoalContribution[];
  investments: Investment[];
  investmentSnapshots: InvestmentSnapshot[];
  debts: Debt[];
  assets: Asset[];
  liabilities: Liability[];
  netWorthHistory: NetWorthPoint[];
}

export interface SelectOption {
  label: string;
  value: string;
}
