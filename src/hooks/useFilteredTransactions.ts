import { useMemo } from "react";
import type { Transaction, TransactionFilters } from "../types";

const contains = (source: string, query: string): boolean =>
  source.toLowerCase().includes(query.toLowerCase());

export const useFilteredTransactions = (
  transactions: Transaction[],
  filters: TransactionFilters,
): Transaction[] =>
  useMemo(() => {
    return transactions.filter((tx) => {
      if (filters.type !== "all" && tx.type !== filters.type) return false;
      if (filters.categoryId !== "all" && tx.categoryId !== filters.categoryId) return false;
      if (filters.sourceId !== "all" && tx.sourceId !== filters.sourceId) return false;
      if (filters.minAmount !== null && tx.amount < filters.minAmount) return false;
      if (filters.maxAmount !== null && tx.amount > filters.maxAmount) return false;
      if (filters.startDate && tx.date < filters.startDate) return false;
      if (filters.endDate && tx.date > filters.endDate) return false;

      const searchable = `${tx.description} ${tx.motive} ${tx.tags.join(" ")}`;
      if (filters.query && !contains(searchable, filters.query)) return false;
      return true;
    });
  }, [transactions, filters]);
