'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Product, Recipe, BaseIngredient, ComponentType, Unit, AdditionalCost, EXTRA_COST_LABELS } from '@/lib/types';
import { fetchRecipes } from '@/lib/recipes-db';
import { fetchIngredients } from '@/lib/ingredients-db';
import { fetchProductById, upsertProduct } from '@/lib/products-db';
import { formatCurrency, proportionalCost, costPerOutputUnit, calculateTotalCost, sumIngredientCosts, calculateSalePrice, calculateIngredientCost } from '@/lib/cost';
import { toBaseQuantity } from '@/lib/units';
import { navigateWithTransition } from '@/lib/view-transition';

interface ProductComponentDraft {
  componentType: ComponentType;
  recipeId: string | null;
  recipeName: string | null;
  ingredientId: string | null;
  ingredientName: string | null;
  quantityUsed: string;
  unit: Unit;
  cost: number;
}

interface ProductDraft {
  name: string;
  description: string;
  components: ProductComponentDraft[];
  additionalCosts: AdditionalCost[];
  profitMargin: string;
}

interface ProductBuilderProps {
  productId?: string;
}

const QUICK_MARGINS = [10, 20, 30, 40];

const CUSTOM_EXTRA_COST_KEY = 'others';
const CUSTOM_EXTRA_COST_OPTION = '__custom__';

const EXTRA_COST_PRESETS = [
  { key: 'packaging', label: EXTRA_COST_LABELS.packaging },
  { key: 'bags', label: EXTRA_COST_LABELS.bags },
  { key: 'shipping', label: EXTRA_COST_LABELS.shipping },
  { key: 'labels', label: EXTRA_COST_LABELS.labels },
  { key: 'labor', label: EXTRA_COST_LABELS.labor },
];

function buildDefaultAdditionalCosts(): AdditionalCost[] {
  return [
    ...EXTRA_COST_PRESETS.map(p => ({ key: p.key, label: p.label, value: '', isCustom: false })),
    { key: CUSTOM_EXTRA_COST_KEY, label: '', value: '', isCustom: true },
  ];
}

function buildAdditionalCostsFromExtraCosts(extraCosts: Record<string, number>): AdditionalCost[] {
  const rows: AdditionalCost[] = [];
  for (const [key, value] of Object.entries(extraCosts || {})) {
    if (key === CUSTOM_EXTRA_COST_KEY) {
      rows.push({ key, label: '', value: String(value || ''), isCustom: true });
    } else if (EXTRA_COST_LABELS[key]) {
      rows.push({ key, label: EXTRA_COST_LABELS[key], value: String(value || ''), isCustom: false });
    } else {
      rows.push({ key, label: key, value: String(value || ''), isCustom: true });
    }
  }
  return rows.length > 0 ? rows : buildDefaultAdditionalCosts();
}

function additionalCostsToExtraCosts(rows: AdditionalCost[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) {
    const value = parseFloat(row.value) || 0;
    if (value <= 0) continue;
    const key = row.isCustom ? (row.label.trim() || CUSTOM_EXTRA_COST_KEY) : row.key;
    result[key] = value;
  }
  return result;
}

export function ProductBuilder({ productId }: ProductBuilderProps) {
  const router = useRouter();
  const [eligibleRecipes, setEligibleRecipes] = useState<Recipe[]>([]);
  const [baseIngredients, setBaseIngredients] = useState<BaseIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedValue, setSelectedValue] = useState('');

  const defaultDraft: ProductDraft = {
    name: '',
    description: '',
    components: [],
    additionalCosts: buildDefaultAdditionalCosts(),
    profitMargin: '',
  };

  const [draft, setDraft] = useState<ProductDraft>(defaultDraft);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [recipes, ingredients] = await Promise.all([
          fetchRecipes(),
          fetchIngredients(),
        ]);
        const eligible = recipes
          .filter(r => r.outputQuantity != null && r.outputUnit != null)
          .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
        const sortedIngredients = [...ingredients].sort((a, b) =>
          a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        );
        setEligibleRecipes(eligible);
        setBaseIngredients(sortedIngredients);

        if (productId) {
          const product = await fetchProductById(productId);
          if (!product) {
            navigateWithTransition(router, '/productos');
            return;
          }
          setDraft({
            name: product.name,
            description: product.description,
            components: product.components.map(c => ({
              componentType: c.componentType,
              recipeId: c.recipeId,
              recipeName: c.recipeName,
              ingredientId: c.ingredientId,
              ingredientName: c.ingredientName,
              quantityUsed: String(c.quantityUsed),
              unit: c.unit,
              cost: c.cost,
            })),
            additionalCosts: buildAdditionalCostsFromExtraCosts(product.extraCosts),
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

  const computeCost = (component: ProductComponentDraft, quantityUsed: string, unit: Unit, fallback?: number): number => {
    const qty = toBaseQuantity(parseFloat(quantityUsed) || 0, unit);
    if (component.componentType === 'ingredient') {
      const ingredient = baseIngredients.find(i => i.id === component.ingredientId);
      if (!ingredient) return fallback ?? 0;
      return calculateIngredientCost(ingredient.pricePerUnit, parseFloat(quantityUsed) || 0, unit);
    }
    const recipe = eligibleRecipes.find(r => r.id === component.recipeId);
    if (!recipe || recipe.outputQuantity == null) return fallback ?? 0;
    return proportionalCost(recipe.totalCost, recipe.outputQuantity, qty);
  };

  const addComponentToProduct = () => {
    if (!selectedValue) return;
    const [type, id] = selectedValue.split(':');
    if (type === 'recipe') {
      const recipe = eligibleRecipes.find(r => r.id === id);
      if (!recipe || recipe.outputUnit == null) return;
      const row: ProductComponentDraft = {
        componentType: 'recipe',
        recipeId: recipe.id,
        recipeName: recipe.name,
        ingredientId: null,
        ingredientName: null,
        quantityUsed: '',
        unit: recipe.outputUnit,
        cost: 0,
      };
      setDraft(prev => ({ ...prev, components: [row, ...prev.components] }));
    } else if (type === 'ingredient') {
      const ingredient = baseIngredients.find(i => i.id === id);
      if (!ingredient) return;
      const row: ProductComponentDraft = {
        componentType: 'ingredient',
        recipeId: null,
        recipeName: null,
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantityUsed: '',
        unit: ingredient.unit,
        cost: 0,
      };
      setDraft(prev => ({ ...prev, components: [row, ...prev.components] }));
    }
    setSelectedValue('');
  };

  const updateComponentQuantity = (index: number, quantityUsed: string) => {
    setDraft(prev => {
      const components = prev.components.map((component, i) => {
        if (i !== index) return component;
        const cost = computeCost(component, quantityUsed, component.unit, component.cost);
        return { ...component, quantityUsed, cost };
      });
      return { ...prev, components };
    });
  };

  const updateComponentUnit = (index: number, unit: Unit) => {
    setDraft(prev => {
      const components = prev.components.map((component, i) => {
        if (i !== index) return component;
        const cost = computeCost(component, component.quantityUsed, unit, component.cost);
        return { ...component, unit, cost };
      });
      return { ...prev, components };
    });
  };

  const removeComponentFromProduct = (index: number) => {
    setDraft(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index),
    }));
  };

  const updateAdditionalCostValue = (index: number, value: string) => {
    setDraft(prev => ({
      ...prev,
      additionalCosts: prev.additionalCosts.map((row, i) => i === index ? { ...row, value } : row),
    }));
  };

  const updateAdditionalCostPreset = (index: number, option: string) => {
    setDraft(prev => ({
      ...prev,
      additionalCosts: prev.additionalCosts.map((row, i) => {
        if (i !== index) return row;
        if (option === CUSTOM_EXTRA_COST_OPTION) {
          return { ...row, key: CUSTOM_EXTRA_COST_KEY, label: '', isCustom: true };
        }
        const preset = EXTRA_COST_PRESETS.find(p => p.key === option);
        if (!preset) return row;
        return { ...row, key: preset.key, label: preset.label, isCustom: false };
      }),
    }));
  };

  const updateAdditionalCostLabel = (index: number, label: string) => {
    setDraft(prev => ({
      ...prev,
      additionalCosts: prev.additionalCosts.map((row, i) => i === index ? { ...row, label } : row),
    }));
  };

  const getBaseCostPerUnit = (component: ProductComponentDraft): number | null => {
    if (component.componentType === 'ingredient') {
      const ingredient = baseIngredients.find(i => i.id === component.ingredientId);
      return ingredient ? ingredient.pricePerUnit : null;
    }
    const recipe = eligibleRecipes.find(r => r.id === component.recipeId);
    if (!recipe || recipe.outputQuantity == null) return null;
    return costPerOutputUnit(recipe.totalCost, recipe.outputQuantity);
  };

  const isReadOnlyRow = (component: ProductComponentDraft): boolean =>
    (component.componentType === 'recipe' && component.recipeId == null) ||
    (component.componentType === 'ingredient' && component.ingredientId == null);

  const componentsCost = sumIngredientCosts(draft.components);
  const extraCostsTotal = draft.additionalCosts.reduce((sum, row) => sum + (parseFloat(row.value) || 0), 0);
  const totalCost = calculateTotalCost(componentsCost, extraCostsTotal);
  const margin = parseFloat(draft.profitMargin) || 0;
  const salePrice = calculateSalePrice(totalCost, margin);

  const canSave = draft.name.trim() !== '' && draft.components.length > 0;

  const saveProduct = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const payload: Omit<Product, 'id'> = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        components: draft.components.map(c => ({
          id: crypto.randomUUID(),
          componentType: c.componentType,
          recipeId: c.recipeId,
          recipeName: c.recipeName,
          ingredientId: c.ingredientId,
          ingredientName: c.ingredientName,
          quantityUsed: parseFloat(c.quantityUsed) || 0,
          unit: c.unit,
          cost: c.cost,
        })),
        extraCosts: additionalCostsToExtraCosts(draft.additionalCosts),
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

      {/* ── 1. Nombre y Descripción del Producto ── */}
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
        <div className="mt-4">
          <label className="block font-stitch-label-sm text-stitch-label-sm text-stitch-secondary mb-2">
            Descripción (opcional)
          </label>
          <textarea
            className="w-full bg-stitch-surface-container-lowest border border-stitch-outline-variant rounded-xl px-4 py-3 font-stitch-body-md text-stitch-body-md text-stitch-on-surface placeholder:text-stitch-tertiary-fixed-dim focus:outline-none focus:border-stitch-primary focus:ring-1 focus:ring-stitch-primary shadow-sm resize-none"
            placeholder="Ej: Torta de tres pisos con relleno de dulce de leche y merengue italiano."
            rows={3}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
      </article>

      {/* ── 2. Ingredientes y Subproductos ── */}
      <article className="bg-stitch-surface-container-lowest rounded-[32px] p-8 border border-stitch-outline-variant shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        <h3 className="font-stitch-headline-md text-stitch-headline-md text-stitch-on-surface mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-stitch-primary">menu_book</span>
          Ingredientes y Subproductos
        </h3>

        {eligibleRecipes.length === 0 && baseIngredients.length === 0 ? (
          <div className="bg-stitch-surface-container-low rounded-xl p-6 border border-stitch-outline-variant/50 text-center">
            <p className="font-stitch-body-md text-stitch-secondary mb-4">
              Agregá recetas con rendimiento total o ingredientes al inventario para poder armar un producto.
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
            {/* Selector combinado */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <select
                className="w-full sm:w-auto flex-1 bg-stitch-surface-container-lowest border border-stitch-outline-variant rounded-xl px-4 py-3 font-stitch-body-md text-stitch-body-md text-stitch-on-surface focus:outline-none focus:border-stitch-primary focus:ring-1 focus:ring-stitch-primary shadow-sm"
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
              >
                <option value="" disabled>Seleccionar ítem...</option>
                {eligibleRecipes.length > 0 && (
                  <optgroup label="Subproductos">
                    {eligibleRecipes.map(recipe => (
                      <option key={`recipe:${recipe.id}`} value={`recipe:${recipe.id}`}>
                        {recipe.name} — rinde {recipe.outputQuantity} {recipe.outputUnit}
                      </option>
                    ))}
                  </optgroup>
                )}
                {baseIngredients.length > 0 && (
                  <optgroup label="Ingredientes">
                    {baseIngredients.map(ingredient => (
                      <option key={`ingredient:${ingredient.id}`} value={`ingredient:${ingredient.id}`}>
                        {ingredient.name} — {formatCurrency(ingredient.pricePerUnit)} / {ingredient.unit}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button
                onClick={addComponentToProduct}
                disabled={!selectedValue}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-stitch-primary text-on-primary rounded-xl font-stitch-label-sm text-stitch-label-sm hover:bg-stitch-surface-tint transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Agregar
              </button>
            </div>

            {/* Rows */}
            {draft.components.length === 0 ? (
              <div className="bg-stitch-surface-container-low rounded-xl p-6 border border-stitch-outline-variant/50 text-center font-stitch-body-md text-stitch-secondary">
                Agregá al menos un ítem para armar el producto.
              </div>
            ) : (
              <div className="space-y-4">
                {draft.components.map((component, index) => {
                  const baseCost = getBaseCostPerUnit(component);
                  const readOnly = isReadOnlyRow(component);
                  const displayName = component.recipeName ?? component.ingredientName ?? 'Ítem';
                  return (
                    <div key={index} className="bg-stitch-surface-container-low rounded-xl p-4 sm:p-5 border border-stitch-outline-variant/50">
                      <div className="flex flex-col md:flex-row gap-4 md:items-center">
                        <div className="flex-1 min-w-0">
                          <p className="font-stitch-body-md text-stitch-body-md font-medium text-stitch-on-surface truncate">{displayName}</p>
                          <p className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary font-normal mt-1">
                            {component.componentType === 'recipe' ? 'Subproducto' : 'Ingrediente'}
                            {baseCost != null && ` · Costo base: ${formatCurrency(baseCost)} / ${component.unit}`}
                          </p>
                        </div>
                        {readOnly ? (
                          <div className="flex items-center gap-3">
                            <span className="font-stitch-numeric-data text-[18px] text-stitch-on-surface">{component.quantityUsed} {component.unit}</span>
                            <span className="font-stitch-numeric-data text-[18px] text-stitch-on-surface">{formatCurrency(component.cost)}</span>
                            <button
                              onClick={() => removeComponentFromProduct(index)}
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
                                value={component.quantityUsed}
                                onChange={(e) => updateComponentQuantity(index, e.target.value)}
                              />
                              <select
                                className="w-24 bg-stitch-surface-container-lowest border border-stitch-outline-variant rounded-xl px-2 py-2.5 font-stitch-body-md text-stitch-body-md text-stitch-on-surface focus:outline-none focus:border-stitch-primary focus:ring-1 focus:ring-stitch-primary shadow-sm"
                                value={component.unit}
                                onChange={(e) => updateComponentUnit(index, e.target.value as Unit)}
                              >
                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="l">l</option>
                                <option value="ml">ml</option>
                                <option value="unidad">unidad</option>
                              </select>
                            </div>
                            <div className="flex items-center justify-between md:justify-end gap-3">
                              <span className="font-stitch-numeric-data text-[20px] text-stitch-on-surface whitespace-nowrap">{formatCurrency(component.cost)}</span>
                              <button
                                onClick={() => removeComponentFromProduct(index)}
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
          {draft.additionalCosts.map((row, index) => {
            const usedKeys = draft.additionalCosts
              .filter((r, i) => i !== index && !r.isCustom)
              .map(r => r.key);
            return (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                  <select
                    className="w-full sm:w-56 bg-stitch-surface-container-lowest border border-stitch-outline-variant rounded-xl px-3 py-2.5 font-stitch-body-md text-stitch-body-md text-stitch-on-surface focus:outline-none focus:border-stitch-primary focus:ring-1 focus:ring-stitch-primary shadow-sm"
                    value={row.isCustom ? CUSTOM_EXTRA_COST_OPTION : row.key}
                    onChange={(e) => updateAdditionalCostPreset(index, e.target.value)}
                  >
                    {EXTRA_COST_PRESETS.map(preset => (
                      <option key={preset.key} value={preset.key} disabled={usedKeys.includes(preset.key)}>
                        {preset.label}
                      </option>
                    ))}
                    <option value={CUSTOM_EXTRA_COST_OPTION}>Otro...</option>
                  </select>
                  {row.isCustom && (
                    <input
                      className="w-full sm:w-56 bg-stitch-surface-container-lowest border border-stitch-outline-variant rounded-xl px-3 py-2.5 font-stitch-body-md text-stitch-body-md text-stitch-on-surface placeholder:text-stitch-tertiary-fixed-dim focus:outline-none focus:border-stitch-primary focus:ring-1 focus:ring-stitch-primary shadow-sm"
                      placeholder="Ej: Envase especial"
                      type="text"
                      value={row.label}
                      onChange={(e) => updateAdditionalCostLabel(index, e.target.value)}
                    />
                  )}
                </div>
                <div className="relative w-full sm:w-32">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stitch-tertiary-fixed-dim pointer-events-none">$</span>
                  <input
                    className="w-full pl-8 pr-4 py-2.5 bg-stitch-surface-container-lowest border border-stitch-outline-variant rounded-xl text-right font-stitch-numeric-data text-stitch-numeric-data text-stitch-on-surface placeholder:text-stitch-tertiary-fixed-dim focus:outline-none focus:border-stitch-primary focus:ring-1 focus:ring-stitch-primary shadow-sm"
                    placeholder="0"
                    type="number"
                    min="0"
                    value={row.value}
                    onChange={(e) => updateAdditionalCostValue(index, e.target.value)}
                  />
                </div>
              </div>
            );
          })}
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
              placeholder="0"
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
              <span>Subtotal Ítems:</span>
              <span className="text-on-primary font-medium text-[20px]">{formatCurrency(componentsCost)}</span>
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