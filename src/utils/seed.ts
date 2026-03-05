import type {
  AppDataState,
  Asset,
  Category,
  Debt,
  GoalContribution,
  Investment,
  InvestmentSnapshot,
  Liability,
  MonthlyBudget,
  SavingsGoal,
  Source,
  Subcategory,
  Transaction,
} from "../types";
import { makeId } from "./id";
import { getCurrentMonthKey, nowISO, todayISO } from "./date";
import { APP_VERSION } from "./constants";

const currentDate = todayISO();
const month = getCurrentMonthKey();

const categories: Category[] = [
  { id: makeId("cat"), name: "Vivienda", icon: "HOME", color: "#fb7185", kind: "fixed", ruleBucket: "needs" },
  { id: makeId("cat"), name: "Alimentacion", icon: "FOOD", color: "#22c55e", kind: "variable", ruleBucket: "needs" },
  { id: makeId("cat"), name: "Transporte", icon: "CAR", color: "#60a5fa", kind: "fixed", ruleBucket: "needs" },
  { id: makeId("cat"), name: "Ocio", icon: "FUN", color: "#f59e0b", kind: "variable", ruleBucket: "wants" },
  { id: makeId("cat"), name: "Suscripciones", icon: "TV", color: "#a78bfa", kind: "fixed", ruleBucket: "wants" },
];

const subcategories: Subcategory[] = [
  { id: makeId("sub"), categoryId: categories[0].id, name: "Alquiler" },
  { id: makeId("sub"), categoryId: categories[1].id, name: "Supermercado" },
  { id: makeId("sub"), categoryId: categories[2].id, name: "Combustible" },
  { id: makeId("sub"), categoryId: categories[3].id, name: "Salidas" },
  { id: makeId("sub"), categoryId: categories[4].id, name: "Streaming" },
];

const sources: Source[] = [
  { id: makeId("src"), name: "Salario", type: "income" },
  { id: makeId("src"), name: "Freelance", type: "income" },
  { id: makeId("src"), name: "Tarjeta Principal", type: "expense" },
  { id: makeId("src"), name: "Cuenta Ahorros", type: "expense" },
  { id: makeId("src"), name: "Broker", type: "investment" },
];

const transactions: Transaction[] = [
  {
    id: makeId("tx"),
    amount: 5200,
    type: "income",
    date: currentDate,
    description: "Pago mensual",
    motive: "Salario",
    tags: ["trabajo"],
    isRecurring: true,
    sourceId: sources[0].id,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: makeId("tx"),
    amount: 850,
    type: "expense",
    categoryId: categories[0].id,
    subcategoryId: subcategories[0].id,
    sourceId: sources[2].id,
    date: currentDate,
    description: "Renta mensual",
    motive: "Alquiler",
    tags: ["hogar", "fijo"],
    isRecurring: true,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: makeId("tx"),
    amount: 400,
    type: "expense",
    categoryId: categories[1].id,
    subcategoryId: subcategories[1].id,
    sourceId: sources[3].id,
    date: currentDate,
    description: "Compra del mes",
    motive: "Supermercado",
    tags: ["comida"],
    isRecurring: false,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: makeId("tx"),
    amount: 300,
    type: "investment",
    sourceId: sources[4].id,
    date: currentDate,
    description: "Aporte ETF",
    motive: "Inversion periodica",
    tags: ["etf"],
    isRecurring: true,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
];

const budgets: MonthlyBudget[] = [
  { id: makeId("bud"), month, categoryId: categories[0].id, limit: 900 },
  { id: makeId("bud"), month, categoryId: categories[1].id, limit: 500 },
  { id: makeId("bud"), month, categoryId: categories[3].id, limit: 250 },
];

const goals: SavingsGoal[] = [
  {
    id: makeId("goal"),
    name: "Fondo de emergencia",
    targetAmount: 5000,
    deadline: `${new Date().getFullYear()}-12-31`,
    accountName: "Cuenta Ahorros",
    priority: "high",
    createdAt: nowISO(),
  },
];

const goalContributions: GoalContribution[] = [
  { id: makeId("contrib"), goalId: goals[0].id, amount: 800, date: currentDate },
];

const investments: Investment[] = [
  {
    id: makeId("inv"),
    name: "ETF SP500",
    type: "fund",
    capitalInvested: 2500,
    currentValue: 2780,
    startDate: `${new Date().getFullYear()}-01-15`,
  },
  {
    id: makeId("inv"),
    name: "BTC",
    type: "crypto",
    capitalInvested: 900,
    currentValue: 1020,
    startDate: `${new Date().getFullYear()}-02-10`,
  },
];

const investmentSnapshots: InvestmentSnapshot[] = investments.map((inv) => ({
  id: makeId("snap"),
  investmentId: inv.id,
  date: currentDate,
  value: inv.currentValue,
}));

const debts: Debt[] = [
  {
    id: makeId("debt"),
    creditor: "Banco Local",
    originalAmount: 12000,
    remainingBalance: 7800,
    interestRate: 18,
    monthlyPayment: 420,
    endDate: `${new Date().getFullYear() + 2}-08-01`,
  },
];

const assets: Asset[] = [
  { id: makeId("asset"), name: "Cuenta Principal", type: "bank", value: 3200 },
  { id: makeId("asset"), name: "Portafolio", type: "investment", value: 3800 },
  { id: makeId("asset"), name: "Vehiculo", type: "vehicle", value: 6000 },
];

const liabilities: Liability[] = [
  { id: makeId("liab"), name: "Prestamo personal", type: "loan", value: 7800 },
];

export const createSeedData = (): AppDataState => ({
  version: APP_VERSION,
  theme: "dark",
  currency: "PEN",
  activePage: "dashboard",
  sidebarCollapsed: false,
  categories,
  subcategories,
  sources,
  transactions,
  budgets,
  goals,
  goalContributions,
  investments,
  investmentSnapshots,
  debts,
  assets,
  liabilities,
  netWorthHistory: [],
});
