import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useBudgetStore } from "../store/useBudgetStore";
import type {
  Debt,
  DebtPriority,
  DebtType,
  LoanMethod,
  LoanRelation,
} from "../types";
import { formatCurrency } from "../utils/currency";
import {
  compareDebtStrategies,
  debtInterestRate,
  debtPaidProgress,
  debtPaidTotal,
  debtRemainingTotal,
  debtTotalPaidFromHistory,
  estimateDebtPayoff,
  estimateDebtPayoffDate,
  isDebtDueSoon,
  isDebtOverdue,
  nextDueDateISO,
  progressTone,
  simulateExtraDebtPayment,
} from "../utils/debts";
import { getCurrentMonthKey, todayISO } from "../utils/date";

const debtTypeLabel: Record<DebtType, string> = {
  personal_loan: "Prestamo personal",
  credit_card: "Tarjeta de credito",
  mortgage: "Hipoteca",
  auto: "Auto",
  student: "Estudiantil",
  family_friend: "Familiar/Amigo",
  other: "Otro",
};

const relationLabel: Record<LoanRelation, string> = {
  family: "Familiar",
  friend: "Amigo",
  coworker: "Companero de trabajo",
  other: "Otro",
};

const methodLabel: Record<LoanMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
};

const priorityTone: Record<DebtPriority, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

const priorityLabel: Record<DebtPriority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const formSeed = {
  creditor: "",
  debtType: "personal_loan" as DebtType,
  originalAmount: "",
  remainingBalance: "",
  hasInterest: true,
  annualInterestRate: "",
  monthlyPayment: "",
  dueDayOfMonth: "10",
  isKnownPerson: false,
  knownPersonName: "",
  knownPersonRelation: "friend" as LoanRelation,
  priority: "medium" as DebtPriority,
  color: "#ef4444",
  icon: "DEBT",
  notes: "",
  startDate: todayISO(),
  endDate: "",
};

const paymentSeed = {
  amount: "",
  date: todayISO(),
  method: "transfer" as LoanMethod,
  note: "",
};

const Confetti = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {Array.from({ length: 28 }).map((_, index) => (
      <span
        key={index}
        className="absolute h-2 w-2 animate-bounce rounded-full"
        style={{
          left: `${(index * 13) % 100}%`,
          top: `${(index * 7) % 80}%`,
          backgroundColor: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"][index % 4],
          animationDelay: `${(index % 7) * 60}ms`,
        }}
      />
    ))}
  </div>
);

export const DebtsPage = () => {
  const store = useBudgetStore();
  const {
    currency,
    debts,
    debtPayments,
    transactions,
    accounts,
    addDebt,
    deleteDebt,
    addDebtPayment,
  } = store;

  const [form, setForm] = useState(formSeed);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(debts[0]?.id ?? null);
  const [paymentForm, setPaymentForm] = useState(paymentSeed);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [extraPayment, setExtraPayment] = useState("");
  const [attackBudget, setAttackBudget] = useState("1200");
  const [attackMode, setAttackMode] = useState<"snowball" | "avalanche">("avalanche");
  const [celebrate, setCelebrate] = useState(false);
  const prevSelectedRemaining = useRef<number | null>(null);

  useEffect(() => {
    if (!debts.length) {
      setSelectedDebtId(null);
      return;
    }
    if (!selectedDebtId || !debts.some((item) => item.id === selectedDebtId)) {
      setSelectedDebtId(debts[0].id);
    }
  }, [debts, selectedDebtId]);

  const month = getCurrentMonthKey();
  const monthlyIncome = transactions
    .filter((tx) => tx.type === "income" && tx.date.startsWith(month))
    .reduce((acc, tx) => acc + tx.amount, 0);
  const monthlyDebtPayment = debts
    .filter((debt) => debt.remainingBalance > 0)
    .reduce((acc, debt) => acc + debt.monthlyPayment, 0);
  const debtToIncomeRatio = monthlyIncome > 0 ? (monthlyDebtPayment / monthlyIncome) * 100 : 0;
  const totalRemainingDebt = debtRemainingTotal(debts);

  const debtRows = useMemo(
    () =>
      debts.map((debt) => {
        const progress = debtPaidProgress(debt);
        const overdue = isDebtOverdue(debt, debtPayments);
        const dueSoon = !overdue && isDebtDueSoon(debt, 5);
        return { debt, progress, overdue, dueSoon };
      }),
    [debts, debtPayments],
  );

  const selectedDebt = useMemo(
    () => debts.find((item) => item.id === selectedDebtId) ?? null,
    [debts, selectedDebtId],
  );

  const selectedPayments = useMemo(
    () =>
      selectedDebt
        ? debtPayments
            .filter((item) => item.debtId === selectedDebt.id)
            .sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [selectedDebt, debtPayments],
  );

  const selectedInterestStats = useMemo(() => {
    if (!selectedDebt) return null;
    const paidByHistory = debtTotalPaidFromHistory(selectedDebt.id, debtPayments);
    const principalPaid = debtPaidTotal(selectedDebt);
    const interestPaid = Math.max(0, paidByHistory - principalPaid);
    return { paidByHistory, principalPaid, interestPaid };
  }, [selectedDebt, debtPayments]);

  const selectedProjection = useMemo(() => {
    if (!selectedDebt) return null;
    const monthlyFromHistory = (() => {
      const items = debtPayments.filter((item) => item.debtId === selectedDebt.id);
      if (!items.length) return selectedDebt.monthlyPayment;
      const months = new Set(items.map((item) => item.date.slice(0, 7))).size;
      return months > 0 ? items.reduce((acc, item) => acc + item.amount, 0) / months : selectedDebt.monthlyPayment;
    })();
    const projectedMonthly = Math.max(1, monthlyFromHistory);
    const estimate = estimateDebtPayoff(
      selectedDebt.remainingBalance,
      projectedMonthly,
      debtInterestRate(selectedDebt),
    );
    return {
      months: estimate.months,
      payoffDate: estimateDebtPayoffDate(estimate.months),
      totalInterest: estimate.totalInterest,
      projectedMonthly,
    };
  }, [selectedDebt, debtPayments]);

  const extraSimulation = useMemo(() => {
    if (!selectedDebt) return null;
    return simulateExtraDebtPayment(selectedDebt, Number(extraPayment || 0));
  }, [selectedDebt, extraPayment]);

  const strategies = useMemo(
    () => compareDebtStrategies(debts.filter((item) => item.remainingBalance > 0), Number(attackBudget || 0)),
    [debts, attackBudget],
  );

  const currentPlan = attackMode === "avalanche" ? strategies.avalanche : strategies.snowball;

  useEffect(() => {
    if (!selectedDebt) return;
    const prev = prevSelectedRemaining.current;
    if (prev !== null && prev > 0 && selectedDebt.remainingBalance <= 0) {
      setCelebrate(true);
      const timer = window.setTimeout(() => setCelebrate(false), 2300);
      return () => window.clearTimeout(timer);
    }
    prevSelectedRemaining.current = selectedDebt.remainingBalance;
  }, [selectedDebt?.remainingBalance, selectedDebt]);

  const handleCreateDebt = () => {
    const originalAmount = Number(form.originalAmount);
    const remainingBalance = Number(form.remainingBalance);
    const monthlyPayment = Number(form.monthlyPayment);
    const annualRate = Number(form.annualInterestRate || 0);
    const dueDay = Number(form.dueDayOfMonth || 1);
    if (!form.creditor.trim() || originalAmount <= 0 || remainingBalance < 0 || monthlyPayment <= 0) return;

    addDebt({
      creditor: form.creditor.trim(),
      debtType: form.debtType,
      originalAmount,
      remainingBalance,
      hasInterest: form.hasInterest,
      annualInterestRate: form.hasInterest ? annualRate : 0,
      interestRate: form.hasInterest ? annualRate : 0,
      monthlyPayment,
      dueDayOfMonth: Math.min(31, Math.max(1, Math.round(dueDay))),
      isKnownPerson: form.isKnownPerson,
      knownPersonName: form.isKnownPerson ? form.knownPersonName.trim() : undefined,
      knownPersonRelation: form.isKnownPerson ? form.knownPersonRelation : undefined,
      priority: form.priority,
      color: form.color,
      icon: form.icon.trim() || "DEBT",
      notes: form.notes.trim(),
      startDate: form.startDate,
      endDate: form.endDate || "",
    });
    setForm(formSeed);
  };

  const handleRegisterPayment = (isExtra: boolean) => {
    if (!selectedDebt) return;
    const amount = Number(isExtra ? extraPayment : paymentForm.amount);
    if (amount <= 0) return;
    addDebtPayment({
      debtId: selectedDebt.id,
      amount,
      date: isExtra ? todayISO() : paymentForm.date,
      method: paymentForm.method,
      note: isExtra ? "Pago extra aplicado desde simulador" : paymentForm.note.trim(),
      isExtra,
      accountId: paymentAccountId || undefined,
    });
    if (isExtra) {
      setExtraPayment("");
      return;
    }
    setPaymentForm(paymentSeed);
  };

  const copyReminder = async (debt: Debt) => {
    const nextDue = nextDueDateISO(debt.dueDayOfMonth);
    const text = `Recordatorio personal: pagar ${formatCurrency(debt.monthlyPayment, currency)} de ${debt.creditor} antes del ${nextDue}. Saldo pendiente ${formatCurrency(debt.remainingBalance, currency)}.`;
    try {
      await navigator.clipboard.writeText(text);
      window.alert("Recordatorio copiado.");
    } catch {
      window.prompt("Copia este texto:", text);
    }
  };

  const dueSoonDebts = debtRows.filter((item) => item.dueSoon).length;
  const overdueDebts = debtRows.filter((item) => item.overdue).length;
  const highestInterestDebt =
    [...debts].sort((a, b) => debtInterestRate(b) - debtInterestRate(a))[0] ?? null;

  const nextPaymentDebt =
    [...debts]
      .filter((item) => item.remainingBalance > 0)
      .sort((a, b) => nextDueDateISO(a.dueDayOfMonth).localeCompare(nextDueDateISO(b.dueDayOfMonth)))[0] ?? null;

  const betterInterest =
    strategies.avalanche.totalInterest < strategies.snowball.totalInterest ? "Avalancha" : "Bola de Nieve";
  const betterFirstWin =
    strategies.avalanche.firstDebtPaidMonth < strategies.snowball.firstDebtPaidMonth ? "Avalancha" : "Bola de Nieve";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Ratio deuda/ingreso">
          <p className="text-2xl font-bold text-warning">{debtToIncomeRatio.toFixed(1)}%</p>
        </Card>
        <Card title="Total deudas activas">
          <p className="text-2xl font-bold">{formatCurrency(totalRemainingDebt, currency)}</p>
        </Card>
        <Card title="Proximo pago">
          <p className="text-sm font-semibold">{nextPaymentDebt ? nextPaymentDebt.creditor : "Sin deudas"}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {nextPaymentDebt
              ? `${nextDueDateISO(nextPaymentDebt.dueDayOfMonth)} · ${formatCurrency(nextPaymentDebt.monthlyPayment, currency)}`
              : "-"}
          </p>
        </Card>
        <Card title="Mayor interes">
          <p className="text-sm font-semibold">{highestInterestDebt?.creditor ?? "Sin deudas"}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {highestInterestDebt ? `${debtInterestRate(highestInterestDebt).toFixed(1)}% anual` : "-"}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
        <Card title="Registrar deuda avanzada">
          <div className="space-y-2">
            <input
              placeholder="Acreedor"
              value={form.creditor}
              onChange={(event) => setForm((prev) => ({ ...prev, creditor: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
            <select
              value={form.debtType}
              onChange={(event) => setForm((prev) => ({ ...prev, debtType: event.target.value as DebtType }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            >
              {Object.entries(debtTypeLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="number"
                placeholder="Monto original"
                value={form.originalAmount}
                onChange={(event) => setForm((prev) => ({ ...prev, originalAmount: event.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
              />
              <input
                type="number"
                placeholder="Saldo actual"
                value={form.remainingBalance}
                onChange={(event) => setForm((prev) => ({ ...prev, remainingBalance: event.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="number"
                placeholder="Pago mensual minimo"
                value={form.monthlyPayment}
                onChange={(event) => setForm((prev) => ({ ...prev, monthlyPayment: event.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
              />
              <input
                type="number"
                min={1}
                max={31}
                placeholder="Dia vencimiento"
                value={form.dueDayOfMonth}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDayOfMonth: event.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.hasInterest}
                onChange={(event) => setForm((prev) => ({ ...prev, hasInterest: event.target.checked }))}
              />
              Cobra interes
            </label>
            {form.hasInterest ? (
              <input
                type="number"
                placeholder="Tasa de interes anual (%)"
                value={form.annualInterestRate}
                onChange={(event) => setForm((prev) => ({ ...prev, annualInterestRate: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
              />
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isKnownPerson}
                onChange={(event) => setForm((prev) => ({ ...prev, isKnownPerson: event.target.checked }))}
              />
              Es deuda con persona conocida
            </label>
            {form.isKnownPerson ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  placeholder="Nombre"
                  value={form.knownPersonName}
                  onChange={(event) => setForm((prev) => ({ ...prev, knownPersonName: event.target.value }))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                />
                <select
                  value={form.knownPersonRelation}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, knownPersonRelation: event.target.value as LoanRelation }))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                >
                  {Object.entries(relationLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as DebtPriority }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
              >
                <option value="high">Prioridad alta</option>
                <option value="medium">Prioridad media</option>
                <option value="low">Prioridad baja</option>
              </select>
              <input
                type="color"
                value={form.color}
                onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                className="h-10 rounded-lg border border-slate-300 bg-white px-2 py-1 dark:border-white/20 dark:bg-slate-900"
              />
              <input
                placeholder="Icono"
                value={form.icon}
                onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
              />
              <input
                type="date"
                value={form.endDate}
                onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
              />
            </div>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Notas"
              className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={handleCreateDebt}
              className="rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white"
            >
              Guardar deuda
            </button>
          </div>
        </Card>

        <Card title="Deudas registradas" subtitle="Estado visual y alertas">
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <Badge tone={overdueDebts > 0 ? "danger" : "neutral"}>{overdueDebts} vencidas</Badge>
            <Badge tone={dueSoonDebts > 0 ? "warning" : "neutral"}>{dueSoonDebts} proximas (5 dias)</Badge>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {debtRows.map(({ debt, progress, overdue, dueSoon }) => (
              <button
                key={debt.id}
                type="button"
                onClick={() => setSelectedDebtId(debt.id)}
                className={`rounded-xl border p-3 text-left transition ${selectedDebtId === debt.id ? "border-cyan-400 bg-cyan-500/10" : "border-slate-200 dark:border-white/10"}`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: debt.color }}
                    >
                      {debt.icon.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-semibold">{debt.creditor}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{debtTypeLabel[debt.debtType]}</p>
                    </div>
                  </div>
                  <Badge tone={priorityTone[debt.priority]}>{priorityLabel[debt.priority]}</Badge>
                </div>
                <div className="space-y-1 text-xs">
                  <p>Saldo: {formatCurrency(debt.remainingBalance, currency)}</p>
                  <p>Cuota: {formatCurrency(debt.monthlyPayment, currency)}</p>
                  <p>Vence: dia {debt.dueDayOfMonth} (proximo: {nextDueDateISO(debt.dueDayOfMonth)})</p>
                </div>
                <div className="mt-2">
                  <ProgressBar value={progress} color={progressTone(progress)} />
                </div>
                <div className="mt-2 flex gap-2 text-xs">
                  {overdue ? <Badge tone="danger">Vencida</Badge> : null}
                  {dueSoon ? <Badge tone="warning">Proxima</Badge> : null}
                  {debt.remainingBalance <= 0 ? <Badge tone="success">Pagada</Badge> : null}
                </div>
              </button>
            ))}
            {debtRows.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No hay deudas registradas.</p>
            ) : null}
          </div>
        </Card>
      </div>
      <Card title="Detalle de deuda">
        {!selectedDebt ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Selecciona una deuda para ver su detalle.</p>
        ) : (
          <div className="relative space-y-4">
            {celebrate ? <Confetti /> : null}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Monto original</p>
                <p className="text-lg font-semibold">{formatCurrency(selectedDebt.originalAmount, currency)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Saldo actual</p>
                <p className="text-lg font-semibold text-warning">{formatCurrency(selectedDebt.remainingBalance, currency)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Total pagado</p>
                <p className="text-lg font-semibold text-income">{formatCurrency(debtPaidTotal(selectedDebt), currency)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Interes acumulado</p>
                <p className="text-lg font-semibold text-expense">
                  {formatCurrency(selectedInterestStats?.interestPaid ?? 0, currency)}
                </p>
              </div>
            </div>

            <ProgressBar value={debtPaidProgress(selectedDebt)} color={progressTone(debtPaidProgress(selectedDebt))} />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                  <h4 className="mb-2 text-sm font-semibold">Registrar pago</h4>
                  <div className="space-y-2">
                    <select
                      value={paymentAccountId}
                      onChange={(event) => setPaymentAccountId(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                    >
                      <option value="">Cuenta para pagar (opcional)</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Monto"
                      value={paymentForm.amount}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
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
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, method: event.target.value as LoanMethod }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                    >
                      {Object.entries(methodLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="Nota"
                      value={paymentForm.note}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, note: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleRegisterPayment(false)}
                      className="w-full rounded-lg bg-income px-3 py-2 text-sm font-semibold text-white"
                    >
                      Registrar pago
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                  <h4 className="mb-2 text-sm font-semibold">Proyeccion de liquidacion</h4>
                  <p className="text-sm">
                    Ritmo actual: {formatCurrency(selectedProjection?.projectedMonthly ?? selectedDebt.monthlyPayment, currency)} / mes
                  </p>
                  <p className="text-sm">Fecha estimada: {selectedProjection?.payoffDate}</p>
                  <p className="text-sm">
                    Interes proyectado: {formatCurrency(selectedProjection?.totalInterest ?? 0, currency)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                  <h4 className="mb-2 text-sm font-semibold">Recordatorio</h4>
                  <button
                    type="button"
                    onClick={() => copyReminder(selectedDebt)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/20"
                  >
                    Generar recordatorio
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      const ok = window.confirm("Deseas eliminar esta deuda?");
                      if (ok) deleteDebt(selectedDebt.id);
                    }}
                    className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm text-expense"
                  >
                    Eliminar deuda
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                  <h4 className="mb-2 text-sm font-semibold">Historial de pagos</h4>
                  <div className="space-y-2">
                    {selectedPayments.map((payment) => (
                      <div key={payment.id} className="rounded-lg bg-slate-100 p-2 text-sm dark:bg-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{formatCurrency(payment.amount, currency)}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{payment.date}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {methodLabel[payment.method]} {payment.isExtra ? "· pago extra" : ""}
                        </p>
                        {payment.note ? <p className="text-xs">{payment.note}</p> : null}
                      </div>
                    ))}
                    {selectedPayments.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Aun no hay pagos.</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                  <h4 className="mb-2 text-sm font-semibold">Simulador pago anticipado</h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      type="number"
                      placeholder="Monto extra hoy"
                      value={extraPayment}
                      onChange={(event) => setExtraPayment(event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleRegisterPayment(true)}
                      className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Aplicar
                    </button>
                  </div>
                  {extraSimulation ? (
                    <div className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-3">
                      <p>Nueva fecha: {estimateDebtPayoffDate(extraSimulation.projectedMonths)}</p>
                      <p>Meses ahorrados: {extraSimulation.savedMonths}</p>
                      <p>Interes ahorrado: {formatCurrency(extraSimulation.savedInterest, currency)}</p>
                    </div>
                  ) : null}
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="rounded-lg bg-slate-100 p-2 text-xs dark:bg-slate-800">
                      <p className="font-semibold">Linea original</p>
                      <p>{extraSimulation?.baselineMonths ?? 0} meses</p>
                    </div>
                    <div className="rounded-lg bg-cyan-100 p-2 text-xs text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200">
                      <p className="font-semibold">Con pago extra</p>
                      <p>{extraSimulation?.projectedMonths ?? 0} meses</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title="Plan de Ataque a Deudas">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_1fr]">
          <div className="space-y-3">
            <p className="text-sm">
              Snowball: <strong>Bola de Nieve</strong>, pagas primero el menor saldo para ganar motivacion.
            </p>
            <p className="text-sm">
              Avalanche: <strong>Avalancha</strong>, pagas primero la mayor tasa de interes para ahorrar mas dinero.
            </p>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                Presupuesto mensual total para deudas
              </span>
              <input
                type="number"
                value={attackBudget}
                onChange={(event) => setAttackBudget(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAttackMode("snowball")}
                className={`rounded-lg px-3 py-2 text-sm ${attackMode === "snowball" ? "bg-cyan-500 text-slate-950" : "border border-slate-300 dark:border-white/20"}`}
              >
                Bola de Nieve
              </button>
              <button
                type="button"
                onClick={() => setAttackMode("avalanche")}
                className={`rounded-lg px-3 py-2 text-sm ${attackMode === "avalanche" ? "bg-cyan-500 text-slate-950" : "border border-slate-300 dark:border-white/20"}`}
              >
                Avalancha
              </button>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10">
              <p>Sin deudas en: {currentPlan.debtFreeDate}</p>
              <p>Intereses totales: {formatCurrency(currentPlan.totalInterest, currency)}</p>
              <p>Primera deuda liquidada: mes {currentPlan.firstDebtPaidMonth}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10">
              <p>Menor interes total: {betterInterest}</p>
              <p>Primera victoria mas rapida: {betterFirstWin}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-2 dark:border-white/10">
                <p className="font-semibold">Bola de Nieve</p>
                <p>Libre: {strategies.snowball.debtFreeDate}</p>
                <p>Interes: {formatCurrency(strategies.snowball.totalInterest, currency)}</p>
                <p>1ra deuda: mes {strategies.snowball.firstDebtPaidMonth}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-2 dark:border-white/10">
                <p className="font-semibold">Avalancha</p>
                <p>Libre: {strategies.avalanche.debtFreeDate}</p>
                <p>Interes: {formatCurrency(strategies.avalanche.totalInterest, currency)}</p>
                <p>1ra deuda: mes {strategies.avalanche.firstDebtPaidMonth}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="overflow-auto rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2">Orden</th>
                    <th className="px-3 py-2">Deuda</th>
                    <th className="px-3 py-2">Mes liquidacion</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPlan.schedule.map((item, index) => (
                    <tr key={item.debtId} className="border-t border-slate-200 dark:border-white/10">
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2">{item.creditor}</td>
                      <td className="px-3 py-2">{item.payoffMonth}</td>
                    </tr>
                  ))}
                  {currentPlan.schedule.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-slate-500 dark:text-slate-400">
                        No hay deudas activas para planificar.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <p className="mb-2 text-sm font-semibold">Roadmap horizontal</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {currentPlan.schedule.map((item) => (
                  <div
                    key={item.debtId}
                    className="min-w-40 rounded-lg bg-slate-100 p-2 text-xs dark:bg-slate-800"
                  >
                    <p className="font-semibold">{item.creditor}</p>
                    <p>Mes {item.payoffMonth}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
