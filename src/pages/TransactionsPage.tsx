import { Fragment, useMemo, useState } from "react";
import { SplitPaymentEditor, type SplitDraftRow, buildSplitTotals } from "../components/transactions/SplitPaymentEditor";
import { Card } from "../components/ui/Card";
import { useFilteredTransactions } from "../hooks/useFilteredTransactions";
import { useBudgetStore } from "../store/useBudgetStore";
import type { Transaction, TransactionFilters, TransactionType } from "../types";
import { formatCurrency } from "../utils/currency";
import { downloadTextFile, transactionsToCsv } from "../utils/csv";
import { todayISO } from "../utils/date";

const initialFilters = (): TransactionFilters => ({
  query: "",
  type: "all",
  accountId: "all",
  categoryId: "all",
  sourceId: "all",
  minAmount: null,
  maxAmount: null,
  startDate: "",
  endDate: "",
});

const newSplitRow = (): SplitDraftRow => ({
  id: `split-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  accountId: "",
  amount: "",
});

const emptyForm = {
  amount: "",
  type: "expense" as TransactionType,
  accountId: "",
  transferFromAccountId: "",
  transferToAccountId: "",
  transferNote: "",
  splitEnabled: false,
  splitRows: [newSplitRow()],
  categoryId: "",
  subcategoryId: "",
  sourceId: "",
  date: todayISO(),
  description: "",
  motive: "",
  tags: "",
  isRecurring: false,
};

interface GroupedRow {
  key: string;
  representative: Transaction;
  parts: Transaction[];
  totalAmount: number;
  isSplit: boolean;
  isTransfer: boolean;
  splitGroupId?: string;
  transferFromAccountId?: string;
  transferToAccountId?: string;
  transferNote?: string;
}

const SplitBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
      <path d="M4 6h6l2 3h8v2h-8l-2 3H4V6zm2 2v4h3l2-3-2-1H6zm7 5h7v2h-7v-2zm0-6h7v2h-7V7z" />
    </svg>
    Dividido
  </span>
);

const TransferBadge = () => (
  <span className="inline-flex items-center rounded-full bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
    Entre cuentas
  </span>
);

export const TransactionsPage = () => {
  const store = useBudgetStore();
  const {
    currency,
    transactions,
    accountTransfers,
    accounts,
    categories,
    subcategories,
    sources,
    addTransaction,
    addAccountTransfer,
    addSplitExpenseTransaction,
    updateSplitExpenseGroup,
    deleteSplitExpenseGroup,
    updateTransaction,
    deleteTransaction,
  } = store;

  const [filters, setFilters] = useState<TransactionFilters>(initialFilters());
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSplitGroupId, setEditingSplitGroupId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const filtered = useFilteredTransactions(transactions, filters);

  const sourceOptions = useMemo(
    () => sources.filter((src) => src.type === form.type || form.type === "transfer"),
    [sources, form.type],
  );
  const sourceLabel = form.type === "expense" ? "Comercio/Proveedor (opcional)" : "Fuente (opcional)";

  const categoryOptions = useMemo(
    () => (form.type === "expense" ? categories : []),
    [form.type, categories],
  );
  const subcategoryOptions = useMemo(
    () => subcategories.filter((sub) => sub.categoryId === form.categoryId),
    [subcategories, form.categoryId],
  );

  const groupedRows = useMemo<GroupedRow[]>(() => {
    const sorted = [...filtered].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
    const grouped = new Map<string, Transaction[]>();
    for (const tx of sorted) {
      const key =
        tx.splitGroupId ??
        (tx.type === "transfer" && tx.linkedTransferId ? `transfer-${tx.linkedTransferId}` : tx.id);
      if (tx.type === "transfer" && tx.linkedTransferId) {
        const transferParts = transactions.filter((item) => item.linkedTransferId === tx.linkedTransferId);
        grouped.set(key, transferParts.length ? transferParts : [...(grouped.get(key) ?? []), tx]);
      } else {
        grouped.set(key, [...(grouped.get(key) ?? []), tx]);
      }
    }
    const seen = new Set<string>();
    const rows: GroupedRow[] = [];
    for (const tx of sorted) {
      const key =
        tx.splitGroupId ??
        (tx.type === "transfer" && tx.linkedTransferId ? `transfer-${tx.linkedTransferId}` : tx.id);
      if (seen.has(key)) continue;
      seen.add(key);
      const parts = grouped.get(key) ?? [tx];
      const representative = parts[0];
      const isTransfer = representative.type === "transfer" && Boolean(representative.linkedTransferId);
      const transferMeta = isTransfer
        ? accountTransfers.find((item) => item.id === representative.linkedTransferId)
        : undefined;
      const fallbackFrom = parts.find((item) => item.description.startsWith("Transferencia a"))?.accountId;
      const fallbackTo = parts.find((item) => item.description.startsWith("Transferencia desde"))?.accountId;
      rows.push({
        key,
        representative,
        parts,
        totalAmount: isTransfer ? parts[0]?.amount ?? 0 : parts.reduce((acc, item) => acc + item.amount, 0),
        isSplit: Boolean(representative.splitGroupId),
        isTransfer,
        splitGroupId: representative.splitGroupId,
        transferFromAccountId: transferMeta?.fromAccountId ?? fallbackFrom,
        transferToAccountId: transferMeta?.toAccountId ?? fallbackTo,
        transferNote: transferMeta?.note,
      });
    }
    return rows;
  }, [filtered, transactions, accountTransfers]);

  const splitTotals = useMemo(
    () => buildSplitTotals(Number(form.amount || 0), form.splitRows),
    [form.amount, form.splitRows],
  );
  const splitIsExact = splitTotals.status === "exact";

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const amount = Number(form.amount);
    if (!form.amount || amount <= 0) errors.push("Monto debe ser mayor a 0.");
    if (!form.date) errors.push("Fecha obligatoria.");
    if (form.type !== "transfer" && !form.description.trim()) errors.push("Descripcion obligatoria.");
    if (form.type !== "transfer" && !form.motive.trim()) errors.push("Motivo obligatorio.");
    if (form.type === "expense" && !form.categoryId) errors.push("Categoria obligatoria para gastos.");
    if (form.type === "transfer") {
      if (!form.transferFromAccountId || !form.transferToAccountId) {
        errors.push("Selecciona cuenta origen y destino.");
      }
      if (form.transferFromAccountId && form.transferToAccountId && form.transferFromAccountId === form.transferToAccountId) {
        errors.push("Origen y destino deben ser diferentes.");
      }
    }

    if (form.type === "expense" && form.splitEnabled) {
      if (!form.splitRows.length) errors.push("Agrega al menos un medio de pago.");
      if (form.splitRows.some((row) => !row.accountId)) errors.push("Cada fila debe tener cuenta.");
      if (form.splitRows.some((row) => Number(row.amount) <= 0)) errors.push("Cada fila debe tener monto mayor a 0.");
      if (!splitIsExact) errors.push("El total asignado debe coincidir exactamente con el monto.");
    } else if (form.type !== "transfer" && !form.accountId) {
      errors.push("Cuenta obligatoria.");
    }

    return errors;
  }, [form, splitIsExact]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setEditingSplitGroupId(null);
  };

  const handleSubmit = () => {
    if (validationErrors.length > 0) return;
    if (form.type === "transfer") {
      if (editingSplitGroupId) deleteSplitExpenseGroup(editingSplitGroupId);
      if (editingId) deleteTransaction(editingId);
      addAccountTransfer({
        fromAccountId: form.transferFromAccountId,
        toAccountId: form.transferToAccountId,
        amount: Number(form.amount),
        date: form.date,
        note: form.transferNote.trim(),
      });
      resetForm();
      return;
    }

    const common = {
      categoryId: form.categoryId || undefined,
      subcategoryId: form.subcategoryId || undefined,
      sourceId: form.sourceId || undefined,
      date: form.date,
      description: form.description.trim(),
      motive: form.motive.trim(),
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      isRecurring: form.isRecurring,
    };

    if (form.type === "expense" && form.splitEnabled) {
      const splitPayload = {
        totalAmount: Number(form.amount),
        ...common,
        splits: form.splitRows.map((row) => ({
          accountId: row.accountId,
          amount: Number(row.amount),
        })),
      };
      if (editingSplitGroupId) {
        updateSplitExpenseGroup(editingSplitGroupId, splitPayload);
      } else {
        if (editingId) deleteTransaction(editingId);
        addSplitExpenseTransaction(splitPayload);
      }
      resetForm();
      return;
    }

    const payload = {
      amount: Number(form.amount),
      type: form.type,
      accountId: form.accountId,
      ...common,
    };

    if (editingSplitGroupId) {
      deleteSplitExpenseGroup(editingSplitGroupId);
      addTransaction(payload);
      resetForm();
      return;
    }

    if (editingId) {
      updateTransaction(editingId, payload);
      resetForm();
      return;
    }

    addTransaction(payload);
    resetForm();
  };

  const startEditSingle = (tx: Transaction) => {
    if (tx.type === "transfer" && tx.linkedTransferId) {
      const transferMeta = accountTransfers.find((item) => item.id === tx.linkedTransferId);
      const linkedParts = transactions.filter((item) => item.linkedTransferId === tx.linkedTransferId);
      const fallbackFrom = linkedParts.find((item) => item.description.startsWith("Transferencia a"))?.accountId;
      const fallbackTo = linkedParts.find((item) => item.description.startsWith("Transferencia desde"))?.accountId;
      setEditingSplitGroupId(null);
      setEditingId(tx.id);
      setForm({
        amount: String(tx.amount),
        type: "transfer",
        accountId: "",
        transferFromAccountId: transferMeta?.fromAccountId ?? fallbackFrom ?? "",
        transferToAccountId: transferMeta?.toAccountId ?? fallbackTo ?? "",
        transferNote: transferMeta?.note ?? "",
        splitEnabled: false,
        splitRows: [newSplitRow()],
        categoryId: "",
        subcategoryId: "",
        sourceId: "",
        date: tx.date,
        description: "",
        motive: "",
        tags: "",
        isRecurring: false,
      });
      return;
    }

    setEditingSplitGroupId(null);
    setEditingId(tx.id);
    setForm({
      amount: String(tx.amount),
      type: tx.type,
      accountId: tx.accountId ?? "",
      transferFromAccountId: "",
      transferToAccountId: "",
      transferNote: "",
      splitEnabled: false,
      splitRows: [newSplitRow()],
      categoryId: tx.categoryId ?? "",
      subcategoryId: tx.subcategoryId ?? "",
      sourceId: tx.sourceId ?? "",
      date: tx.date,
      description: tx.description,
      motive: tx.motive,
      tags: tx.tags.join(", "),
      isRecurring: tx.isRecurring,
    });
  };

  const startEditSplit = (groupId: string) => {
    const parts = transactions
      .filter((tx) => tx.splitGroupId === groupId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    if (!parts.length) return;
    const head = parts[0];
    setEditingId(null);
    setEditingSplitGroupId(groupId);
    setForm({
      amount: String(parts.reduce((acc, tx) => acc + tx.amount, 0)),
      type: "expense",
      accountId: "",
      transferFromAccountId: "",
      transferToAccountId: "",
      transferNote: "",
      splitEnabled: true,
      splitRows: parts.map((part) => ({
        id: `row-${part.id}`,
        accountId: part.accountId ?? "",
        amount: String(part.amount),
      })),
      categoryId: head.categoryId ?? "",
      subcategoryId: head.subcategoryId ?? "",
      sourceId: head.sourceId ?? "",
      date: head.date,
      description: head.description,
      motive: head.motive,
      tags: head.tags.join(", "),
      isRecurring: head.isRecurring,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[430px_1fr]">
      <Card
        title={
          editingSplitGroupId
            ? "Editar transaccion dividida"
            : editingId
              ? "Editar transaccion"
              : "Nueva transaccion"
        }
      >
        <div className="space-y-2">
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            placeholder="Monto"
            type="number"
            value={form.amount}
            onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
          />
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            value={form.type}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                type: event.target.value as TransactionType,
                categoryId: "",
                subcategoryId: "",
                splitEnabled: event.target.value === "expense" ? prev.splitEnabled : false,
                accountId: event.target.value === "transfer" ? "" : prev.accountId,
              }))
            }
          >
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="investment">Inversion</option>
            <option value="transfer">Transferencia</option>
          </select>

          {form.type === "expense" ? (
            <SplitPaymentEditor
              enabled={form.splitEnabled}
              totalAmount={Number(form.amount || 0)}
              currency={currency}
              accounts={accounts}
              rows={form.splitRows}
              onToggle={(next) =>
                setForm((prev) => ({
                  ...prev,
                  splitEnabled: next,
                  splitRows: next && prev.splitRows.length === 0 ? [newSplitRow()] : prev.splitRows,
                }))
              }
              onRowsChange={(rows) => setForm((prev) => ({ ...prev, splitRows: rows }))}
            />
          ) : null}

          {form.type === "transfer" ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                value={form.transferFromAccountId}
                onChange={(event) => setForm((prev) => ({ ...prev, transferFromAccountId: event.target.value }))}
              >
                <option value="">Cuenta origen</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                value={form.transferToAccountId}
                onChange={(event) => setForm((prev) => ({ ...prev, transferToAccountId: event.target.value }))}
              >
                <option value="">Cuenta destino</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <input
                className="sm:col-span-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                placeholder="Nota de transferencia (opcional)"
                value={form.transferNote}
                onChange={(event) => setForm((prev) => ({ ...prev, transferNote: event.target.value }))}
              />
            </div>
          ) : !(form.type === "expense" && form.splitEnabled) ? (
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
              value={form.accountId}
              onChange={(event) => setForm((prev) => ({ ...prev, accountId: event.target.value }))}
            >
              <option value="">Seleccionar cuenta</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          ) : null}

          {form.type === "expense" && (
            <>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                value={form.categoryId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, categoryId: event.target.value, subcategoryId: "" }))
                }
              >
                <option value="">Seleccionar categoria</option>
                {categoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                value={form.subcategoryId}
                onChange={(event) => setForm((prev) => ({ ...prev, subcategoryId: event.target.value }))}
              >
                <option value="">Subcategoria (opcional)</option>
                {subcategoryOptions.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {form.type !== "transfer" ? (
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
              value={form.sourceId}
              onChange={(event) => setForm((prev) => ({ ...prev, sourceId: event.target.value }))}
            >
              <option value="">{sourceLabel}</option>
              {sourceOptions.map((src) => (
                <option key={src.id} value={src.id}>
                  {src.name}
                </option>
              ))}
            </select>
          ) : null}

          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            type="date"
            value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
          />
          {form.type !== "transfer" ? (
            <>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                placeholder="Descripcion"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                placeholder="Motivo"
                value={form.motive}
                onChange={(event) => setForm((prev) => ({ ...prev, motive: event.target.value }))}
              />
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                placeholder="Etiquetas separadas por coma"
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(event) => setForm((prev) => ({ ...prev, isRecurring: event.target.checked }))}
                />
                Es recurrente
              </label>
            </>
          ) : null}

          {validationErrors.length > 0 && (
            <ul className="space-y-1 text-xs text-expense">
              {validationErrors.map((error) => (
                <li key={error}>- {error}</li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={validationErrors.length > 0}
              className="rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingSplitGroupId || editingId ? "Guardar cambios" : "Agregar"}
            </button>
            {(editingId || editingSplitGroupId) && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/20"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card title="Listado de transacciones" subtitle="Filtros y buscador en tiempo real">
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-4">
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            placeholder="Buscar"
            value={filters.query}
            onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
          />
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            value={filters.type}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, type: event.target.value as TransactionFilters["type"] }))
            }
          >
            <option value="all">Todos los tipos</option>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="investment">Inversion</option>
            <option value="transfer">Transferencia</option>
          </select>
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            value={filters.accountId}
            onChange={(event) => setFilters((prev) => ({ ...prev, accountId: event.target.value }))}
          >
            <option value="all">Todas las cuentas</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            value={filters.categoryId}
            onChange={(event) => setFilters((prev) => ({ ...prev, categoryId: event.target.value }))}
          >
            <option value="all">Todas las categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            value={filters.sourceId}
            onChange={(event) => setFilters((prev) => ({ ...prev, sourceId: event.target.value }))}
          >
            <option value="all">Todas las fuentes</option>
            {sources.map((src) => (
              <option key={src.id} value={src.id}>
                {src.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            type="date"
            value={filters.startDate}
            onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            type="date"
            value={filters.endDate}
            onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            type="number"
            placeholder="Monto minimo"
            value={filters.minAmount ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                minAmount: event.target.value ? Number(event.target.value) : null,
              }))
            }
          />
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            type="number"
            placeholder="Monto maximo"
            value={filters.maxAmount ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                maxAmount: event.target.value ? Number(event.target.value) : null,
              }))
            }
          />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">{groupedRows.length} resultados</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilters(initialFilters())}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-white/20"
            >
              Limpiar filtros
            </button>
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  "transacciones.csv",
                  transactionsToCsv(filtered, accounts, accountTransfers, categories, sources),
                  "text/csv;charset=utf-8",
                )
              }
              className="rounded-lg bg-income px-2 py-1 text-xs font-semibold text-white"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="max-h-[620px] overflow-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-xs uppercase dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Monto</th>
                <th className="px-3 py-2">Cuenta(s)</th>
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2">Fuente</th>
                <th className="px-3 py-2">Descripcion</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.map((row) => {
                const expanded = expandedGroups[row.key] ?? false;
                const fromName = accounts.find((account) => account.id === row.transferFromAccountId)?.name ?? "Origen";
                const toName = accounts.find((account) => account.id === row.transferToAccountId)?.name ?? "Destino";
                const accountLabel = row.isTransfer
                  ? `${fromName} -> ${toName}`
                  : row.isSplit
                    ? `${row.parts.length} medios`
                    : accounts.find((account) => account.id === row.representative.accountId)?.name ?? "-";
                return (
                  <Fragment key={row.key}>
                    <tr key={row.key} className="border-t border-slate-200 dark:border-white/10">
                      <td className="px-3 py-2">{row.representative.date}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span>{row.representative.type}</span>
                          {row.isTransfer ? <TransferBadge /> : null}
                          {row.isSplit ? <SplitBadge /> : null}
                        </div>
                      </td>
                      <td className="px-3 py-2">{formatCurrency(row.totalAmount, currency)}</td>
                      <td className="px-3 py-2">{accountLabel}</td>
                      <td className="px-3 py-2">
                        {row.isTransfer ? "-" : categories.find((cat) => cat.id === row.representative.categoryId)?.name ?? "-"}
                      </td>
                      <td className="px-3 py-2">
                        {row.isTransfer ? "-" : sources.find((src) => src.id === row.representative.sourceId)?.name ?? "-"}
                      </td>
                      <td className="px-3 py-2">{row.isTransfer ? row.transferNote || `${fromName} -> ${toName}` : row.representative.description}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {row.isSplit ? (
                            <button
                              type="button"
                              className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-white/20"
                              onClick={() =>
                                setExpandedGroups((prev) => ({ ...prev, [row.key]: !prev[row.key] }))
                              }
                            >
                              {expanded ? "Ocultar" : "Ver detalle"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-white/20"
                            onClick={() =>
                              row.isSplit && row.splitGroupId
                                ? startEditSplit(row.splitGroupId)
                                : startEditSingle(row.representative)
                            }
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="rounded border border-red-300 px-2 py-1 text-xs text-expense"
                            onClick={() =>
                              row.isSplit && row.splitGroupId
                                ? deleteSplitExpenseGroup(row.splitGroupId)
                                : deleteTransaction(row.representative.id)
                            }
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                    {row.isSplit && expanded ? (
                      <tr className="border-t border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/40">
                        <td colSpan={8} className="px-3 py-2">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {row.parts.map((part) => (
                              <div
                                key={part.id}
                                className="flex items-center justify-between rounded-lg bg-white p-2 text-xs dark:bg-slate-800"
                              >
                                <span>
                                  {accounts.find((account) => account.id === part.accountId)?.name ?? "Cuenta"}
                                </span>
                                <span>{formatCurrency(part.amount, currency)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
              {groupedRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                    No hay resultados con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
