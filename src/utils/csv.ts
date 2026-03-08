import type { Account, AccountTransfer, Category, Source, Transaction } from "../types";

const clean = (value: string): string => `"${value.replace(/"/g, '""')}"`;

export const transactionsToCsv = (
  transactions: Transaction[],
  accounts: Account[],
  accountTransfers: AccountTransfer[],
  categories: Category[],
  sources: Source[],
): string => {
  const accountMap = new Map(accounts.map((account) => [account.id, account.name]));
  const transferMap = new Map(accountTransfers.map((transfer) => [transfer.id, transfer]));
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));
  const sourceMap = new Map(sources.map((src) => [src.id, src.name]));
  const header = "id,fecha,tipo,monto,cuenta,categoria,fuente,descripcion,motivo,etiquetas,recurrente";
  const seenTransfers = new Set<string>();
  const seenSplitGroups = new Set<string>();
  const splitGroups = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    if (!tx.splitGroupId) continue;
    splitGroups.set(tx.splitGroupId, [...(splitGroups.get(tx.splitGroupId) ?? []), tx]);
  }

  const rows: string[] = [];
  for (const tx of transactions) {
    if (tx.type === "transfer" && tx.linkedTransferId) {
      if (seenTransfers.has(tx.linkedTransferId)) continue;
      seenTransfers.add(tx.linkedTransferId);

      const transfer = transferMap.get(tx.linkedTransferId);
      const fromId = transfer?.fromAccountId;
      const toId = transfer?.toAccountId;
      const fromName = fromId ? accountMap.get(fromId) ?? fromId : "";
      const toName = toId ? accountMap.get(toId) ?? toId : "";
      const route = fromName && toName ? `${fromName} -> ${toName}` : "";

      rows.push(
        [
          transfer?.id ?? tx.linkedTransferId,
          transfer?.date ?? tx.date,
          "transfer",
          (transfer?.amount ?? tx.amount).toFixed(2),
          clean(route),
          clean(""),
          clean(""),
          clean(transfer?.note?.trim() || tx.description || `Transferencia ${route}`),
          clean("Transferencia entre cuentas"),
          clean("transferencia|cuenta"),
          "no",
        ].join(","),
      );
      continue;
    }

    if (tx.splitGroupId) {
      if (seenSplitGroups.has(tx.splitGroupId)) continue;
      seenSplitGroups.add(tx.splitGroupId);
      const parts = splitGroups.get(tx.splitGroupId) ?? [tx];
      const head = parts[0];
      const totalAmount = parts.reduce((acc, item) => acc + item.amount, 0);
      const accountBreakdown = parts
        .map((part) => {
          const accountName = part.accountId ? accountMap.get(part.accountId) ?? part.accountId : "Cuenta";
          return `${accountName}: ${part.amount.toFixed(2)}`;
        })
        .join(" | ");
      const category = head.categoryId ? categoryMap.get(head.categoryId) ?? "" : "";
      const source = head.sourceId ? sourceMap.get(head.sourceId) ?? "" : "";
      rows.push(
        [
          tx.splitGroupId,
          head.date,
          head.type,
          totalAmount.toFixed(2),
          clean(accountBreakdown),
          clean(category),
          clean(source),
          clean(head.description),
          clean(head.motive),
          clean(head.tags.join("|")),
          head.isRecurring ? "si" : "no",
        ].join(","),
      );
      continue;
    }

    const account = tx.accountId ? accountMap.get(tx.accountId) ?? "" : "";
    const category = tx.categoryId ? categoryMap.get(tx.categoryId) ?? "" : "";
    const source = tx.sourceId ? sourceMap.get(tx.sourceId) ?? "" : "";
    rows.push(
      [
        tx.id,
        tx.date,
        tx.type,
        tx.amount.toFixed(2),
        clean(account),
        clean(category),
        clean(source),
        clean(tx.description),
        clean(tx.motive),
        clean(tx.tags.join("|")),
        tx.isRecurring ? "si" : "no",
      ].join(","),
    );
  }

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
