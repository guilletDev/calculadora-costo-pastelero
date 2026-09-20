'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Recipe, BaseIngredient } from '@/lib/types';
import { fetchIngredients } from '@/lib/ingredients-db';
import { fetchRecipeById, deleteRecipe } from '@/lib/recipes-db';
import { formatCurrency, sumIngredientCosts, costPerOutputUnit } from '@/lib/cost';
import { costPerUnitLabel } from '@/lib/units';
import { TransitionLink } from '@/components/transition-link';
import { navigateWithTransition } from '@/lib/view-transition';
import { useAppBoot } from '@/components/boot/app-boot-context';
import { createClient } from '@/utils/supabase/client';

export default function SubproductoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const [subproduct, setSubproduct] = useState<Recipe | null>(null);
  const [baseIngredients, setBaseIngredients] = useState<BaseIngredient[]>([]);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const deletingRef = useRef(false);
  const { ready, recipes: bootRecipes, ingredients: bootIngredients, applyLocal } = useAppBoot();

  // Valor hora del perfil (para el desglose de mano de obra)
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('hourly_rate')
        .eq('id', data.user.id)
        .maybeSingle();
      if (cancelled) return;
      setHourlyRate(profile?.hourly_rate ?? 0);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) { navigateWithTransition(router, '/subproductos'); return; }

    const cached = bootRecipes.find(r => r.id === id);
    if (cached) {
      setSubproduct(cached);
      setBaseIngredients(bootIngredients);
      return;
    }

    // Fallback: deep-link o cache fallida → fetch individual
    (async () => {
      try {
        const [found, ingredients] = await Promise.all([
          fetchRecipeById(id),
          fetchIngredients(),
        ]);
        if (!found) { navigateWithTransition(router, '/subproductos'); return; }
        setSubproduct(found);
        setBaseIngredients(ingredients);
      } catch (err) {
        toast.error('Error al cargar datos');
        navigateWithTransition(router, '/subproductos');
      }
    })();
  }, [ready, bootRecipes, bootIngredients, params.id, router]);

  const getIngredientName = (ing: Recipe['ingredients'][number]) =>
    baseIngredients.find(i => i.id === ing.baseIngredientId)?.name ?? ing.ingredientName;

  const handleDelete = () => {
    if (!subproduct) return;
    toast.custom((t) => (
      <div className="w-[360px] rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ fontFamily: "'Manrope', sans-serif" }}>
        <div className="p-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500">
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white">¿Eliminar este subproducto?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">&quot;{subproduct.name}&quot; se eliminará permanentemente.</p>
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
              if (deletingRef.current || isDeleting) return;
              deletingRef.current = true;
              setIsDeleting(true);
              try {
                await deleteRecipe(subproduct.id);
                applyLocal({ recipes: bootRecipes.filter(r => r.id !== subproduct.id) });
                toast.dismiss(t);
                toast.success('Subproducto eliminado');
                navigateWithTransition(router, '/subproductos');
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Error al eliminar');
                setIsDeleting(false);
              } finally {
                deletingRef.current = false;
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

  if (!subproduct) {
    return (
      <main className="mx-auto w-full max-w-[800px] px-5 py-16 text-center">
        <p className="text-slate-400">Cargando subproducto...</p>
      </main>
    );
  }

  const ingredientsCost = sumIngredientCosts(subproduct.ingredients);
  const minutes = subproduct.laborMinutes ?? 0;
  const laborCost = (minutes / 60) * hourlyRate;
  const baseCostPerUnit = costPerOutputUnit(subproduct.totalCost, subproduct.outputQuantity ?? 0);

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-10 space-y-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 font-stitch-label-sm text-stitch-label-sm text-stitch-secondary">
        <TransitionLink href="/subproductos" className="hover:text-stitch-primary transition-colors">Subproductos</TransitionLink>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-stitch-on-surface font-medium truncate">{subproduct.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-stitch-headline-lg text-stitch-headline-lg-mobile md:text-stitch-headline-lg text-stitch-on-surface">{subproduct.name}</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#ffd9de] text-[#b80049] text-[10px] leading-[1.4] tracking-[0.05em] font-semibold whitespace-nowrap">
              Subproducto
            </span>
          </div>
          {subproduct.description && (
            <p className="font-stitch-body-md text-stitch-body-md text-stitch-secondary mt-2 max-w-xl">
              {subproduct.description}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <TransitionLink
            href={`/subproductos/${subproduct.id}/editar`}
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
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-stitch-surface-container-lowest rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary uppercase tracking-widest">Costo Insumos</span>
            <div className="w-8 h-8 rounded-full bg-stitch-surface-container-low flex items-center justify-center text-stitch-primary">
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
            </div>
          </div>
          <div className="font-stitch-numeric-data text-[28px] leading-tight text-stitch-on-surface">{formatCurrency(ingredientsCost)}</div>
        </div>

        <div className="bg-stitch-surface-container-lowest rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary uppercase tracking-widest">Mano de Obra</span>
            <div className="w-8 h-8 rounded-full bg-stitch-surface-container-low flex items-center justify-center text-stitch-primary">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
            </div>
          </div>
          <div className="font-stitch-numeric-data text-[28px] leading-tight text-stitch-on-surface">{formatCurrency(laborCost)}</div>
          {minutes > 0 && (
            <div className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mt-1">
              {minutes} min · {formatCurrency(hourlyRate)}/h
            </div>
          )}
        </div>

        <div className="bg-stitch-surface-container-lowest rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary uppercase tracking-widest">Costo Total</span>
            <div className="w-8 h-8 rounded-full bg-stitch-surface-container-low flex items-center justify-center text-stitch-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">receipt</span>
            </div>
          </div>
          <div className="font-stitch-numeric-data text-[28px] leading-tight text-stitch-on-surface">{formatCurrency(subproduct.totalCost)}</div>
        </div>

        <div className="bg-stitch-primary rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.08)] flex flex-col justify-between text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="font-stitch-label-sm text-stitch-label-sm text-stitch-primary-fixed-dim uppercase tracking-widest">{costPerUnitLabel(subproduct.outputUnit)}</span>
            <div className="w-8 h-8 rounded-full bg-stitch-primary-fixed flex items-center justify-center text-stitch-primary">
              <span className="material-symbols-outlined text-[18px]">sell</span>
            </div>
          </div>
          <div className="font-stitch-numeric-data text-[28px] leading-tight">{formatCurrency(baseCostPerUnit)}</div>
        </div>
      </div>

      {/* Rendimiento */}
      <section className="bg-stitch-surface-container-lowest rounded-[32px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant">
        <h3 className="font-stitch-headline-md text-stitch-headline-md text-stitch-on-surface mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-stitch-primary">monitoring</span>
          Rendimiento
        </h3>
        <div className="space-y-3">
          <p className="font-stitch-body-md text-stitch-body-md text-stitch-secondary">
            Este subproducto puede utilizarse como componente en Productos.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-stitch-surface-container-low rounded-xl p-5 border border-stitch-outline-variant/50">
              <div className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mb-2">Rendimiento</div>
              <div className="font-stitch-numeric-data text-[32px] text-stitch-on-surface">
                {subproduct.outputQuantity}<span className="text-[20px] text-stitch-secondary ml-1">{subproduct.outputUnit}</span>
              </div>
            </div>
            <div className="bg-stitch-surface-container-low rounded-xl p-5 border border-stitch-outline-variant/50">
              <div className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mb-2">Costo base para Productos</div>
              <div className="font-stitch-numeric-data text-[32px] text-stitch-on-surface whitespace-nowrap">
                {formatCurrency(baseCostPerUnit)}<span className="text-[20px] text-stitch-secondary ml-1">/ {subproduct.outputUnit}</span>
              </div>
            </div>
          </div>
          <p className="font-stitch-body-md text-stitch-body-md text-stitch-secondary">
            Productos calculará automáticamente el costo según la cantidad utilizada.
          </p>
        </div>
      </section>

      {/* Insumos */}
      <section className="bg-stitch-surface-container-lowest rounded-[32px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-stitch-headline-md text-stitch-headline-md text-stitch-on-surface">Insumos</h3>
          <span className="font-stitch-numeric-data text-stitch-numeric-data text-stitch-secondary">{formatCurrency(ingredientsCost)}</span>
        </div>
        <div className="divide-y divide-stitch-outline-variant/50">
          {subproduct.ingredients.map((ing) => (
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

    </main>
  );
}