import type { CurrencyCode, PageKey } from "../types";

export const APP_VERSION = 1;
export const STORAGE_KEY = "fintech-budget-manager:v1";

export const CURRENCY_META: Record<CurrencyCode, { symbol: string; locale: string }> = {
  USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "EUR", locale: "es-ES" },
  MXN: { symbol: "$", locale: "es-MX" },
  COP: { symbol: "$", locale: "es-CO" },
  PEN: { symbol: "S/", locale: "es-PE" },
  ARS: { symbol: "$", locale: "es-AR" },
};

export const PAGE_ITEMS: Array<{ key: PageKey; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "transactions", label: "Transacciones" },
  { key: "budget", label: "Presupuesto" },
  { key: "categories", label: "Categorias y Fuentes" },
  { key: "goals", label: "Metas de Ahorro" },
  { key: "investments", label: "Inversiones" },
  { key: "debts", label: "Deudas y Pasivos" },
  { key: "reports", label: "Reportes" },
  { key: "networth", label: "Patrimonio Neto" },
  { key: "settings", label: "Backup y Ajustes" },
];
