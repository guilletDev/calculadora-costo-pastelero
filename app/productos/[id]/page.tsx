'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Product } from '@/lib/types';
import { fetchProductById, deleteProduct } from '@/lib/products-db';
import { formatCurrency, sumIngredientCosts, sumExtraCosts, calculateSalePrice } from '@/lib/cost';
import { TransitionLink } from '@/components/transition-link';
import { navigateWithTransition } from '@/lib/view-transition';

export default function ProductoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const id = Array.isArray(params.id) ? params.id[0] : params.id;
        if (!id) { navigateWithTransition(router, '/productos'); return; }
        const found = await fetchProductById(id);
        if (!found) { navigateWithTransition(router, '/productos'); return; }
        setProduct(found);
      } catch (err) {
        toast.error('Error al cargar datos');
        navigateWithTransition(router, '/productos');
      }
    }
    loadData();
  }, [params.id, router]);

  const handleDelete = () => {
    if (!product) return;
    toast.custom((t) => (
      <div className="w-[360px] rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ fontFamily: "'Manrope', sans-serif" }}>
        <div className="p-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500">
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white">¿Eliminar este producto?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">&quot;{product.name}&quot; se eliminará permanentemente.</p>
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
                await deleteProduct(product.id);
                toast.dismiss(t);
                toast.success('Producto eliminado');
                navigateWithTransition(router, '/productos');
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

  if (!product) {
    return (
      <main className="mx-auto w-full max-w-[800px] px-5 py-16 text-center">
        <p className="text-slate-400">Cargando producto...</p>
      </main>
    );
  }

  const componentsCost = sumIngredientCosts(product.components);
  const extraCostsTotal = sumExtraCosts(product.extraCosts);
  const salePrice = calculateSalePrice(product.totalCost, product.profitMargin);
  const netProfit = salePrice - product.totalCost;

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-10 space-y-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 font-stitch-label-sm text-stitch-label-sm text-stitch-secondary">
        <TransitionLink href="/productos" className="hover:text-stitch-primary transition-colors">Productos</TransitionLink>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-stitch-on-surface font-medium truncate">{product.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="font-stitch-headline-lg text-stitch-headline-lg-mobile md:text-stitch-headline-lg text-stitch-on-surface">{product.name}</h2>
          <p className="font-stitch-body-lg text-stitch-body-lg text-stitch-secondary mt-1">
            {product.components.length} componente{product.components.length !== 1 ? 's' : ''} · {product.profitMargin}% de margen
          </p>
          {product.description && (
            <p className="font-stitch-body-md text-stitch-body-md text-stitch-secondary mt-2 max-w-xl">
              {product.description}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <TransitionLink
            href={`/productos/${product.id}/editar`}
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
            <span className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary uppercase tracking-widest">Costo Componentes</span>
            <div className="w-8 h-8 rounded-full bg-stitch-surface-container-low flex items-center justify-center text-stitch-primary">
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
            </div>
          </div>
          <div className="font-stitch-numeric-data text-[28px] leading-tight text-stitch-on-surface">{formatCurrency(componentsCost)}</div>
        </div>

        <div className="bg-stitch-surface-container-lowest rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary uppercase tracking-widest">Costos Adicionales</span>
            <div className="w-8 h-8 rounded-full bg-stitch-surface-container-low flex items-center justify-center text-stitch-primary">
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            </div>
          </div>
          <div className="font-stitch-numeric-data text-[28px] leading-tight text-stitch-on-surface">{formatCurrency(extraCostsTotal)}</div>
        </div>

        <div className="bg-stitch-surface-container-lowest rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary uppercase tracking-widest">Costo Total</span>
            <div className="w-8 h-8 rounded-full bg-stitch-surface-container-low flex items-center justify-center text-stitch-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">receipt</span>
            </div>
          </div>
          <div className="font-stitch-numeric-data text-[28px] leading-tight text-stitch-on-surface">{formatCurrency(product.totalCost)}</div>
        </div>

        <div className="bg-stitch-primary rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.08)] flex flex-col justify-between text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="font-stitch-label-sm text-stitch-label-sm text-stitch-primary-fixed-dim uppercase tracking-widest">Precio de Venta</span>
            <div className="w-8 h-8 rounded-full bg-stitch-primary-fixed flex items-center justify-center text-stitch-primary">
              <span className="material-symbols-outlined text-[18px]">sell</span>
            </div>
          </div>
          <div className="font-stitch-numeric-data text-[28px] leading-tight">{formatCurrency(salePrice)}</div>
        </div>
      </div>

      {/* Precio de Venta y Ganancia */}
      <section className="bg-stitch-surface-container-lowest rounded-[32px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-primary/20">
        <h3 className="font-stitch-headline-md text-stitch-headline-md text-stitch-on-surface mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-stitch-primary">trending_up</span>
          Precio de Venta y Ganancia
        </h3>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mb-1">Margen de Ganancia</div>
            <div className="font-stitch-numeric-data text-[24px] text-stitch-on-surface">{product.profitMargin}%</div>
          </div>
          <div>
            <div className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mb-1">Precio de Venta</div>
            <div className="font-stitch-numeric-data text-[24px] text-stitch-on-surface">{formatCurrency(salePrice)}</div>
          </div>
        </div>
        <div className="border-t border-stitch-outline-variant pt-4 mt-2 grid grid-cols-2 gap-6">
          <div>
            <div className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mb-1">Costo Total</div>
            <div className="font-stitch-numeric-data text-[24px] text-stitch-on-surface">{formatCurrency(product.totalCost)}</div>
          </div>
          <div>
            <div className="font-stitch-label-sm text-stitch-label-sm text-stitch-primary mb-1">Ganancia Neta</div>
            <div className={`font-stitch-numeric-data text-[24px] font-bold ${netProfit > 0 ? 'text-emerald-600' : 'text-stitch-on-surface'}`}>{formatCurrency(netProfit)}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        {/* Componentes */}
        <section className="bg-stitch-surface-container-lowest rounded-[32px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-stitch-headline-md text-stitch-headline-md text-stitch-on-surface">Componentes</h3>
            <span className="font-stitch-numeric-data text-stitch-numeric-data text-stitch-secondary">{formatCurrency(componentsCost)}</span>
          </div>
          <div className="divide-y divide-stitch-outline-variant/50">
            {product.components.map(component => (
              <div key={component.id} className="flex justify-between items-center py-3">
                <div className="flex flex-col">
                  <span className="font-stitch-body-md text-stitch-body-md font-medium text-stitch-on-surface">
                    {component.recipeName ?? component.ingredientName ?? 'Componente'}
                  </span>
                  <span className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary font-normal mt-1">
                    {component.componentType === 'recipe' ? 'Subproducto' : 'Ingrediente'} · {component.quantityUsed} {component.unit}
                  </span>
                </div>
                <span className="font-stitch-numeric-data text-[18px] text-stitch-on-surface">{formatCurrency(component.cost)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Costos adicionales */}
        <section className="bg-stitch-surface-container-lowest rounded-[32px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-stitch-headline-md text-stitch-headline-md text-stitch-on-surface">Costos Adicionales</h3>
            {extraCostsTotal > 0 && (
              <span className="font-stitch-numeric-data text-stitch-numeric-data text-stitch-secondary">{formatCurrency(extraCostsTotal)}</span>
            )}
          </div>
          <div className="divide-y divide-stitch-outline-variant/50">
            {[
              { label: 'Packaging / Cajas', value: product.extraCosts.packaging },
              { label: 'Bolsas / Stickers', value: product.extraCosts.bags },
              { label: 'Envío / Logística', value: product.extraCosts.shipping },
              { label: 'Etiquetas', value: product.extraCosts.labels },
              { label: 'Otros', value: product.extraCosts.others },
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
      </div>

      {/* Nota: costo base sin margen */}
      <section className="bg-stitch-surface-container-low rounded-[32px] p-8 border border-stitch-outline-variant/30">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-stitch-primary text-[20px] mt-0.5">info</span>
          <p className="font-stitch-body-md text-stitch-body-md text-stitch-secondary">
            El costo de los componentes se calcula con el costo real de cada receta (sin margen).
            El margen de {product.profitMargin}% se aplica únicamente a este producto final.
          </p>
        </div>
      </section>

    </main>
  );
}