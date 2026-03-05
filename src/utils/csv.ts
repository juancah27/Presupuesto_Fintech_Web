import type { Category, Source, Transaction } from "../types";

const clean = (value: string): string => `"${value.replace(/"/g, '""')}"`;

export const transactionsToCsv = (
  transactions: Transaction[],
  categories: Category[],
  sources: Source[],
): string => {
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));
  const sourceMap = new Map(sources.map((src) => [src.id, src.name]));
  const header =
    "id,fecha,tipo,monto,categoria,fuente,descripcion,motivo,etiquetas,recurrente";

  const rows = transactions.map((tx) => {
    const category = tx.categoryId ? categoryMap.get(tx.categoryId) ?? "" : "";
    const source = tx.sourceId ? sourceMap.get(tx.sourceId) ?? "" : "";
    return [
      tx.id,
      tx.date,
      tx.type,
      tx.amount.toFixed(2),
      clean(category),
      clean(source),
      clean(tx.description),
      clean(tx.motive),
      clean(tx.tags.join("|")),
      tx.isRecurring ? "si" : "no",
    ].join(",");
  });

  return [header, ...rows].join("\n");
};

export const downloadTextFile = (fileName: string, content: string, mime: string): void => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};
