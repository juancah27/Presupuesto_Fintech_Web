import type { Account, CurrencyCode } from "../../types";
import { formatCurrency } from "../../utils/currency";

export interface SplitDraftRow {
  id: string;
  accountId: string;
  amount: string;
}

export type SplitStatus = "under" | "exact" | "over";

export interface SplitTotals {
  assigned: number;
  difference: number;
  status: SplitStatus;
}

const toNumber = (value: string): number => Number(value || 0);

export const buildSplitTotals = (totalAmount: number, rows: SplitDraftRow[]): SplitTotals => {
  const assigned = Number(
    rows.reduce((acc, row) => acc + Math.max(toNumber(row.amount), 0), 0).toFixed(2),
  );
  const difference = Number((totalAmount - assigned).toFixed(2));
  if (Math.abs(difference) <= 0.01) return { assigned, difference: 0, status: "exact" };
  if (difference > 0) return { assigned, difference, status: "under" };
  return { assigned, difference: Math.abs(difference), status: "over" };
};

const progressColor = (status: SplitStatus, assigned: number, totalAmount: number) => {
  if (status === "exact") return "bg-income";
  if (status === "over") return "bg-expense";
  if (totalAmount > 0 && assigned / totalAmount >= 0.8) return "bg-warning";
  return "bg-expense";
};

interface SplitPaymentEditorProps {
  enabled: boolean;
  totalAmount: number;
  currency: CurrencyCode;
  accounts: Account[];
  rows: SplitDraftRow[];
  onToggle: (next: boolean) => void;
  onRowsChange: (rows: SplitDraftRow[]) => void;
}

export const SplitPaymentEditor = ({
  enabled,
  totalAmount,
  currency,
  accounts,
  rows,
  onToggle,
  onRowsChange,
}: SplitPaymentEditorProps) => {
  const totals = buildSplitTotals(totalAmount, rows);
  const progress = totalAmount > 0 ? Math.min((totals.assigned / totalAmount) * 100, 100) : 0;

  const addRow = () =>
    onRowsChange([
      ...rows,
      {
        id: `split-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        accountId: "",
        amount: "",
      },
    ]);

  const removeRow = (id: string) => onRowsChange(rows.filter((row) => row.id !== id));

  const updateRow = (id: string, patch: Partial<SplitDraftRow>) =>
    onRowsChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(event) => onToggle(event.target.checked)} />
        Pago dividido
      </label>

      {enabled ? (
        <div className="space-y-2 rounded-xl border border-slate-300 p-2 dark:border-white/20">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-1 gap-2 rounded-lg bg-slate-100 p-2 animate-fade-in dark:bg-slate-800 sm:grid-cols-[1fr_140px_auto]"
            >
              <select
                value={row.accountId}
                onChange={(event) => updateRow(row.id, { accountId: event.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
              >
                <option value="">Cuenta</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Monto"
                value={row.amount}
                onChange={(event) => updateRow(row.id, { amount: event.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="inline-flex items-center justify-center rounded-lg border border-red-300 px-2 py-2 text-xs text-expense"
                aria-label="Eliminar fila"
                title="Eliminar fila"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z" />
                </svg>
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/20"
          >
            + Agregar medio de pago
          </button>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total asignado: {formatCurrency(totals.assigned, currency)} de{" "}
            {formatCurrency(Math.max(totalAmount, 0), currency)}
          </p>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className={`h-full transition-all ${progressColor(totals.status, totals.assigned, totalAmount)}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {totals.status === "under" ? (
            <p className="text-xs font-semibold text-expense">
              Falta asignar {formatCurrency(totals.difference, currency)}
            </p>
          ) : null}
          {totals.status === "over" ? (
            <p className="text-xs font-semibold text-expense">
              Te pasaste por {formatCurrency(totals.difference, currency)}
            </p>
          ) : null}
          {totals.status === "exact" ? (
            <p className="text-xs font-semibold text-income">Asignacion completa.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
