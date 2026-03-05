import { useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { useBudgetStore } from "../store/useBudgetStore";
import type { InvestmentType } from "../types";
import { formatCurrency } from "../utils/currency";
import { PortfolioChart } from "../components/charts/PortfolioChart";
import { computePortfolioRoi } from "../utils/kpi";
import { todayISO } from "../utils/date";

export const InvestmentsPage = () => {
  const store = useBudgetStore();
  const { currency, investments, investmentSnapshots, addInvestment, updateInvestment, deleteInvestment } = store;

  const [form, setForm] = useState({
    name: "",
    type: "stocks" as InvestmentType,
    capitalInvested: "",
    currentValue: "",
    startDate: todayISO(),
  });

  const chartData = useMemo(() => {
    const grouped = new Map<string, number>();
    investmentSnapshots.forEach((snap) => {
      grouped.set(snap.date, (grouped.get(snap.date) ?? 0) + snap.value);
    });
    return [...grouped.entries()]
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [investmentSnapshots]);

  const totalInvested = investments.reduce((acc, item) => acc + item.capitalInvested, 0);
  const totalValue = investments.reduce((acc, item) => acc + item.currentValue, 0);
  const totalRoi = computePortfolioRoi(investments);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
      <Card title="Registrar instrumento">
        <div className="space-y-2">
          <input
            placeholder="Nombre instrumento"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <select
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as InvestmentType }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          >
            <option value="stocks">Acciones</option>
            <option value="crypto">Cripto</option>
            <option value="fund">Fondo</option>
            <option value="real_estate">Inmueble</option>
            <option value="bond">Bono</option>
            <option value="other">Otro</option>
          </select>
          <input
            placeholder="Capital invertido"
            type="number"
            value={form.capitalInvested}
            onChange={(event) => setForm((prev) => ({ ...prev, capitalInvested: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <input
            placeholder="Valor actual"
            type="number"
            value={form.currentValue}
            onChange={(event) => setForm((prev) => ({ ...prev, currentValue: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <input
            type="date"
            value={form.startDate}
            onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={() => {
              if (!form.name.trim() || Number(form.capitalInvested) <= 0 || Number(form.currentValue) <= 0) return;
              addInvestment({
                name: form.name.trim(),
                type: form.type,
                capitalInvested: Number(form.capitalInvested),
                currentValue: Number(form.currentValue),
                startDate: form.startDate,
              });
              setForm({ name: "", type: "stocks", capitalInvested: "", currentValue: "", startDate: todayISO() });
            }}
            className="rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white"
          >
            Guardar inversion
          </button>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card title="Capital invertido">
            <p className="text-xl font-bold">{formatCurrency(totalInvested, currency)}</p>
          </Card>
          <Card title="Valor actual">
            <p className="text-xl font-bold text-investment">{formatCurrency(totalValue, currency)}</p>
          </Card>
          <Card title="ROI total">
            <p className={`text-xl font-bold ${totalRoi >= 0 ? "text-income" : "text-expense"}`}>{totalRoi.toFixed(2)}%</p>
          </Card>
        </div>

        <Card title="Evolucion del portafolio">
          <PortfolioChart data={chartData} />
        </Card>

        <Card title="Detalle de instrumentos">
          <div className="space-y-2">
            {investments.map((inv) => {
              const roi = inv.capitalInvested > 0 ? ((inv.currentValue - inv.capitalInvested) / inv.capitalInvested) * 100 : 0;
              return (
                <div key={inv.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{inv.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{inv.type}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteInvestment(inv.id)}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-expense"
                    >
                      Eliminar
                    </button>
                  </div>
                  <div className="mb-2 text-sm">
                    <p>Invertido: {formatCurrency(inv.capitalInvested, currency)}</p>
                    <p>Actual: {formatCurrency(inv.currentValue, currency)}</p>
                    <p className={roi >= 0 ? "text-income" : "text-expense"}>ROI: {roi.toFixed(2)}%</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Nuevo valor actual"
                      className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-white/20 dark:bg-slate-900"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          const target = event.currentTarget;
                          const value = Number(target.value);
                          if (value > 0) {
                            updateInvestment(inv.id, { currentValue: value });
                            target.value = "";
                          }
                        }
                      }}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Enter para registrar snapshot</p>
                  </div>
                </div>
              );
            })}
            {investments.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No hay inversiones registradas.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
