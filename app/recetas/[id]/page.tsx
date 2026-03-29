'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Recipe, BaseIngredient } from '@/lib/types';
import { storage } from '@/lib/storage';

const QUICK_QUANTITIES = [
  { label: '½ doc.', value: 6 },
  { label: '1 doc.', value: 12 },
  { label: '2 doc.', value: 24 },
  { label: '3 doc.', value: 36 },
];

export default function RecetaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [baseIngredients, setBaseIngredients] = useState<BaseIngredient[]>([]);
  const [budgetQty, setBudgetQty] = useState('');

  useEffect(() => {
    const recipes = storage.getRecipes();
    const found = recipes.find(r => r.id === params.id);
    if (!found) { router.push('/recetas'); return; }
    setRecipe(found);
    setBaseIngredients(storage.getIngredients());
  }, [params.id]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

  const getIngredientName = (id: string) =>
    baseIngredients.find(i => i.id === id)?.name ?? 'Ingrediente';

  const handleDelete = () => {
    if (!recipe) return;
    toast('¿Eliminar esta receta?', {
      description: `"${recipe.name}" se eliminará permanentemente.`,
      action: {
        label: 'Eliminar',
        onClick: () => {
          const updated = storage.getRecipes().filter(r => r.id !== recipe.id);
          storage.saveRecipes(updated);
          router.push('/recetas');
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {},
      },
      duration: 8000,
    });
  };

  if (!recipe) {
    return (
      <main className="mx-auto w-full max-w-[800px] px-5 py-16 text-center">
        <p className="text-slate-400">Cargando receta...</p>
      </main>
    );
  }

  const budgetTotal = recipe.costPerUnit * (parseFloat(budgetQty) || 0);

  const extraCostsTotal =
    (recipe.extraCosts.packaging || 0) +
    (recipe.extraCosts.bags || 0) +
    (recipe.extraCosts.labels || 0) +
    (recipe.extraCosts.shipping || 0) +
    (recipe.extraCosts.others || 0);

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-8 space-y-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/recetas" className="hover:text-[#ee2b6c] transition-colors">Recetas</Link>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{recipe.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{recipe.name}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {recipe.unitsProduced} porciones · {recipe.profitMargin ?? 0}% de margen de ganancia
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/?edit=${recipe.id}#recipe-builder`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-bold hover:border-[#ee2b6c] hover:text-[#ee2b6c] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Editar
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-red-200 text-red-400 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            Eliminar
          </button>
        </div>
      </div>

      {/* Resumen de costos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Costo Ingredientes', value: formatCurrency(recipe.totalCost - extraCostsTotal), icon: 'egg' },
          { label: 'Costos Adicionales', value: formatCurrency(extraCostsTotal), icon: 'inventory' },
          { label: 'Costo Total Neto', value: formatCurrency(recipe.totalCost), icon: 'receipt' },
          { label: 'Costo por Porción', value: formatCurrency(recipe.costPerUnit), icon: 'cake', highlight: true },
        ].map(({ label, value, icon, highlight }) => (
          <div
            key={label}
            className={`rounded-xl p-4 border ${
              highlight
                ? 'bg-[#ee2b6c] text-white border-transparent shadow-md shadow-[#ee2b6c]/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${highlight ? 'text-white/80' : 'text-[#ee2b6c]'}`}>{icon}</span>
            <p className={`text-xs font-bold mt-2 uppercase tracking-wide ${highlight ? 'text-white/70' : 'text-slate-400'}`}>{label}</p>
            <p className={`text-xl font-black mt-0.5 ${highlight ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingredientes */}
        <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ee2b6c]">menu_book</span>
            <h3 className="font-bold text-base">Ingredientes</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recipe.ingredients.map((ing) => (
              <div key={ing.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{getIngredientName(ing.baseIngredientId)}</p>
                  <p className="text-xs text-slate-400">{ing.quantityUsed} {ing.unit}</p>
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(ing.cost)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Costos adicionales */}
        <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ee2b6c]">local_shipping</span>
            <h3 className="font-bold text-base">Costos Adicionales</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              { label: 'Packaging / Cajas', value: recipe.extraCosts.packaging },
              { label: 'Bolsas / Stickers', value: recipe.extraCosts.bags },
              { label: 'Envío / Logística', value: recipe.extraCosts.shipping },
              { label: 'Etiquetas', value: recipe.extraCosts.labels },
              { label: 'Otros', value: recipe.extraCosts.others },
            ]
              .filter(item => item.value > 0)
              .map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(value)}</p>
                </div>
              ))}
            {extraCostsTotal === 0 && (
              <div className="px-5 py-6 text-center text-sm text-slate-400">Sin costos adicionales registrados.</div>
            )}
          </div>
          {extraCostsTotal > 0 && (
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-between">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Total adicionales</span>
              <span className="text-sm font-black text-[#ee2b6c]">{formatCurrency(extraCostsTotal)}</span>
            </div>
          )}
        </section>
      </div>

      {/* Presupuesto para pedido */}
      <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#ee2b6c]">shopping_bag</span>
          <div>
            <h3 className="font-bold text-base">Presupuesto para Pedido</h3>
            <p className="text-xs text-slate-400 mt-0.5">Calculá el costo de un pedido por cantidad</p>
          </div>
        </div>
        <div className="p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="w-full sm:w-auto space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Cantidad de unidades</label>
              <input
                className="w-full sm:w-44 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c]"
                type="number" min="1" placeholder="Ej: 30"
                value={budgetQty}
                onChange={(e) => setBudgetQty(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 sm:opacity-0 block select-none">Rápido</label>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUANTITIES.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setBudgetQty(String(value))}
                    className={`px-3 py-2.5 rounded-md text-xs font-bold transition-all ${
                      budgetQty === String(value)
                        ? 'bg-[#ee2b6c] text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {parseFloat(budgetQty) > 0 ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-4 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Cantidad</p>
                <p className="text-2xl font-black text-slate-700 dark:text-slate-200">
                  {parseFloat(budgetQty)} <span className="text-base font-semibold text-slate-400">und.</span>
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-4 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Costo por unidad</p>
                <p className="text-2xl font-black text-slate-700 dark:text-slate-200">{formatCurrency(recipe.costPerUnit)}</p>
              </div>
              <div className="bg-[#ee2b6c] rounded-md p-4 text-center shadow-md shadow-[#ee2b6c]/20">
                <p className="text-xs font-bold text-white/80 uppercase tracking-wide mb-1">Total del Pedido</p>
                <p className="text-2xl font-black text-white">{formatCurrency(budgetTotal)}</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 px-4 py-6 rounded-md bg-slate-50 dark:bg-slate-800/30 text-center text-sm text-slate-400">
              Ingresá una cantidad para calcular el presupuesto del pedido.
            </div>
          )}
        </div>
      </section>

    </main>
  );
}
