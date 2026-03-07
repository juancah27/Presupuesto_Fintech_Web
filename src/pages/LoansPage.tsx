import { useEffect, useMemo, useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useBudgetStore } from "../store/useBudgetStore";
import type { LoanInterestType, LoanMethod, LoanRelation, LoanStatus } from "../types";
import { formatCurrency } from "../utils/currency";
import { todayISO } from "../utils/date";
import { computeLoanNumbers, resolveLoanStatus } from "../utils/loans";

const relationLabels: Record<LoanRelation, string> = {
  family: "Familiar",
  friend: "Amigo",
  coworker: "Companero de trabajo",
  other: "Otro",
};

const methodLabels: Record<LoanMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
};

const statusMeta: Record<LoanStatus, { label: string; tone: "warning" | "info" | "success" | "danger" | "neutral" }> = {
  active: { label: "Activo", tone: "warning" },
  partial: { label: "Pagado parcialmente", tone: "info" },
  paid: { label: "Pagado completo", tone: "success" },
  overdue: { label: "Vencido", tone: "danger" },
  uncollectible: { label: "Incobrable", tone: "neutral" },
};

const avatarColors = [
  "bg-cyan-500/20 text-cyan-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-blue-500/20 text-blue-300",
  "bg-amber-500/20 text-amber-300",
  "bg-rose-500/20 text-rose-300",
];

const colorFromName = (name: string): string => {
  const hash = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const LoansPage = () => {
  const currency = useBudgetStore((state) => state.currency);
  const loans = useBudgetStore((state) => state.loans);
  const loanPayments = useBudgetStore((state) => state.loanPayments);
  const accounts = useBudgetStore((state) => state.accounts);
  const addLoan = useBudgetStore((state) => state.addLoan);
  const addLoanPayment = useBudgetStore((state) => state.addLoanPayment);
  const markLoanUncollectible = useBudgetStore((state) => state.markLoanUncollectible);
  const deleteLoan = useBudgetStore((state) => state.deleteLoan);

  const [statusFilter, setStatusFilter] = useState<LoanStatus | "all">("all");
  const [personFilter, setPersonFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [query, setQuery] = useState("");

  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [newLoan, setNewLoan] = useState({
    personName: "",
    relation: "friend" as LoanRelation,
    principalAmount: "",
    lentDate: todayISO(),
    dueDate: "",
    hasInterest: false,
    interestRate: "",
    interestType: "monthly" as LoanInterestType,
    lendingMethod: "transfer" as LoanMethod,
    notes: "",
    receipt: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: todayISO(),
    method: "transfer" as LoanMethod,
    note: "",
  });
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [uncollectibleNote, setUncollectibleNote] = useState("");

  const loansWithMeta = useMemo(
    () =>
      loans.map((loan) => {
        const numbers = computeLoanNumbers(loan, loanPayments);
        const status = resolveLoanStatus(loan, loanPayments);
        return { loan, status, ...numbers };
      }),
    [loans, loanPayments],
  );

  const filteredLoans = useMemo(
    () =>
      loansWithMeta
        .filter((item) => (statusFilter === "all" ? true : item.status === statusFilter))
        .filter((item) => (personFilter === "all" ? true : item.loan.personName === personFilter))
        .filter((item) => (dateFrom ? item.loan.lentDate >= dateFrom : true))
        .filter((item) => (dateTo ? item.loan.lentDate <= dateTo : true))
        .filter((item) =>
          query.trim()
            ? `${item.loan.personName} ${item.loan.notes} ${item.loan.receipt}`
                .toLowerCase()
                .includes(query.trim().toLowerCase())
            : true,
        )
        .sort((a, b) => b.loan.createdAt.localeCompare(a.loan.createdAt)),
    [loansWithMeta, statusFilter, personFilter, dateFrom, dateTo, query],
  );

  useEffect(() => {
    if (!filteredLoans.length) {
      setSelectedLoanId(null);
      return;
    }
    if (!selectedLoanId || !filteredLoans.some((item) => item.loan.id === selectedLoanId)) {
      setSelectedLoanId(filteredLoans[0].loan.id);
    }
  }, [filteredLoans, selectedLoanId]);

  const selectedLoanMeta = filteredLoans.find((item) => item.loan.id === selectedLoanId) ?? null;
  const selectedLoan = selectedLoanMeta?.loan ?? null;

  const selectedPayments = useMemo(
    () =>
      selectedLoan
        ? loanPayments
            .filter((item) => item.loanId === selectedLoan.id)
            .sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [selectedLoan, loanPayments],
  );

  const personOptions = useMemo(
    () => [...new Set(loans.map((item) => item.personName).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [loans],
  );

  const submitLoan = () => {
    if (!newLoan.personName.trim()) return;
    const amount = Number(newLoan.principalAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    addLoan({
      personName: newLoan.personName.trim(),
      relation: newLoan.relation,
      principalAmount: amount,
      lentDate: newLoan.lentDate,
      dueDate: newLoan.dueDate || undefined,
      hasInterest: newLoan.hasInterest,
      interestRate: newLoan.hasInterest ? Number(newLoan.interestRate || 0) : undefined,
      interestType: newLoan.hasInterest ? newLoan.interestType : undefined,
      lendingMethod: newLoan.lendingMethod,
      notes: newLoan.notes.trim(),
      receipt: newLoan.receipt.trim(),
    });
    setNewLoan({
      personName: "",
      relation: "friend",
      principalAmount: "",
      lentDate: todayISO(),
      dueDate: "",
      hasInterest: false,
      interestRate: "",
      interestType: "monthly",
      lendingMethod: "transfer",
      notes: "",
      receipt: "",
    });
  };

  const submitPayment = () => {
    if (!selectedLoan) return;
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    addLoanPayment({
      loanId: selectedLoan.id,
      amount,
      date: paymentForm.date,
      method: paymentForm.method,
      note: paymentForm.note.trim(),
      accountId: paymentAccountId || undefined,
    });
    setPaymentForm({
      amount: "",
      date: todayISO(),
      method: "transfer",
      note: "",
    });
  };

  const copyReminder = async () => {
    if (!selectedLoanMeta) return;
    const message = `Hola ${selectedLoanMeta.loan.personName}, te recuerdo que tienes pendiente devolverme ${formatCurrency(selectedLoanMeta.pendingAmount, currency)} del prestamo del ${selectedLoanMeta.loan.lentDate}. Gracias.`;
    try {
      await navigator.clipboard.writeText(message);
      window.alert("Recordatorio copiado para WhatsApp.");
    } catch {
      window.prompt("Copia este recordatorio:", message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
        <Card title="Nuevo prestamo">
          <div className="space-y-2">
            <input
              value={newLoan.personName}
              onChange={(event) => setNewLoan((prev) => ({ ...prev, personName: event.target.value }))}
              placeholder="Nombre de la persona"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
            <select
              value={newLoan.relation}
              onChange={(event) => setNewLoan((prev) => ({ ...prev, relation: event.target.value as LoanRelation }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            >
              {Object.entries(relationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Monto prestado"
              value={newLoan.principalAmount}
              onChange={(event) => setNewLoan((prev) => ({ ...prev, principalAmount: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500 dark:text-slate-300">Fecha prestamo</span>
                <input
                  type="date"
                  value={newLoan.lentDate}
                  onChange={(event) => setNewLoan((prev) => ({ ...prev, lentDate: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500 dark:text-slate-300">Fecha devolucion</span>
                <input
                  type="date"
                  value={newLoan.dueDate}
                  onChange={(event) => setNewLoan((prev) => ({ ...prev, dueDate: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newLoan.hasInterest}
                onChange={(event) => setNewLoan((prev) => ({ ...prev, hasInterest: event.target.checked }))}
              />
              Tiene interes
            </label>
            {newLoan.hasInterest ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="number"
                  placeholder="% interes"
                  value={newLoan.interestRate}
                  onChange={(event) => setNewLoan((prev) => ({ ...prev, interestRate: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                />
                <select
                  value={newLoan.interestType}
                  onChange={(event) =>
                    setNewLoan((prev) => ({ ...prev, interestType: event.target.value as LoanInterestType }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                >
                  <option value="monthly">Mensual</option>
                  <option value="annual">Anual</option>
                </select>
              </div>
            ) : null}
            <select
              value={newLoan.lendingMethod}
              onChange={(event) =>
                setNewLoan((prev) => ({ ...prev, lendingMethod: event.target.value as LoanMethod }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            >
              {Object.entries(methodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <textarea
              value={newLoan.notes}
              onChange={(event) => setNewLoan((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Notas / motivo"
              className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
            <textarea
              value={newLoan.receipt}
              onChange={(event) => setNewLoan((prev) => ({ ...prev, receipt: event.target.value }))}
              placeholder="Foto o descripcion de comprobante"
              className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={submitLoan}
              className="rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white"
            >
              Registrar prestamo
            </button>
          </div>
        </Card>

        <Card title="Prestamos otorgados" subtitle="Activos y cerrados">
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar persona"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as LoanStatus | "all")}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            >
              <option value="all">Todos los estados</option>
              {Object.entries(statusMeta).map(([status, meta]) => (
                <option key={status} value={status}>
                  {meta.label}
                </option>
              ))}
            </select>
            <select
              value={personFilter}
              onChange={(event) => setPersonFilter(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            >
              <option value="all">Todas las personas</option>
              {personOptions.map((person) => (
                <option key={person} value={person}>
                  {person}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {filteredLoans.map((item) => (
              <button
                type="button"
                key={item.loan.id}
                onClick={() => setSelectedLoanId(item.loan.id)}
                className={`rounded-xl border p-3 text-left transition ${item.loan.id === selectedLoanId ? "border-cyan-400 bg-cyan-500/10" : "border-slate-200 hover:border-cyan-300 dark:border-white/10"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${colorFromName(item.loan.personName)}`}
                    >
                      {initials(item.loan.personName)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.loan.personName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {relationLabels[item.loan.relation]}
                      </p>
                    </div>
                  </div>
                  <Badge tone={statusMeta[item.status].tone}>{statusMeta[item.status].label}</Badge>
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <p>Monto: {formatCurrency(item.loan.principalAmount, currency)}</p>
                  <p>Saldo pendiente: {formatCurrency(item.pendingAmount, currency)}</p>
                  <p>Fecha limite: {item.loan.dueDate ?? "Sin fecha"}</p>
                </div>
                <div className="mt-2">
                  <ProgressBar value={item.progress} color={item.status === "paid" ? "success" : "default"} />
                </div>
              </button>
            ))}
            {filteredLoans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-white/20 dark:text-slate-400">
                No hay prestamos con los filtros seleccionados.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card title="Detalle del prestamo">
        {!selectedLoanMeta ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Selecciona un prestamo para ver su detalle.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Persona</p>
                <p className="font-semibold">{selectedLoanMeta.loan.personName}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Monto objetivo</p>
                <p className="font-semibold">{formatCurrency(selectedLoanMeta.expectedAmount, currency)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Pagado</p>
                <p className="font-semibold text-income">{formatCurrency(selectedLoanMeta.paidAmount, currency)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Saldo pendiente</p>
                <p className="text-xl font-bold text-warning">
                  {formatCurrency(selectedLoanMeta.pendingAmount, currency)}
                </p>
              </div>
            </div>

            <ProgressBar
              value={selectedLoanMeta.progress}
              color={selectedLoanMeta.status === "paid" ? "success" : selectedLoanMeta.status === "overdue" ? "danger" : "default"}
            />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                  <h4 className="mb-2 text-sm font-semibold">Registrar abono</h4>
                  <div className="space-y-2">
                    <select
                      value={paymentAccountId}
                      onChange={(event) => setPaymentAccountId(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                    >
                      <option value="">Cuenta donde ingresara (opcional)</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                      placeholder="Monto"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                    />
                    <input
                      type="date"
                      value={paymentForm.date}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, date: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                    />
                    <select
                      value={paymentForm.method}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({ ...prev, method: event.target.value as LoanMethod }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                    >
                      {Object.entries(methodLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={paymentForm.note}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, note: event.target.value }))}
                      placeholder="Nota (opcional)"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                    />
                    <button
                      type="button"
                      onClick={submitPayment}
                      className="w-full rounded-lg bg-income px-3 py-2 text-sm font-semibold text-white"
                    >
                      Registrar abono
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                  <h4 className="mb-2 text-sm font-semibold">Acciones</h4>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={copyReminder}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/20"
                    >
                      Enviar recordatorio
                    </button>
                    <textarea
                      value={uncollectibleNote}
                      onChange={(event) => setUncollectibleNote(event.target.value)}
                      placeholder="Nota de incobrable"
                      className="min-h-16 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => markLoanUncollectible(selectedLoanMeta.loan.id, uncollectibleNote)}
                      className="w-full rounded-lg bg-expense px-3 py-2 text-sm font-semibold text-white"
                    >
                      Registrar como incobrable
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const ok = window.confirm("Este prestamo sera eliminado. Deseas continuar?");
                        if (ok) deleteLoan(selectedLoanMeta.loan.id);
                      }}
                      className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm text-expense"
                    >
                      Eliminar prestamo
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                <h4 className="mb-3 text-sm font-semibold">Linea de tiempo de abonos</h4>
                <div className="space-y-2">
                  {selectedPayments.map((payment) => (
                    <div key={payment.id} className="rounded-lg bg-slate-100 p-2 text-sm dark:bg-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{formatCurrency(payment.amount, currency)}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{payment.date}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Metodo: {methodLabels[payment.method]}
                      </p>
                      {payment.note ? (
                        <p className="text-xs text-slate-600 dark:text-slate-300">{payment.note}</p>
                      ) : null}
                    </div>
                  ))}
                  {selectedPayments.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Aun no hay abonos registrados.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
