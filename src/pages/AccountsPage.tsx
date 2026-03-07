import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useBudgetStore } from "../store/useBudgetStore";
import type { AccountSortMode, AccountType, CurrencyCode, TransactionType } from "../types";
import { formatCurrency } from "../utils/currency";
import { todayISO } from "../utils/date";
import {
  accountBalance,
  accountBalanceSeries30d,
  accountMonthTotals,
  accountTypeLabel,
  accountUsage,
  latestAccountTransactions,
  sortAccounts,
  totalAvailableBalance,
  transferLabel,
} from "../utils/accounts";

const typeOptions: Array<{ value: AccountType; label: string }> = [
  { value: "cash", label: "Efectivo" },
  { value: "bank", label: "Banco" },
  { value: "credit_card", label: "Tarjeta de credito" },
  { value: "digital_wallet", label: "Billetera digital" },
  { value: "investment", label: "Inversion" },
  { value: "crypto", label: "Crypto wallet" },
  { value: "other", label: "Otro" },
];

const sortOptions: Array<{ value: AccountSortMode; label: string }> = [
  { value: "custom", label: "Personalizado" },
  { value: "balance_desc", label: "Saldo mayor" },
  { value: "name", label: "Nombre" },
  { value: "type", label: "Tipo" },
];

const currencies: CurrencyCode[] = ["USD", "EUR", "MXN", "COP", "PEN", "ARS"];
const iconByType: Record<AccountType, string> = {
  cash: "EF",
  bank: "BK",
  credit_card: "CC",
  digital_wallet: "YP",
  investment: "IV",
  crypto: "CR",
  other: "OT",
};
const toNumber = (value: string) => Number(value || 0);

const baseTransfer = { fromAccountId: "", toAccountId: "", amount: "", date: todayISO(), note: "" };
const baseQuick = { amount: "", type: "expense" as TransactionType, date: todayISO(), description: "", motive: "" };

export const AccountsPage = () => {
  const store = useBudgetStore();
  const {
    currency,
    accounts,
    transactions,
    categories,
    accountTransfers,
    accountSortMode,
    addAccount,
    updateAccount,
    deleteAccount,
    setAccountSortMode,
    reorderAccounts,
    addAccountTransfer,
    adjustAccountBalance,
    addTransaction,
  } = store;

  const [hideBalance, setHideBalance] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(accounts[0]?.id ?? null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [transferForm, setTransferForm] = useState(baseTransfer);
  const [quickTx, setQuickTx] = useState(baseQuick);
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [adjustReal, setAdjustReal] = useState("");
  const [adjustDate, setAdjustDate] = useState(todayISO());
  const [adjustNote, setAdjustNote] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    type: "cash" as AccountType,
    initialBalance: "",
    currency,
    color: "#2563eb",
    institution: "",
    notes: "",
    includeInTotal: true,
    includeInNetWorth: true,
    creditLimit: "",
    statementDay: "25",
    paymentDay: "8",
  });

  useEffect(() => {
    if (!accounts.length) return void setSelectedId(null);
    if (!selectedId || !accounts.some((item) => item.id === selectedId)) setSelectedId(accounts[0].id);
  }, [accounts, selectedId]);

  const sorted = useMemo(() => sortAccounts(accounts, transactions, accountSortMode), [accounts, transactions, accountSortMode]);
  const selected = useMemo(() => accounts.find((item) => item.id === selectedId) ?? null, [accounts, selectedId]);

  const rows = useMemo(
    () =>
      sorted.map((account) => {
        const balance = accountBalance(account, transactions);
        return { account, balance, latest: latestAccountTransactions(account.id, transactions, 3), usage: accountUsage(account, balance) };
      }),
    [sorted, transactions],
  );

  const available = useMemo(() => totalAvailableBalance(accounts, transactions), [accounts, transactions]);
  const selectedSeries = useMemo(() => (selected ? accountBalanceSeries30d(selected, transactions) : []), [selected, transactions]);
  const selectedMonth = useMemo(() => (selected ? accountMonthTotals(selected, transactions) : { incoming: 0, outgoing: 0 }), [selected, transactions]);
  const selectedBalance = selected ? accountBalance(selected, transactions) : 0;
  const selectedTx = useMemo(
    () =>
      selected
        ? transactions
            .filter((item) => item.accountId === selected.id)
            .filter((item) => (historyFrom ? item.date >= historyFrom : true))
            .filter((item) => (historyTo ? item.date <= historyTo : true))
            .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        : [],
    [selected, transactions, historyFrom, historyTo],
  );

  const transferHistory = useMemo(
    () => [...accountTransfers].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [accountTransfers],
  );

  const distribution = useMemo(
    () => rows.filter((row) => row.balance > 0).map((row) => ({ name: row.account.name, value: row.balance, color: row.account.color })),
    [rows],
  );

  const createAccount = () => {
    if (!createForm.name.trim()) return;
    if (createForm.type === "credit_card" && toNumber(createForm.creditLimit) <= 0) return;
    addAccount({
      name: createForm.name.trim(),
      type: createForm.type,
      initialBalance: toNumber(createForm.initialBalance),
      currency: createForm.currency,
      color: createForm.color,
      icon: iconByType[createForm.type],
      institution: createForm.institution.trim() || undefined,
      notes: createForm.notes.trim() || undefined,
      includeInTotal: createForm.includeInTotal,
      includeInNetWorth: createForm.includeInNetWorth,
      creditLimit: createForm.type === "credit_card" ? toNumber(createForm.creditLimit) : undefined,
      statementDay: createForm.type === "credit_card" ? Math.max(1, Math.min(31, toNumber(createForm.statementDay))) : undefined,
      paymentDay: createForm.type === "credit_card" ? Math.max(1, Math.min(31, toNumber(createForm.paymentDay))) : undefined,
    });
    setCreateForm((prev) => ({ ...prev, name: "", initialBalance: "", institution: "", notes: "", creditLimit: "" }));
  };

  const onDropCard = (targetId: string) => {
    if (!dragId || dragId === targetId || accountSortMode !== "custom") return;
    const ids = sorted.map((item) => item.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    reorderAccounts(ids);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs uppercase text-slate-500 dark:text-slate-400">Saldo total disponible</p><p className="text-2xl font-bold">{hideBalance ? "******" : formatCurrency(available, currency)}</p></div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setHideBalance((prev) => !prev)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-white/20">{hideBalance ? "Mostrar" : "Ocultar"}</button>
            <select value={accountSortMode} onChange={(event) => setAccountSortMode(event.target.value as AccountSortMode)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-white/20 dark:bg-slate-900">{sortOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          </div>
        </div>
      </Card>

      <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
        {rows.map(({ account, balance, latest, usage }) => (
          <button key={account.id} type="button" draggable={accountSortMode === "custom"} onDragStart={() => setDragId(account.id)} onDragEnd={() => setDragId(null)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDropCard(account.id)} onClick={() => setSelectedId(account.id)} className={`min-w-[260px] rounded-2xl border p-4 text-left transition lg:min-w-0 ${selectedId === account.id ? "border-cyan-400" : "border-slate-200 hover:border-cyan-300 dark:border-white/10"}`} style={{ backgroundImage: `linear-gradient(135deg, ${account.color}AA 0%, rgba(15,23,42,0.92) 85%)` }}>
            <div className="mb-3 flex items-start justify-between"><div><p className="text-sm font-semibold text-white">{account.name}</p><p className="text-xs text-white/70">{accountTypeLabel(account.type)}</p></div><span className="rounded-full bg-white/20 px-2 py-1 text-xs font-semibold text-white">{account.icon}</span></div>
            <p className="text-xl font-bold text-white">{hideBalance ? "*****" : formatCurrency(balance, account.currency)}</p>
            {account.type === "credit_card" ? <div className="mt-2 space-y-1 text-xs text-white/80"><p>Usado {hideBalance ? "***" : formatCurrency(usage.used, account.currency)} / {hideBalance ? "***" : formatCurrency(account.creditLimit ?? 0, account.currency)}</p><ProgressBar value={usage.utilization} color={usage.utilization >= 70 ? "danger" : "warning"} /><p>Utilizacion: {usage.utilization.toFixed(1)}%</p></div> : null}
            <div className="mt-3 space-y-1 rounded-lg bg-slate-900/50 p-2 text-xs text-white/80">{latest.map((tx) => <div key={tx.id} className="flex items-center justify-between"><span className="truncate">{tx.description}</span><span>{hideBalance ? "***" : formatCurrency(tx.amount, account.currency)}</span></div>)}{latest.length === 0 ? <p>Sin movimientos recientes</p> : null}</div>
            <div className="mt-3 flex items-center justify-between"><Badge tone="info">+ Transaccion</Badge><span className="text-xs text-white/70">Click para detalle</span></div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr]">
        <Card title="Nueva cuenta">
          <div className="space-y-2">
            <input value={createForm.name} onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Nombre de cuenta" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" />
            <select value={createForm.type} onChange={(event) => setCreateForm((prev) => ({ ...prev, type: event.target.value as AccountType, includeInTotal: event.target.value !== "credit_card" }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900">{typeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <div className="grid grid-cols-2 gap-2"><input type="number" value={createForm.initialBalance} onChange={(event) => setCreateForm((prev) => ({ ...prev, initialBalance: event.target.value }))} placeholder="Saldo inicial" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" /><select value={createForm.currency} onChange={(event) => setCreateForm((prev) => ({ ...prev, currency: event.target.value as CurrencyCode }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900">{currencies.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            <div className="grid grid-cols-1 gap-2"><input type="color" value={createForm.color} onChange={(event) => setCreateForm((prev) => ({ ...prev, color: event.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-2 py-1 dark:border-white/20 dark:bg-slate-900" /><p className="text-xs text-slate-500 dark:text-slate-400">Icono asignado automaticamente segun tipo.</p></div>
            <input value={createForm.institution} onChange={(event) => setCreateForm((prev) => ({ ...prev, institution: event.target.value }))} placeholder="Institucion (opcional)" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" />
            {createForm.type === "credit_card" ? <div className="grid grid-cols-3 gap-2"><input type="number" value={createForm.creditLimit} onChange={(event) => setCreateForm((prev) => ({ ...prev, creditLimit: event.target.value }))} placeholder="Limite" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" /><input type="number" value={createForm.statementDay} onChange={(event) => setCreateForm((prev) => ({ ...prev, statementDay: event.target.value }))} placeholder="Corte" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" /><input type="number" value={createForm.paymentDay} onChange={(event) => setCreateForm((prev) => ({ ...prev, paymentDay: event.target.value }))} placeholder="Pago" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" /></div> : null}
            <textarea value={createForm.notes} onChange={(event) => setCreateForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notas" className="min-h-16 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" />
            <div className="grid grid-cols-2 gap-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={createForm.includeInTotal} onChange={(event) => setCreateForm((prev) => ({ ...prev, includeInTotal: event.target.checked }))} />Incluir en saldo</label><label className="flex items-center gap-2"><input type="checkbox" checked={createForm.includeInNetWorth} onChange={(event) => setCreateForm((prev) => ({ ...prev, includeInNetWorth: event.target.checked }))} />Incluir en patrimonio</label></div>
            <button type="button" onClick={createAccount} className="w-full rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white">Crear cuenta</button>
          </div>
        </Card>

        <Card title="Detalle de cuenta">
          {!selected ? <p className="text-sm text-slate-500 dark:text-slate-400">Selecciona una cuenta para ver detalles.</p> : <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"><div><p className="text-xs uppercase text-slate-500 dark:text-slate-400">Saldo actual</p><p className="text-2xl font-bold">{hideBalance ? "******" : formatCurrency(selectedBalance, selected.currency)}</p></div><div><p className="text-xs uppercase text-slate-500 dark:text-slate-400">Ingresos del mes</p><p className="font-semibold text-income">{hideBalance ? "****" : formatCurrency(selectedMonth.incoming, selected.currency)}</p></div><div><p className="text-xs uppercase text-slate-500 dark:text-slate-400">Gastos del mes</p><p className="font-semibold text-expense">{hideBalance ? "****" : formatCurrency(selectedMonth.outgoing, selected.currency)}</p></div><div><p className="text-xs uppercase text-slate-500 dark:text-slate-400">Tipo</p><p className="font-semibold">{accountTypeLabel(selected.type)}</p></div></div>
            <div className="h-64 w-full rounded-xl border border-slate-200 p-2 dark:border-white/10"><ResponsiveContainer width="100%" height="100%"><AreaChart data={selectedSeries}><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(value) => `${Math.round(value)}`} tick={{ fontSize: 11 }} /><Tooltip /><Area type="monotone" dataKey="balance" stroke={selected.color} fill={`${selected.color}33`} /></AreaChart></ResponsiveContainer></div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10"><h4 className="mb-2 text-sm font-semibold">Ajustar saldo</h4><div className="space-y-2"><input type="number" value={adjustReal} onChange={(event) => setAdjustReal(event.target.value)} placeholder="Saldo real actual" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" /><input type="date" value={adjustDate} onChange={(event) => setAdjustDate(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" /><input value={adjustNote} onChange={(event) => setAdjustNote(event.target.value)} placeholder="Nota" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" /><button type="button" onClick={() => { adjustAccountBalance({ accountId: selected.id, realBalance: toNumber(adjustReal), date: adjustDate, note: adjustNote.trim() }); setAdjustReal(""); setAdjustNote(""); }} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/20">Registrar ajuste</button></div></div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10"><h4 className="mb-2 text-sm font-semibold">+ Transaccion rapida</h4><div className="space-y-2"><div className="grid grid-cols-2 gap-2"><input type="number" value={quickTx.amount} onChange={(event) => setQuickTx((prev) => ({ ...prev, amount: event.target.value }))} placeholder="Monto" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" /><select value={quickTx.type} onChange={(event) => setQuickTx((prev) => ({ ...prev, type: event.target.value as TransactionType }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"><option value="income">Ingreso</option><option value="expense">Gasto</option><option value="investment">Inversion</option></select></div><input type="date" value={quickTx.date} onChange={(event) => setQuickTx((prev) => ({ ...prev, date: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" /><input value={quickTx.description} onChange={(event) => setQuickTx((prev) => ({ ...prev, description: event.target.value }))} placeholder="Descripcion" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" /><input value={quickTx.motive} onChange={(event) => setQuickTx((prev) => ({ ...prev, motive: event.target.value }))} placeholder="Motivo" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" /><button type="button" onClick={() => { const amount = toNumber(quickTx.amount); if (amount <= 0 || !quickTx.description.trim() || !quickTx.motive.trim()) return; addTransaction({ amount, type: quickTx.type, accountId: selected.id, categoryId: quickTx.type === "expense" ? categories.find((item) => item.ruleBucket === "needs")?.id ?? categories[0]?.id : undefined, date: quickTx.date, description: quickTx.description.trim(), motive: quickTx.motive.trim(), tags: ["cuenta"], isRecurring: false }); setQuickTx(baseQuick); }} className="w-full rounded-lg bg-income px-3 py-2 text-sm font-semibold text-white">Guardar transaccion</button></div></div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10"><div className="mb-2 flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">Historial</h4><div className="flex gap-2"><input type="date" value={historyFrom} onChange={(event) => setHistoryFrom(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-white/20 dark:bg-slate-900" /><input type="date" value={historyTo} onChange={(event) => setHistoryTo(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-white/20 dark:bg-slate-900" /></div></div><div className="max-h-64 space-y-2 overflow-auto">{selectedTx.map((tx) => <div key={tx.id} className="flex items-center justify-between rounded-lg bg-slate-100 p-2 text-sm dark:bg-slate-800"><div><p className="font-semibold">{tx.description}</p><p className="text-xs text-slate-500 dark:text-slate-400">{tx.date} - {tx.type}</p></div><span>{hideBalance ? "***" : formatCurrency(tx.amount, selected.currency)}</span></div>)}{selectedTx.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">Sin movimientos.</p> : null}</div></div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextName = window.prompt("Nombre de la cuenta", selected.name);
                  if (!nextName) return;
                  updateAccount(selected.id, { name: nextName.trim() || selected.name });
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/20"
              >
                Editar cuenta
              </button>
              <button type="button" onClick={() => { const ok = window.confirm("Deseas eliminar esta cuenta?"); if (ok) deleteAccount(selected.id); }} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-expense">Eliminar cuenta</button>
            </div>
          </div>}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Transferir entre cuentas">
          <div className="space-y-2">
            <select value={transferForm.fromAccountId} onChange={(event) => setTransferForm((prev) => ({ ...prev, fromAccountId: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"><option value="">Cuenta origen</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
            <select value={transferForm.toAccountId} onChange={(event) => setTransferForm((prev) => ({ ...prev, toAccountId: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"><option value="">Cuenta destino</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
            <input type="number" value={transferForm.amount} onChange={(event) => setTransferForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="Monto" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" />
            <input type="date" value={transferForm.date} onChange={(event) => setTransferForm((prev) => ({ ...prev, date: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" />
            <input value={transferForm.note} onChange={(event) => setTransferForm((prev) => ({ ...prev, note: event.target.value }))} placeholder="Nota" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900" />
            <button type="button" onClick={() => { const amount = toNumber(transferForm.amount); if (!transferForm.fromAccountId || !transferForm.toAccountId || transferForm.fromAccountId === transferForm.toAccountId || amount <= 0) return; addAccountTransfer({ fromAccountId: transferForm.fromAccountId, toAccountId: transferForm.toAccountId, amount, date: transferForm.date, note: transferForm.note }); setTransferForm(baseTransfer); }} className="w-full rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white">Registrar transferencia</button>
          </div>
        </Card>
        <Card title="Historial de transferencias">
          <div className="space-y-2">
            {transferHistory.map((transfer) => {
              const from = accounts.find((item) => item.id === transfer.fromAccountId);
              const to = accounts.find((item) => item.id === transfer.toAccountId);
              return <div key={transfer.id} className="rounded-lg bg-slate-100 p-2 text-sm dark:bg-slate-800"><div className="flex items-center justify-between"><p className="font-semibold">{transferLabel(transfer, from, to)}</p><span>{formatCurrency(transfer.amount, currency)}</span></div><p className="text-xs text-slate-500 dark:text-slate-400">{transfer.date}{transfer.note ? ` - ${transfer.note}` : ""}</p></div>;
            })}
            {transferHistory.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No hay transferencias.</p> : null}
          </div>
        </Card>
      </div>

      <Card title="Distribucion de dinero por cuenta">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100}>{distribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
