import { useState } from "react";
import { Card } from "../components/ui/Card";
import { useBudgetStore } from "../store/useBudgetStore";
import type { RuleBucket, SourceType } from "../types";

export const CategoriesSourcesPage = () => {
  const store = useBudgetStore();
  const {
    categories,
    subcategories,
    sources,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    addSource,
    updateSource,
    deleteSource,
  } = store;

  const [newCategory, setNewCategory] = useState<{
    name: string;
    icon: string;
    color: string;
    kind: "fixed" | "variable";
    ruleBucket: RuleBucket;
  }>({
    name: "",
    icon: "CARD",
    color: "#3b82f6",
    kind: "variable",
    ruleBucket: "none",
  });
  const [newSubcategory, setNewSubcategory] = useState({ categoryId: "", name: "" });
  const [newSource, setNewSource] = useState({ name: "", type: "expense" as SourceType });

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card title="Categorias de gasto">
        <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-white/10">
          <input
            placeholder="Nombre categoria"
            value={newCategory.name}
            onChange={(event) => setNewCategory((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Icono"
              value={newCategory.icon}
              onChange={(event) => setNewCategory((prev) => ({ ...prev, icon: event.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            />
            <input
              type="color"
              value={newCategory.color}
              onChange={(event) => setNewCategory((prev) => ({ ...prev, color: event.target.value }))}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-1 py-1 dark:border-white/20 dark:bg-slate-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newCategory.kind}
              onChange={(event) => setNewCategory((prev) => ({ ...prev, kind: event.target.value as "fixed" | "variable" }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            >
              <option value="fixed">Fija</option>
              <option value="variable">Variable</option>
            </select>
            <select
              value={newCategory.ruleBucket}
              onChange={(event) => setNewCategory((prev) => ({ ...prev, ruleBucket: event.target.value as RuleBucket }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
            >
              <option value="none">Sin bucket</option>
              <option value="needs">Needs 50%</option>
              <option value="wants">Wants 30%</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!newCategory.name.trim()) return;
              addCategory(newCategory);
              setNewCategory({ ...newCategory, name: "" });
            }}
            className="rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white"
          >
            Agregar categoria
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">
                  {cat.icon} {cat.name}
                </span>
                <button
                  type="button"
                  onClick={() => deleteCategory(cat.id)}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-expense"
                >
                  Eliminar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={cat.kind}
                  onChange={(event) => updateCategory(cat.id, { kind: event.target.value as "fixed" | "variable" })}
                  className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-white/20 dark:bg-slate-900"
                >
                  <option value="fixed">Fija</option>
                  <option value="variable">Variable</option>
                </select>
                <select
                  value={cat.ruleBucket}
                  onChange={(event) => updateCategory(cat.id, { ruleBucket: event.target.value as RuleBucket })}
                  className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-white/20 dark:bg-slate-900"
                >
                  <option value="none">Sin bucket</option>
                  <option value="needs">Needs</option>
                  <option value="wants">Wants</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Subcategorias">
        <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-white/10">
          <select
            value={newSubcategory.categoryId}
            onChange={(event) => setNewSubcategory((prev) => ({ ...prev, categoryId: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          >
            <option value="">Categoria padre</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Nombre subcategoria"
            value={newSubcategory.name}
            onChange={(event) => setNewSubcategory((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={() => {
              if (!newSubcategory.categoryId || !newSubcategory.name.trim()) return;
              addSubcategory(newSubcategory);
              setNewSubcategory({ categoryId: "", name: "" });
            }}
            className="rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white"
          >
            Agregar subcategoria
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {subcategories.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2 text-sm dark:border-white/10">
              <div>
                <p>{sub.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {categories.find((cat) => cat.id === sub.categoryId)?.name ?? "Sin categoria"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const name = prompt("Nuevo nombre", sub.name);
                    if (name) updateSubcategory(sub.id, { name });
                  }}
                  className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-white/20"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => deleteSubcategory(sub.id)}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-expense"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Fuentes (proveedor/comercio/canal)">
        <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-white/10">
          <input
            placeholder="Nombre (ej: Tambo, Rappi, Netflix, Cliente X)"
            value={newSource.name}
            onChange={(event) => setNewSource((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          />
          <select
            value={newSource.type}
            onChange={(event) => setNewSource((prev) => ({ ...prev, type: event.target.value as SourceType }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900"
          >
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="investment">Inversion</option>
            <option value="transfer">Transferencia</option>
          </select>
          <button
            type="button"
            onClick={() => {
              if (!newSource.name.trim()) return;
              addSource(newSource);
              setNewSource((prev) => ({ ...prev, name: "" }));
            }}
            className="rounded-lg bg-investment px-3 py-2 text-sm font-semibold text-white"
          >
            Agregar fuente
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {sources.map((source) => (
            <div key={source.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2 text-sm dark:border-white/10">
              <div>
                <p>{source.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{source.type}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const name = prompt("Nuevo nombre de fuente", source.name);
                    if (name) updateSource(source.id, { name });
                  }}
                  className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-white/20"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => deleteSource(source.id)}
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
  );
};
