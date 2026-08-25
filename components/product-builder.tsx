'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Product, Recipe, Unit } from '@/lib/types';
import { fetchRecipes } from '@/lib/recipes-db';
import { fetchProductById, upsertProduct } from '@/lib/products-db';
import { formatCurrency, proportionalCost, calculateTotalCost, sumIngredientCosts, sumExtraCosts, calculateSalePrice, costPerOutputUnit } from '@/lib/cost';
import { toBaseQuantity } from '@/lib/units';
import { navigateWithTransition } from '@/lib/view-transition';

interface ProductRecipeDraft {
  recipeId: string | null;
  recipeName: string;
  quantityUsed: string;
  unit: Unit;
  cost: number;
}

interface ProductDraft {
  name: string;
  recipes: ProductRecipeDraft[];
  extraCosts: Record<string, string>;
  profitMargin: string;
}

interface ProductBuilderProps {
  productId?: string;
}

const QUICK_MARGINS = [10, 20, 30, 40];

const EXTRA_COST_FIELDS = [
  { key: 'packaging', label: 'Packaging / Cajas' },
  { key: 'bags', label: 'Bolsas / Stickers' },
  { key: 'shipping', label: 'Envío / Logística' },
  { key: 'labels', label: 'Etiquetas' },
  { key: 'others', label: 'Otros' },
];

export function ProductBuilder({ productId }: ProductBuilderProps) {
  const router = useRouter();
  const [eligibleRecipes, setEligibleRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');

  const defaultDraft: ProductDraft = {
    name: '',
    recipes: [],
    extraCosts: { packaging: '', bags: '', labels: '', shipping: '', others: '' },
    profitMargin: '',
  };

  const [draft, setDraft] = useState<ProductDraft>(defaultDraft);

  useEffect(() => {
    const loadData = async () => {
      try {
        const recipes = await fetchRecipes();
        const eligible = recipes.filter(r => r.outputQuantity != null && r.outputUnit != null);
        setEligibleRecipes(eligible);

        if (productId) {
          const product = await fetchProductById(productId);
          if (!product) {
            navigateWithTransition(router, '/productos');
            return;
          }
          setDraft({
            name: product.name,
            recipes: product.recipes.map(r => ({
              recipeId: r.recipeId,
              recipeName: r.recipeName,
              quantityUsed: String(r.quantityUsed),
              unit: r.unit,
              cost: r.cost,
            })),
            extraCosts: {
              packaging: String(product.extraCosts.packaging || ''),
              bags: String(product.extraCosts.bags || ''),
              labels: String(product.extraCosts.labels || ''),
              shipping: String(product.extraCosts.shipping || ''),
              others: String(product.extraCosts.others || ''),
            },
            profitMargin: String(product.profitMargin || ''),
          });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [productId, router]);

  const computeCost = (recipeId: string | null, quantityUsed: string, unit: Unit, fallback?: number): number => {
    const recipe = eligibleRecipes.find(r => r.id === recipeId);
    if (!recipe || recipe.outputQuantity == null) return fallback ?? 0;
    const qty = toBaseQuantity(parseFloat(quantityUsed) || 0, unit);
    return proportionalCost(recipe.totalCost, recipe.outputQuantity, qty);
  };

  const addRecipeToProduct = () => {
    if (!selectedRecipeId) return;
    const recipe = eligibleRecipes.find(r => r.id === selectedRecipeId);
    if (!recipe || recipe.outputUnit == null) return;
    const row: ProductRecipeDraft = {
      recipeId: recipe.id,
      recipeName: recipe.name,
      quantityUsed: '',
      unit: recipe.outputUnit,
      cost: 0,
    };
    setDraft({ ...draft, recipes: [...draft.recipes, row] });
    setSelectedRecipeId('');
  };

  const updateRecipeRow = (index: number, patch: Partial<ProductRecipeDraft>) => {
    setDraft(prev => {
      const rows = prev.recipes.map((row, i) => (i === index ? { ...row, ...patch } : row));
      return { ...prev, recipes: rows };
    });
  };

  const updateRowQuantity = (index: number, quantityUsed: string) => {
    setDraft(prev => {
      const rows = prev.recipes.map((row, i) => {
        if (i !== index) return row;
        const cost = computeCost(row.recipeId, quantityUsed, row.unit, row.cost);
        return { ...row, quantityUsed, cost };
      });
      return { ...prev, recipes: rows };
    });
  };

  const updateRowUnit = (index: number, unit: Unit) => {
    setDraft(prev => {
      const rows = prev.recipes.map((row, i) => {
        if (i !== index) return row;
        const cost = computeCost(row.recipeId, row.quantityUsed, unit, row.cost);
        return { ...row, unit, cost };
      });
      return { ...prev, recipes: rows };
    });
  };

  const removeRecipeFromProduct = (index: number) => {
    setDraft(prev => ({
      ...prev,
      recipes: prev.recipes.filter((_, i) => i !== index),
    }));
  };

  const getBaseCostPerUnit = (row: ProductRecipeDraft): number | null => {
    const recipe = eligibleRecipes.find(r => r.id === row.recipeId);
    if (!recipe || recipe.outputQuantity == null) return null;
    return costPerOutputUnit(recipe.totalCost, recipe.outputQuantity);
  };

  const recipesCost = sumIngredientCosts(draft.recipes);
  const extraCostsTotal = sumExtraCosts(draft.extraCosts);
  const totalCost = calculateTotalCost(recipesCost, extraCostsTotal);
  const margin = parseFloat(draft.profitMargin) || 0;
  const salePrice = calculateSalePrice(totalCost, margin);

  const canSave = draft.name.trim() !== '' && draft.recipes.length > 0;

  const saveProduct = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const payload: Omit<Product, 'id'> = {
        name: draft.name.trim(),
        recipes: draft.recipes.map(r => ({
          id: crypto.randomUUID(),
          recipeId: r.recipeId,
          recipeName: r.recipeName,
          quantityUsed: parseFloat(r.quantityUsed) || 0,
          unit: r.unit,
          cost: r.cost,
        })),
        extraCosts: {
          packaging: parseFloat(draft.extraCosts.packaging) || 0,
          bags: parseFloat(draft.extraCosts.bags) || 0,
          labels: parseFloat(draft.extraCosts.labels) || 0,
          shipping: parseFloat(draft.extraCosts.shipping) || 0,
          others: parseFloat(draft.extraCosts.others) || 0,
        },
        profitMargin: margin,
        totalCost,
      };

      const saved = await upsertProduct(payload, productId);
      toast.success(productId ? 'Producto actualizado exitosamente' : 'Producto guardado exitosamente');
      navigateWithTransition(router, `/productos/${saved.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar producto');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="bg-stitch-surface-container-lowest rounded-[24px] border border-stitch-outline-variant p-12 text-center shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        <p className="font-stitch-body-md text-stitch-secondary">Cargando...</p>
      </section>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── 1. Nombre del Producto ── */}
      <article className="bg-stitch-surface-container-lowest rounded-[32px] p-8 border border-stitch-outline-variant shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        <h3 className="font-stitch-headline-md text-stitch-headline-md text-stitch-on-surface mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-stitch-primary">storefront</span>
          Nombre del Producto
        </h3>
        <input
          className="w-full bg-stitch-surface-container-lowest border border-stitch-outline-variant rounded-xl px-4 py-3 font-stitch-body-md text-stitch-body-md text-stitch-on-surface placeholder:text-stitch-tertiary-fixed-dim focus:outline-none focus:border-stitch-primary focus:ring-1 focus:ring-stitch-primary shadow-sm"
          placeholder="Ej: Torta de Cumpleaños"
          type="text"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </article>

      {/* ── 2. Componentes (Recetas) ── */}
      <article className="bg-stitch-surface-container-lowest rounded-[32px] p-8 border border-stitch-outline-variant shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        <h3 className="font-stitch-headline-md text-stitch-headline-md text-stitch-on-surface mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-stitch-primary">menu_book</span>
          Componentes (Recetas)
        </h3>

        {eligibleRecipes.length === 0 ? (
          <div className="bg-stitch-surface-container-low rounded-xl p-6 border border-stitch-outline-variant/50 text-center">
            <p className="font-stitch-body-md text-stitch-secondary mb-4">
              Completá el rendimiento total de tus recetas para poder usarlas en un producto.
            </p>
            <a
              href="/calculadora"
              className="inline-flex items-center gap-2 px-6 py-3 bg-stitch-primary text-on-primary rounded-xl font-stitch-label-sm text-stitch-label-sm hover:bg-stitch-surface-tint transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">calculate</span>
              Ir a la Calculadora
            </a>
          </div>
        ) : (
          <>
            {/* Selector */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <select
                className="w-full sm:w-auto flex-1 bg-stitch-surface-container-lowest border border-stitch-outline-variant rounded-xl px-4 py-3 font-stitch-body-md text-stitch-body-md text-stitch-on-surface focus:outline-none focus:border-stitch-primary focus:ring-1 focus:ring-stitch-primary shadow-sm"
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
              >
                <option value="" disabled>Seleccionar receta...</option>
                {eligibleRecipes.map(recipe => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name} — rinde {recipe.outputQuantity} {recipe.outputUnit}
                  </option>
                ))}
              </select>
              <button
                onClick={addRecipeToProduct}
                disabled={!selectedRecipeId}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-stitch-primary text-on-primary rounded-xl font-stitch-label-sm text-stitch-label-sm hover:bg-stitch-surface-tint transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Agregar
              </button>
            </div>

            {/* Rows */}
            {draft.recipes.length === 0 ? (
              <div className="bg-stitch-surface-container-low rounded-xl p-6 border border-stitch-outline-variant/50 text-center font-stitch-body-md text-stitch-secondary">
                Agregá al menos una receta para armar el producto.
              </div>
            ) : (
              <div className="space-y-4">
                {draft.recipes.map((row, index) => {
                  const baseCost = getBaseCostPerUnit(row);
                  return (
                    <div key={index} className="bg-stitch-surface-container-low rounded-xl p-4 sm:p-5 border border-stitch-outline-variant/50">
                      <div className="flex flex-col md:flex-row gap-4 md:items-center">
                        <div className="flex-1 min-w-0">
                          <p className="font-stitch-body-md text-stitch-body-md font-medium text-stitch-on-surface truncate">{row.recipeName}</p>
                          {baseCost != null && (
                            <p className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary font-normal mt-1">
                              Costo base: {formatCurrency(baseCost)} / {row.unit}
                            </p>
                          )}
                        </div>
                        {row.recipeId == null ? (
                          <div className="flex items-center gap-3">
                            <span className="font-stitch-numeric-data text-[18px] text-stitch-on-surface">{row.quantityUsed} {row.unit}</span>
                            <span className="font-stitch-numeric-data text-[18px] text-stitch-on-surface">{formatCurrency(row.cost)}</span>
                            <button
                              onClick={() => removeRecipeFromProduct(index)}
                              className="text-stitch-error hover:bg-stitch-error-container w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                              title="Quitar"
                            >
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <input
                                className="w-24 bg-stitch-surface-container-lowest border border-stitch-outline-variant rounded-xl px-3 py-2.5 font-stitch-numeric-data text-stitch-numeric-data text-stitch-on-surface focus:outline-none focus:border-stitch-primary focus:ring-1 focus:ring-stitch-primary shadow-sm"
                                type="number"
                                min="0.01"
                                step="any"
                                placeholder="250"
                                value={row.quantityUsed}
                                onChange={(e) => updateRowQuantity(index, e.target.value)}
                              />
                              <select
                                className="w-24 bg-stitch-surface-container-lowest border border-stitch-outline-variant rounded-xl px-2 py-2.5 font-stitch-body-md text-stitch-body-md text-stitch-on-surface focus:outline-none focus:border-stitch-primary focus:ring-1 focus:ring-stitch-primary shadow-sm"
                                value={row.unit}
                                onChange={(e) => updateRowUnit(index, e.target.value as Unit)}
                              >
                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="l">l</option>
                                <option value="ml">ml</option>
                                <option value="unidad">unidad</option>
                              </select>
                            </div>
                            <div className="flex items-center justify-between md:justify-end gap-3">
                              <span className="font-stitch-numeric-data text-[20px] text-stitch-on-surface whitespace-nowrap">{formatCurrency(row.cost)}</span>
                              <button
                                onClick={() => removeRecipeFromProduct(index)}
                                className="text-stitch-error hover:bg-stitch-error-container w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                                title="Quitar"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </article>

      {/* ── 3. Costos Adicionales ── */}
      <article className="bg-stitch-surface-container-lowest rounded-[32px] p-8 border border-stitch-outline-variant shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        <h3 className="font-stitch-headline-md text-stitch-headline-md text-stitch-on-surface mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-stitch-primary">local_shipping</span>
          Costos Adicionales
        </h3>
        <div className="space-y-4">
          {EXTRA_COST_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <label className="font-stitch-body-md text-stitch-body-md text-stitch-secondary">{label}</label>
              <div className="relative w-32">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stitch-tertiary-fixed-dim pointer-events-none">$</span>
                <input
                  className="w-full pl-8 pr-4 py-2.5 bg-stitch-surface-container-lowest border border-stitch-outline-variant rounded-xl text-right font-stitch-numeric-data text-stitch-numeric-data text-stitch-on-surface placeholder:text-stitch-tertiary-fixed-dim focus:outline-none focus:border-stitch-primary focus:ring-1 focus:ring-stitch-primary shadow-sm"
                  placeholder="0"
                  type="number"
                  min="0"
                  value={draft.extraCosts[key] ?? ''}
                  onChange={(e) => setDraft({ ...draft, extraCosts: { ...draft.extraCosts, [key]: e.target.value } })}
                />
              </div>
            </div>
          ))}
        </div>
      </article>

      {/* ── 4. Margen + Resumen ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Margen de Ganancia */}
        <article className="bg-stitch-surface-container-lowest rounded-[32px] p-8 border border-stitch-outline-variant shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
          <h3 className="font-stitch-headline-md text-stitch-headline-md text-stitch-on-surface mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-stitch-primary">trending_up</span>
            Margen de Ganancia
          </h3>
          <div className="flex items-center gap-3 mb-4">
            <input
              className="w-24 bg-stitch-surface-container-lowest border border-stitch-outline-variant rounded-xl px-4 py-3 text-center font-stitch-numeric-data text-stitch-numeric-data text-stitch-primary font-bold focus:outline-none focus:border-stitch-primary focus:ring-1 focus:ring-stitch-primary shadow-sm"
              placeholder="40"
              type="number"
              min="0"
              max="500"
              value={draft.profitMargin}
              onChange={(e) => setDraft({ ...draft, profitMargin: e.target.value })}
            />
            <span className="font-stitch-body-md text-stitch-primary font-bold">%</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_MARGINS.map(pct => (
              <button
                key={pct}
                onClick={() => setDraft({ ...draft, profitMargin: String(pct) })}
                className={`px-4 py-1.5 rounded-full font-stitch-label-sm text-stitch-label-sm transition-colors ${
                  String(draft.profitMargin) === String(pct)
                    ? 'bg-stitch-primary-fixed text-stitch-on-primary-fixed'
                    : 'bg-stitch-primary-fixed/30 text-stitch-primary hover:bg-stitch-primary-fixed'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </article>

        {/* Resumen */}
        <article
          className="bg-stitch-primary rounded-[32px] p-8 text-on-primary shadow-[0_20px_50px_rgba(184,0,73,0.3)]"
        >
          <h3 className="font-stitch-headline-md text-headline-md font-bold mb-8 flex items-center gap-3">
            <span className="material-symbols-outlined">receipt_long</span>
            Resumen Total
          </h3>
          <div className="space-y-4 font-stitch-body-md text-body-md" style={{ color: '#ffb2be' }}>
            <div className="flex justify-between items-center border-b border-white/20 pb-4">
              <span>Subtotal Componentes:</span>
              <span className="text-on-primary font-medium text-[20px]">{formatCurrency(recipesCost)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/20 pb-4">
              <span>Costos Adicionales:</span>
              <span className="text-on-primary font-medium text-[20px]">{formatCurrency(extraCostsTotal)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/20 pb-4">
              <span>Costo Neto:</span>
              <span className="text-on-primary font-medium text-[20px]">{formatCurrency(totalCost)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-on-primary text-base">Total ({margin}% Ganancia):</span>
              <span className="text-on-primary font-bold text-[20px]">{formatCurrency(salePrice)}</span>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/20">
            <button
              onClick={saveProduct}
              disabled={!canSave || isSaving}
              className="w-full py-4 bg-white text-stitch-primary rounded-full font-bold tracking-wider hover:bg-stitch-primary-fixed transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-stitch-label-sm text-stitch-label-sm"
            >
              {isSaving ? 'GUARDANDO...' : (productId ? 'ACTUALIZAR PRODUCTO' : 'GUARDAR PRODUCTO')}
            </button>
          </div>
        </article>
      </div>

    </div>
  );
}