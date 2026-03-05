export type ThemeMode = "dark" | "light";

export type CurrencyCode = "USD" | "EUR" | "MXN" | "COP" | "PEN" | "ARS";
export type LanguageCode = "es" | "en";

export type PageKey =
  | "dashboard"
  | "loans"
  | "transactions"
  | "budget"
  | "categories"
  | "goals"
  | "investments"
  | "debts"
  | "reports"
  | "networth"
  | "profile";

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

export type DebtType =
  | "personal_loan"
  | "credit_card"
  | "mortgage"
  | "auto"
  | "student"
  | "family_friend"
  | "other";

export type DebtPriority = "high" | "medium" | "low";

export interface Debt {
  id: string;
  creditor: string;
  debtType: DebtType;
  originalAmount: number;
  remainingBalance: number;
  hasInterest: boolean;
  interestRate: number;
  annualInterestRate: number;
  monthlyPayment: number;
  dueDayOfMonth: number;
  isKnownPerson: boolean;
  knownPersonName?: string;
  knownPersonRelation?: LoanRelation;
  priority: DebtPriority;
  color: string;
  icon: string;
  notes: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export type LoanRelation = "family" | "friend" | "coworker" | "other";
export type LoanMethod = "cash" | "transfer" | "card";
export type LoanInterestType = "monthly" | "annual";
export type LoanStatus = "active" | "partial" | "paid" | "overdue" | "uncollectible";

export interface LoanRecord {
  id: string;
  personName: string;
  relation: LoanRelation;
  principalAmount: number;
  lentDate: string;
  dueDate?: string;
  hasInterest: boolean;
  interestRate?: number;
  interestType?: LoanInterestType;
  lendingMethod: LoanMethod;
  notes: string;
  receipt: string;
  statusOverride: "uncollectible" | null;
  uncollectibleNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  method: LoanMethod;
  note: string;
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  method: LoanMethod;
  note: string;
  isExtra: boolean;
  createdAt: string;
}

export interface DebtHistoryPoint {
  id: string;
  month: string;
  totalRemaining: number;
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
  debtPayments: DebtPayment[];
  debtHistory: DebtHistoryPoint[];
  loans: LoanRecord[];
  loanPayments: LoanPayment[];
  assets: Asset[];
  liabilities: Liability[];
  netWorthHistory: NetWorthPoint[];
}

export interface SelectOption {
  label: string;
  value: string;
}
