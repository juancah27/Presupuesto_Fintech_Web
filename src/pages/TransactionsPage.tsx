import { useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { useBudgetStore } from "../store/useBudgetStore";
import type { Transaction, TransactionFilters, TransactionType } from "../types";
import { formatCurrency } from "../utils/currency";
import { transactionsToCsv, downloadTextFile } from "../utils/csv";
import { todayISO } from "../utils/date";
import { useFilteredTransactions } from "../hooks/useFilteredTransactions";

const initialFilters = (): TransactionFilters => ({
  query: "",
  type: "all",
  categoryId: "all",
  sourceId: "all",
  minAmount: null,
  maxAmount: null,
  startDate: "",
  endDate: "",
});

const emptyForm = {
  amount: "",
  type: "expense" as TransactionType,
  categoryId: "",
  subcategoryId: "",
  sourceId: "",
  date: todayISO(),
  description: "",
  motive: "",
  tags: "",
  isRecurring: false,
};

export const TransactionsPage = () => {
  const store = useBudgetStore();
  const {
    currency,
    transactions,
    categories,
    subcategories,
    sources,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = store;

  const [filters, setFilters] = useState<TransactionFilters>(initialFilters());
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useFilteredTransactions(transactions, filters);

  const sourceOptions = useMemo(
    () => sources.filter((src) => src.type === form.type || form.type === "transfer"),
    [sources, form.type],
  );

  const categoryOptions = useMemo(
    () => (form.type === "expense" ? categories : []),
    [form.type, categories],
  );
  const subcategoryOptions = useMemo(
    () => subcategories.filter((sub) => sub.categoryId === form.categoryId),
    [subcategories, form.categoryId],
  );

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!form.amount || Number(form.amount) <= 0) errors.push("Monto debe ser mayor a 0.");
    if (!form.date) errors.push("Fecha obligatoria.");
    if (!form.description.trim()) errors.push("Descripcion obligatoria.");
    if (!form.motive.trim()) errors.push("Motivo obligatorio.");
    if (form.type === "expense" && !form.categoryId) errors.push("Categoria obligatoria para gastos.");
    return errors;
  }, [form]);

  const handleSubmit = () => {
    if (validationErrors.length > 0) return;
    const payload = {
      amount: Number(form.amount),
      type: form.type,
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

    if (editingId) {
      updateTransaction(editingId, payload);
      setEditingId(null);
    } else {
      addTransaction(payload);
    }
    setForm(emptyForm);
  };

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setForm({
      amount: String(tx.amount),
      type: tx.type,
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

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[430px_1fr]">
      <Card title={editingId ? "Editar transaccion" : "Nueva transaccion"}>
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
              }))
            }
          >
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="investment">Inversion</option>
            <option value="transfer">Transferencia</option>
          </select>

          {form.type === "expense" && (
            <>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                value={form.categoryId}
                onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value, subcategoryId: "" }))}
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

          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            value={form.sourceId}
            onChange={(event) => setForm((prev) => ({ ...prev, sourceId: event.target.value }))}
          >
            <option value="">Fuente (opcional)</option>
            {sourceOptions.map((src) => (
              <option key={src.id} value={src.id}>
                {src.name}
              </option>
            ))}
          </select>

          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            type="date"
            value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
          />
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
              className="rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white"
            >
              {editingId ? "Guardar cambios" : "Agregar"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
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
            onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value as TransactionFilters["type"] }))}
          >
            <option value="all">Todos los tipos</option>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="investment">Inversion</option>
            <option value="transfer">Transferencia</option>
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
              setFilters((prev) => ({ ...prev, minAmount: event.target.value ? Number(event.target.value) : null }))
            }
          />
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            type="number"
            placeholder="Monto maximo"
            value={filters.maxAmount ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, maxAmount: event.target.value ? Number(event.target.value) : null }))
            }
          />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} resultados</p>
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
                  transactionsToCsv(filtered, categories, sources),
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
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2">Fuente</th>
                <th className="px-3 py-2">Descripcion</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id} className="border-t border-slate-200 dark:border-white/10">
                  <td className="px-3 py-2">{tx.date}</td>
                  <td className="px-3 py-2">{tx.type}</td>
                  <td className="px-3 py-2">{formatCurrency(tx.amount, currency)}</td>
                  <td className="px-3 py-2">{categories.find((cat) => cat.id === tx.categoryId)?.name ?? "-"}</td>
                  <td className="px-3 py-2">{sources.find((src) => src.id === tx.sourceId)?.name ?? "-"}</td>
                  <td className="px-3 py-2">{tx.description}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-white/20"
                        onClick={() => startEdit(tx)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-300 px-2 py-1 text-xs text-expense"
                        onClick={() => deleteTransaction(tx.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
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
