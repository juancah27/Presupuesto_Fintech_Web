import type { CurrencyCode, PageKey } from "../types";

export const APP_VERSION = 1;
export const STORAGE_KEY_PREFIX = "fintech-budget-manager:v1";

export const CURRENCY_META: Record<CurrencyCode, { symbol: string; locale: string }> = {
  USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "EUR", locale: "es-ES" },
  MXN: { symbol: "$", locale: "es-MX" },
  COP: { symbol: "$", locale: "es-CO" },
  PEN: { symbol: "S/", locale: "es-PE" },
  ARS: { symbol: "$", locale: "es-AR" },
};

export const PAGE_ITEMS: Array<{ key: PageKey; label: string; path: string; icon: string }> = [
  { key: "dashboard", label: "Dashboard", path: "/app/dashboard", icon: "DB" },
  { key: "accounts", label: "Cuentas", path: "/app/accounts", icon: "CT" },
  { key: "loans", label: "Prestamos", path: "/app/loans", icon: "PR" },
  { key: "transactions", label: "Transacciones", path: "/app/transactions", icon: "TX" },
  { key: "budget", label: "Presupuesto", path: "/app/budget", icon: "BG" },
  { key: "categories", label: "Categorias y Fuentes", path: "/app/categories", icon: "CF" },
  { key: "goals", label: "Metas de Ahorro", path: "/app/goals", icon: "MT" },
  { key: "investments", label: "Inversiones", path: "/app/investments", icon: "IN" },
  { key: "debts", label: "Deudas y Pasivos", path: "/app/debts", icon: "DP" },
  { key: "reports", label: "Reportes", path: "/app/reports", icon: "RP" },
  { key: "networth", label: "Patrimonio Neto", path: "/app/networth", icon: "PN" },
  { key: "profile", label: "Perfil y Configuracion", path: "/app/profile", icon: "PF" },
];
