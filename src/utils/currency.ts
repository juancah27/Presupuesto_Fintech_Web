import type { CurrencyCode } from "../types";
import { CURRENCY_META } from "./constants";

export const formatCurrency = (value: number, currency: CurrencyCode): string => {
  const meta = CURRENCY_META[currency];
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value: number, currency: CurrencyCode): string => {
  const locale = CURRENCY_META[currency].locale;
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(value);
};
