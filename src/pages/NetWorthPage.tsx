import { useState } from "react";
import { Card } from "../components/ui/Card";
import { useBudgetStore } from "../store/useBudgetStore";
import type { AssetType, LiabilityType } from "../types";
import { formatCurrency } from "../utils/currency";
import { NetWorthChart } from "../components/charts/NetWorthChart";
import { receivableLoansTotal } from "../utils/loans";

export const NetWorthPage = () => {
  const store = useBudgetStore();
  const {
    currency,
    assets,
    liabilities,
    debts,
    loans,
    loanPayments,
    netWorthHistory,
    addAsset,
    updateAsset,
    deleteAsset,
    addLiability,
    updateLiability,
    deleteLiability,
  } = store;

  const [assetForm, setAssetForm] = useState({ name: "", type: "bank" as AssetType, value: "" });
  const [liabilityForm, setLiabilityForm] = useState({ name: "", type: "debt" as LiabilityType, value: "" });

  const loansReceivable = receivableLoansTotal(loans, loanPayments);
  const manualAssetsTotal = assets.reduce((acc, item) => acc + item.value, 0);
  const totalAssets = manualAssetsTotal + loansReceivable;
  const debtsTotal = debts.reduce((acc, item) => acc + item.remainingBalance, 0);
  const totalLiabilities = liabilities.reduce((acc, item) => acc + item.value, 0) + debtsTotal;
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Activos">
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              placeholder="Nombre activo"
              value={assetForm.name}
              onChange={(event) => setAssetForm((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
            <select
              value={assetForm.type}
              onChange={(event) => setAssetForm((prev) => ({ ...prev, type: event.target.value as AssetType }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            >
              <option value="bank">Cuenta bancaria</option>
              <option value="investment">Inversion</option>
              <option value="property">Propiedad</option>
              <option value="vehicle">Vehiculo</option>
              <option value="other">Otro</option>
            </select>
            <input
              type="number"
              placeholder="Valor"
              value={assetForm.value}
              onChange={(event) => setAssetForm((prev) => ({ ...prev, value: event.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!assetForm.name.trim() || Number(assetForm.value) <= 0) return;
              addAsset({ name: assetForm.name, type: assetForm.type, value: Number(assetForm.value) });
              setAssetForm({ name: "", type: "bank", value: "" });
            }}
            className="mb-3 rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white"
          >
            Agregar activo
          </button>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-dashed border-cyan-300/60 p-2 text-sm dark:border-cyan-500/50">
              <div>
                <p>Prestamos por cobrar</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Calculado automaticamente</p>
              </div>
              <span className="font-semibold text-cyan-500">{formatCurrency(loansReceivable, currency)}</span>
            </div>
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2 text-sm dark:border-white/10">
                <div>
                  <p>{asset.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{asset.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(asset.value, currency)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextValue = prompt("Nuevo valor", String(asset.value));
                      if (!nextValue) return;
                      updateAsset(asset.id, { value: Number(nextValue) });
                    }}
                    className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-white/20"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAsset(asset.id)}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-expense"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Pasivos">
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              placeholder="Nombre pasivo"
              value={liabilityForm.name}
              onChange={(event) => setLiabilityForm((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
            <select
              value={liabilityForm.type}
              onChange={(event) => setLiabilityForm((prev) => ({ ...prev, type: event.target.value as LiabilityType }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            >
              <option value="debt">Deuda</option>
              <option value="mortgage">Hipoteca</option>
              <option value="loan">Prestamo</option>
              <option value="other">Otro</option>
            </select>
            <input
              type="number"
              placeholder="Valor"
              value={liabilityForm.value}
              onChange={(event) => setLiabilityForm((prev) => ({ ...prev, value: event.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!liabilityForm.name.trim() || Number(liabilityForm.value) <= 0) return;
              addLiability({ name: liabilityForm.name, type: liabilityForm.type, value: Number(liabilityForm.value) });
              setLiabilityForm({ name: "", type: "debt", value: "" });
            }}
            className="mb-3 rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white"
          >
            Agregar pasivo
          </button>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-dashed border-red-300/60 p-2 text-sm dark:border-red-500/50">
              <div>
                <p>Deudas registradas</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Calculado automaticamente</p>
              </div>
              <span className="font-semibold text-expense">{formatCurrency(debtsTotal, currency)}</span>
            </div>
            {liabilities.map((liability) => (
              <div key={liability.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2 text-sm dark:border-white/10">
                <div>
                  <p>{liability.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{liability.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(liability.value, currency)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextValue = prompt("Nuevo valor", String(liability.value));
                      if (!nextValue) return;
                      updateLiability(liability.id, { value: Number(nextValue) });
                    }}
                    className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-white/20"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteLiability(liability.id)}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-expense"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Patrimonio neto">
        <div className="mb-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <p>Activos: {formatCurrency(totalAssets, currency)}</p>
          <p>Pasivos: {formatCurrency(totalLiabilities, currency)}</p>
          <p className={`font-semibold ${netWorth >= 0 ? "text-income" : "text-expense"}`}>
            Activos - Pasivos = {formatCurrency(netWorth, currency)}
          </p>
        </div>
        <NetWorthChart data={netWorthHistory} />
      </Card>
    </div>
  );
};
