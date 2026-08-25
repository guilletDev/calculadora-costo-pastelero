'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Recipe, BaseIngredient } from '@/lib/types';
import { fetchIngredients } from '@/lib/ingredients-db';
import { fetchRecipeById, deleteRecipe } from '@/lib/recipes-db';
import { formatCurrency, sumExtraCosts, calculateRawCostPerUnit, costPerOutputUnit as calculateCostPerOutputUnit } from '@/lib/cost';
import { TransitionLink } from '@/components/transition-link';
import { navigateWithTransition } from '@/lib/view-transition';

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

  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const id = Array.isArray(params.id) ? params.id[0] : params.id;
        if (!id) { navigateWithTransition(router, '/recetas'); return; }
        const [found, ingredients] = await Promise.all([
          fetchRecipeById(id),
          fetchIngredients(),
        ]);
        if (!found) { navigateWithTransition(router, '/recetas'); return; }
        setRecipe(found);
        setBaseIngredients(ingredients);
      } catch (err) {
        toast.error('Error al cargar datos');
        navigateWithTransition(router, '/recetas');
      }
    }
    loadData();
  }, [params.id, router]);

  const getIngredientName = (ing: Recipe['ingredients'][number]) =>
    baseIngredients.find(i => i.id === ing.baseIngredientId)?.name ?? ing.ingredientName;

  const handleDelete = () => {
    if (!recipe) return;
    toast.custom((t) => (
      <div className="w-[360px] rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ fontFamily: "'Manrope', sans-serif" }}>
        <div className="p-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500">
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white">¿Eliminar esta receta?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">&quot;{recipe.name}&quot; se eliminará permanentemente.</p>
          </div>
        </div>
        <div className="flex border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              setIsDeleting(true);
              try {
                await deleteRecipe(recipe.id);
                toast.dismiss(t);
                toast.success('Receta eliminada');
                navigateWithTransition(router, '/recetas');
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Error al eliminar');
                setIsDeleting(false);
              }
            }}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-[#ee2b6c] hover:bg-[#ee2b6c]/5 transition-colors border-l border-slate-100 dark:border-slate-800 disabled:opacity-50"
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    ), { duration: 10000 });
  };

  if (!recipe) {
    return (
      <main className="mx-auto w-full max-w-[800px] px-5 py-16 text-center">
        <p className="text-slate-400">Cargando receta...</p>
      </main>
    );
  }

  const budgetTotal = recipe.costPerUnit * (parseFloat(budgetQty) || 0);
  const costPerUnitWithoutMargin = calculateRawCostPerUnit(recipe.totalCost, recipe.unitsProduced);
  const costPerOutputUnit = calculateCostPerOutputUnit(recipe.totalCost, recipe.outputQuantity ?? 0);
  const budgetNetProfit = budgetTotal - (costPerUnitWithoutMargin * (parseFloat(budgetQty) || 0));

  const extraCostsTotal = sumExtraCosts(recipe.extraCosts);

  const salePricePerUnit = recipe.costPerUnit;
  const totalSale = salePricePerUnit * recipe.unitsProduced;
  const netProfit = totalSale - recipe.totalCost;

  const hasOutput = !!(recipe.outputQuantity && recipe.outputQuantity > 0 && recipe.outputUnit);
  const hasPorciones = recipe.unitsProduced > 0;

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-10 space-y-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 font-stitch-label-sm text-stitch-label-sm text-stitch-secondary">
        <TransitionLink href="/recetas" className="hover:text-stitch-primary transition-colors">Recetas</TransitionLink>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-stitch-on-surface font-medium truncate">{recipe.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="font-stitch-headline-lg text-stitch-headline-lg-mobile md:text-stitch-headline-lg text-stitch-on-surface">{recipe.name}</h2>
            {hasPorciones && (
              <p className="font-stitch-body-lg text-stitch-body-lg text-stitch-secondary mt-1">
                {recipe.unitsProduced} porciones · {recipe.profitMargin ?? 0}% de ganancia
              </p>
            )}
        </div>
        <div className="flex gap-3">
          <TransitionLink
            href={`/calculadora?edit=${recipe.id}#recipe-builder`}
            className="flex items-center gap-2 px-6 py-3 border border-stitch-outline-variant rounded-xl text-stitch-on-surface hover:bg-stitch-surface-container-low transition-colors font-stitch-label-sm text-stitch-label-sm"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Editar
          </TransitionLink>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-6 py-3 border border-stitch-outline-variant rounded-xl text-stitch-error hover:bg-stitch-error-container hover:border-stitch-error-container transition-colors font-stitch-label-sm text-stitch-label-sm"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            Eliminar
          </button>
        </div>
      </div>

      {/* Resumen de costos */}
      {(hasPorciones || hasOutput) && (
        <div className={`grid gap-6 ${hasPorciones ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
          {hasPorciones && (
            <>
              {[
                { label: 'Costo Ingredientes', value: formatCurrency(recipe.totalCost - extraCostsTotal), icon: 'egg' },
                { label: 'Costos Adicionales', value: formatCurrency(extraCostsTotal), icon: 'inventory' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-stitch-surface-container-lowest rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary uppercase tracking-widest">{label}</span>
                    <div className="w-8 h-8 rounded-full bg-stitch-surface-container-low flex items-center justify-center text-stitch-primary">
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    </div>
                  </div>
                  <div className="font-stitch-numeric-data text-[28px] leading-tight text-stitch-on-surface">{value}</div>
                </div>
              ))}
            </>
          )}
          <div className="bg-stitch-surface-container-lowest rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary uppercase tracking-widest">Precio de Costo</span>
              <div className="w-8 h-8 rounded-full bg-stitch-surface-container-low flex items-center justify-center text-stitch-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">receipt</span>
              </div>
            </div>
            <div className={`font-stitch-numeric-data leading-tight text-stitch-on-surface ${!hasPorciones && hasOutput ? 'text-[36px]' : 'text-[28px]'}`}>{formatCurrency(recipe.totalCost)}</div>
          </div>
          {hasPorciones && (
            <div className="bg-stitch-primary rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.08)] flex flex-col justify-between text-white">
              <div className="flex items-center justify-between mb-4">
                <span className="font-stitch-label-sm text-stitch-label-sm text-stitch-primary-fixed-dim uppercase tracking-widest">Precio de Venta</span>
                <div className="w-8 h-8 rounded-full bg-stitch-primary-fixed flex items-center justify-center text-stitch-primary">
                  <span className="material-symbols-outlined text-[18px]">cake</span>
                </div>
              </div>
              <div className="font-stitch-numeric-data text-[28px] leading-tight">{formatCurrency(recipe.costPerUnit)}</div>
            </div>
          )}
        </div>
      )}

      {/* Precio de venta y ganancia */}
      {hasPorciones && (
        <section className="bg-stitch-surface-container-lowest rounded-[32px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-primary/20">
          <h3 className="font-stitch-headline-md text-stitch-headline-md text-stitch-on-surface mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-stitch-primary">trending_up</span>
            Precio de Venta y Ganancia
          </h3>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mb-1">Porciones</div>
              <div className="font-stitch-numeric-data text-[24px] text-stitch-on-surface">{recipe.unitsProduced}</div>
            </div>
            <div>
              <div className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mb-1">Precio x Porción</div>
              <div className="font-stitch-numeric-data text-[24px] text-stitch-on-surface">{formatCurrency(salePricePerUnit)}</div>
            </div>
          </div>
          <div className="border-t border-stitch-outline-variant pt-4 mt-2 grid grid-cols-2 gap-6">
            <div>
              <div className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mb-1">Total Venta</div>
              <div className="font-stitch-numeric-data text-[24px] text-stitch-on-surface">{formatCurrency(totalSale)}</div>
            </div>
            <div>
              <div className="font-stitch-label-sm text-stitch-label-sm text-stitch-primary mb-1">Ganancia Neta</div>
              <div className={`font-stitch-numeric-data text-[24px] font-bold ${netProfit > 0 ? 'text-emerald-600' : 'text-stitch-on-surface'}`}>{formatCurrency(netProfit)}</div>
            </div>
          </div>
        </section>
      )}

      {/* Rendimiento total */}
      {hasOutput && (
        <section className="bg-stitch-surface-container-lowest rounded-[32px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant">
          <h3 className="font-stitch-headline-md text-stitch-headline-md text-stitch-on-surface mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-stitch-primary">monitoring</span>
            Rendimiento total
          </h3>
          <div className="space-y-3">
            <p className="font-stitch-body-md text-stitch-body-md text-stitch-secondary">
              Esta receta puede utilizarse como componente en Productos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-stitch-surface-container-low rounded-xl p-5 border border-stitch-outline-variant/50">
                <div className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mb-2">Rendimiento</div>
                <div className="font-stitch-numeric-data text-[32px] text-stitch-on-surface">
                  {recipe.outputQuantity}<span className="text-[20px] text-stitch-secondary ml-1">{recipe.outputUnit}</span>
                </div>
              </div>
              <div className="bg-stitch-surface-container-low rounded-xl p-5 border border-stitch-outline-variant/50">
                <div className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mb-2">Costo base para Productos</div>
                <div className="font-stitch-numeric-data text-[32px] text-stitch-on-surface whitespace-nowrap">
                  {formatCurrency(costPerOutputUnit)}<span className="text-[20px] text-stitch-secondary ml-1">/ {recipe.outputUnit}</span>
                </div>
              </div>
            </div>
            <p className="font-stitch-body-md text-stitch-body-md text-stitch-secondary">
              Productos calculará automáticamente el costo según la cantidad utilizada.
            </p>
          </div>
        </section>
      )}

      <div className={`grid gap-8 ${hasPorciones ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Ingredientes */}
        <section className="bg-stitch-surface-container-lowest rounded-[32px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-stitch-headline-md text-stitch-headline-md text-stitch-on-surface">Ingredientes</h3>
          </div>
          <div className="divide-y divide-stitch-outline-variant/50">
            {recipe.ingredients.map((ing) => (
              <div key={ing.id} className="flex justify-between items-center py-3">
                <div className="flex flex-col">
                  <span className="font-stitch-body-md text-stitch-body-md font-medium text-stitch-on-surface">{getIngredientName(ing)}</span>
                  <span className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary font-normal mt-1">{ing.quantityUsed} {ing.unit}</span>
                </div>
                <span className="font-stitch-numeric-data text-[18px] text-stitch-on-surface">{formatCurrency(ing.cost)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Costos adicionales */}
        {hasPorciones && (
          <section className="bg-stitch-surface-container-lowest rounded-[32px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-stitch-headline-md text-stitch-headline-md text-stitch-on-surface">Costos Adicionales</h3>
            {extraCostsTotal > 0 && (
              <span className="font-stitch-numeric-data text-stitch-numeric-data text-stitch-secondary">{formatCurrency(extraCostsTotal)}</span>
            )}
          </div>
          <div className="divide-y divide-stitch-outline-variant/50">
            {[
              { label: 'Packaging / Cajas', value: recipe.extraCosts.packaging },
              { label: 'Bolsas / Stickers', value: recipe.extraCosts.bags },
              { label: 'Envío / Logística', value: recipe.extraCosts.shipping },
              { label: 'Etiquetas', value: recipe.extraCosts.labels },
              { label: 'Otros', value: recipe.extraCosts.others },
            ]
              .filter(item => item.value > 0)
              .map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-3">
                  <span className="font-stitch-body-md text-stitch-body-md text-stitch-on-surface">{label}</span>
                  <span className="font-stitch-numeric-data text-[18px] text-stitch-on-surface">{formatCurrency(value)}</span>
                </div>
              ))}
            {extraCostsTotal === 0 && (
              <div className="py-6 text-center font-stitch-body-md text-stitch-secondary">Sin costos adicionales registrados.</div>
            )}
          </div>
        </section>
        )}
      </div>

      {/* Presupuesto para pedido */}
      {hasPorciones && (
        <section className="bg-stitch-surface-container-low rounded-[32px] p-8 lg:p-12 shadow-sm border border-stitch-outline-variant/30 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-stitch-primary/5 to-transparent pointer-events-none hidden lg:block"></div>
          <div className="relative z-10">
            <h3 className="font-stitch-headline-lg text-stitch-headline-lg-mobile md:text-stitch-headline-lg text-stitch-on-surface mb-3">Presupuesto para Pedido</h3>
            <p className="font-stitch-body-lg text-stitch-body-lg text-stitch-secondary mb-6">Calculá el costo de un pedido por cantidad</p>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="w-full sm:w-48 space-y-2">
                <label className="block font-stitch-label-sm text-stitch-label-sm text-stitch-secondary">Cantidad de unidades</label>
                <input
                  className="w-full bg-stitch-surface-container-lowest border border-stitch-outline-variant rounded-xl px-4 py-3 font-stitch-numeric-data text-stitch-numeric-data text-stitch-on-surface focus:outline-none focus:border-stitch-primary focus:ring-1 focus:ring-stitch-primary shadow-sm"
                  type="number" min="1" placeholder="Ej: 30"
                  value={budgetQty}
                  onChange={(e) => setBudgetQty(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 pb-0.5">
                {QUICK_QUANTITIES.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setBudgetQty(String(value))}
                    className={`px-4 py-2 rounded-lg font-stitch-label-sm text-stitch-label-sm transition-all ${
                      budgetQty === String(value)
                        ? 'bg-stitch-primary text-white shadow-sm'
                        : 'bg-stitch-surface-container-lowest border border-stitch-outline-variant text-stitch-secondary hover:bg-stitch-surface-container-low'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {parseFloat(budgetQty) > 0 ? (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-stitch-surface-container-lowest rounded-xl p-4 text-center">
                  <p className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mb-1">Cantidad</p>
                  <p className="font-stitch-numeric-data text-xl md:text-[24px] text-stitch-on-surface">
                    {parseFloat(budgetQty)} <span className="text-stitch-secondary">und.</span>
                  </p>
                </div>
                <div className="bg-stitch-surface-container-lowest rounded-xl p-4 text-center">
                  <p className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mb-1">Precio por unidad</p>
                  <p className="font-stitch-numeric-data text-xl md:text-[24px] text-stitch-on-surface">{formatCurrency(recipe.costPerUnit)}</p>
                </div>
                <div className="bg-stitch-primary rounded-xl p-4 text-center shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
                  <p className="font-stitch-label-sm text-stitch-label-sm text-stitch-primary-fixed-dim mb-1">Total del Pedido</p>
                  <p className="font-stitch-numeric-data text-xl md:text-[24px] text-white">{formatCurrency(budgetTotal)}</p>
                </div>
                <div className="bg-stitch-surface-container-lowest rounded-xl p-4 text-center">
                  <p className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mb-1">Ganancia Neta</p>
                  <p className={`font-stitch-numeric-data text-xl md:text-[24px] font-bold ${budgetNetProfit > 0 ? 'text-emerald-600' : 'text-stitch-on-surface'}`}>{formatCurrency(budgetNetProfit)}</p>
                </div>
              </div>
            ) : (
              <div className="mt-6 bg-stitch-surface-container-lowest rounded-xl p-6 border border-stitch-outline-variant/50 text-center">
                <p className="font-stitch-body-md text-stitch-secondary">Ingresá una cantidad para calcular el presupuesto del pedido.</p>
              </div>
            )}
          </div>
        </section>
      )}

    </main>
  );
}
