'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { BaseIngredient, Recipe, RecipeIngredient, Unit } from '@/lib/types';
import { storage } from '@/lib/storage';
import { fetchIngredients } from '@/lib/ingredients-db';
import { fetchRecipes, upsertRecipe, deleteRecipe as dbDeleteRecipe } from '@/lib/recipes-db';
import { navigateWithTransition } from '@/lib/view-transition';

interface RecipeBuilderProps {
  isIngredientsLocked?: boolean;
  ingredientsVersion?: number;
}

const QUICK_QUANTITIES = [
  { label: '½ doc.', value: 6 },
  { label: '1 doc.', value: 12 },
  { label: '2 doc.', value: 24 },
  { label: '3 doc.', value: 36 },
];

const stitchFontManrope = { fontFamily: "'Manrope', sans-serif" } as const;
const stitchFontInter = { fontFamily: "'Inter', sans-serif" } as const;
const stitchShadow = { boxShadow: '0 10px 40px rgba(0,0,0,0.04)' } as const;

export function RecipeBuilder({ isIngredientsLocked = false, ingredientsVersion = 0 }: RecipeBuilderProps) {
  const router = useRouter();
  const [baseIngredients, setBaseIngredients] = useState<BaseIngredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const defaultDraft = {
    name: '',
    ingredients: [],
    extraCosts: { packaging: '', bags: '', labels: '', shipping: '', others: '' },
    unitsProduced: '',
    profitMargin: '',
    saleType: 'unidad',
  };

  const [currentRecipe, setCurrentRecipe] = useState<any>(defaultDraft);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);

  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState('');
  const [editingUnit, setEditingUnit] = useState<Unit>('g');

  const [budgetQty, setBudgetQty] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [newIngredient, setNewIngredient] = useState({
    baseIngredientId: '',
    quantityUsed: '',
    unit: 'g' as Unit,
  });

  const searchParams = useSearchParams();

  useEffect(() => {
    const scrollToBuilder = () => {
      if (window.location.hash === '#recipe-builder') {
        setTimeout(() => {
          document.getElementById('recipe-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    };
    
    scrollToBuilder();

    window.addEventListener('hashchange', scrollToBuilder);
    return () => window.removeEventListener('hashchange', scrollToBuilder);
  }, [searchParams]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ingredients, dbRecipes] = await Promise.all([
          fetchIngredients(),
          fetchRecipes(),
        ]);
        const sortedIngredients = [...ingredients].sort((a, b) =>
          a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        );
        setBaseIngredients(sortedIngredients);
        setRecipes(dbRecipes);

        const editId = searchParams.get('edit');
        if (editId) {
          const recipeToEdit = dbRecipes.find(r => r.id === editId);
          if (recipeToEdit) {
            setEditingRecipeId(recipeToEdit.id);
            setCurrentRecipe({
              name: recipeToEdit.name,
              ingredients: recipeToEdit.ingredients,
              extraCosts: { ...recipeToEdit.extraCosts },
              unitsProduced: recipeToEdit.unitsProduced,
              profitMargin: recipeToEdit.profitMargin || '',
              saleType: recipeToEdit.saleType || 'unidad',
            });
            setBudgetQty('');
            setTimeout(() => {
              document.getElementById('recipe-builder')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            return;
          }
        }
      } catch (err) {
        toast.error('Error al cargar datos iniciales');
      }

      const draft = storage.getDraft();
      if (draft) setCurrentRecipe(draft);
    };
    loadData();
  }, [searchParams]);

  useEffect(() => {
    if (editingRecipeId) return;
    storage.saveDraft(currentRecipe);
  }, [currentRecipe, editingRecipeId]);

  useEffect(() => {
    if (ingredientsVersion === 0) return;
    fetchIngredients()
      .then(data => {
        const sorted = [...data].sort((a, b) =>
          a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        );
        setBaseIngredients(sorted);
      })
      .catch(() => {});
  }, [ingredientsVersion]);

  const toBaseQuantity = (quantity: number, unit: Unit): number => {
    if (unit === 'kg') return quantity * 1000;
    if (unit === 'l') return quantity * 1000;
    return quantity;
  };

  const calculateIngredientCost = (baseIngredientId: string | null, quantityUsed: number, unit: Unit, existingCost?: number): number => {
    const baseIngredient = baseIngredients.find(ing => ing.id === baseIngredientId);
    if (!baseIngredient) return existingCost ?? 0;
    return baseIngredient.pricePerUnit * toBaseQuantity(quantityUsed, unit);
  };


  const normalizeIngredient = (quantity: number, unit: Unit): { quantity: number; unit: Unit } => {
    if (unit === 'kg') return { quantity: quantity * 1000, unit: 'g' };
    if (unit === 'l') return { quantity: quantity * 1000, unit: 'ml' };
    return { quantity, unit };
  };

  const calculateRecipeTotals = (recipe: any) => {
    const ingredientsCost = (recipe.ingredients || []).reduce((sum: number, ing: any) => sum + ing.cost, 0);
    const extraCostsTotal = recipe.extraCosts
      ? Object.values(recipe.extraCosts).reduce((sum: number, cost: any) => sum + (parseFloat(cost) || 0), 0)
      : 0;
    const totalCost = ingredientsCost + extraCostsTotal;
    const margin = parseFloat(String(recipe.profitMargin)) || 0;
    const totalWithProfit = totalCost * (1 + margin / 100);
    const units = parseFloat(String(recipe.unitsProduced)) || 0;
    const costPerUnit = units ? totalWithProfit / units : 0;
    return { ingredientsCost, extraCostsTotal, totalCost, totalWithProfit, costPerUnit };
  };

  const addIngredientToRecipe = () => {
    if (!newIngredient.baseIngredientId || !newIngredient.quantityUsed) return;
    const quantityUsed = parseFloat(newIngredient.quantityUsed);
    const cost = calculateIngredientCost(newIngredient.baseIngredientId, quantityUsed, newIngredient.unit);
    const normalized = normalizeIngredient(quantityUsed, newIngredient.unit);
    const base = baseIngredients.find(i => i.id === newIngredient.baseIngredientId);
    const recipeIngredient: RecipeIngredient = {
      id: crypto.randomUUID(),
      baseIngredientId: newIngredient.baseIngredientId,
      ingredientName: base?.name ?? 'Desconocido',
      quantityUsed: normalized.quantity,
      unit: normalized.unit,
      cost,
    };
    setCurrentRecipe({ ...currentRecipe, ingredients: [...(currentRecipe.ingredients || []), recipeIngredient] });
    setNewIngredient({ baseIngredientId: '', quantityUsed: '', unit: 'g' });
  };

  const removeIngredientFromRecipe = (id: string) => {
    setCurrentRecipe({
      ...currentRecipe,
      ingredients: currentRecipe.ingredients?.filter((ing: RecipeIngredient) => ing.id !== id) || [],
    });
    if (editingIngredientId === id) setEditingIngredientId(null);
  };

  const startEditIngredient = (ing: RecipeIngredient) => {
    setEditingIngredientId(ing.id);
    setEditingQuantity(String(ing.quantityUsed));
    setEditingUnit(ing.unit);
  };

  const saveEditIngredient = (ingId: string) => {
    const qty = parseFloat(editingQuantity);
    if (!qty || qty <= 0) return;
    const normalized = normalizeIngredient(qty, editingUnit);
    const updatedIngredients = (currentRecipe.ingredients || []).map((ing: RecipeIngredient) => {
      if (ing.id !== ingId) return ing;
      const cost = calculateIngredientCost(ing.baseIngredientId, normalized.quantity, normalized.unit, ing.cost);
      return { ...ing, quantityUsed: normalized.quantity, unit: normalized.unit, cost };
    });
    setCurrentRecipe({ ...currentRecipe, ingredients: updatedIngredients });
    setEditingIngredientId(null);
  };

  const resetCurrentRecipe = () => {
    const empty = {
      name: '',
      ingredients: [],
      extraCosts: { packaging: '', bags: '', labels: '', shipping: '', others: '' } as any,
      unitsProduced: '',
      profitMargin: '',
      saleType: 'unidad',
    };
    setCurrentRecipe(empty);
    storage.clearDraft();
    setBudgetQty('');
  };

  const saveRecipe = async () => {
    if (!currentRecipe.name || !currentRecipe.ingredients?.length) return;
    const { totalCost, costPerUnit } = calculateRecipeTotals(currentRecipe);
    
    setIsSaving(true);
    try {
      const draftToSave = {
        name: currentRecipe.name,
        ingredients: currentRecipe.ingredients,
        extraCosts: {
          packaging: parseFloat(currentRecipe.extraCosts?.packaging as any) || 0,
          bags: parseFloat(currentRecipe.extraCosts?.bags as any) || 0,
          labels: parseFloat(currentRecipe.extraCosts?.labels as any) || 0,
          shipping: parseFloat(currentRecipe.extraCosts?.shipping as any) || 0,
          others: parseFloat(currentRecipe.extraCosts?.others as any) || 0,
        },
        unitsProduced: parseFloat(currentRecipe.unitsProduced as any) || 0,
        profitMargin: parseFloat(currentRecipe.profitMargin as any) || 0,
        saleType: currentRecipe.saleType || 'unidad',
        totalCost,
        costPerUnit,
      };

      const savedRecipe = await upsertRecipe(draftToSave);
      setRecipes([...recipes, savedRecipe]);
      resetCurrentRecipe();
      toast.success('Receta guardada exitosamente');
      navigateWithTransition(router, '/recetas');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar receta');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRecipe = (id: string) => {
    const recipe = recipes.find(r => r.id === id);
    toast.custom((t) => (
      <div className="w-[360px] rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden" style={stitchFontManrope}>
        <div className="p-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ffdad6] text-[#ba1a1a]">
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#151c27]">¿Eliminar esta receta?</p>
            <p className="text-xs text-[#5f5e5e] mt-0.5 truncate">&quot;{recipe?.name}&quot; se eliminará permanentemente.</p>
          </div>
        </div>
        <div className="flex border-t border-gray-100">
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-[#5f5e5e] hover:bg-[#f0f3ff] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              setIsSaving(true);
              try {
                await dbDeleteRecipe(id);
                setRecipes(recipes.filter(r => r.id !== id));
                toast.dismiss(t);
                toast.success('Receta eliminada');
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Error al eliminar');
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-[#ba1a1a] hover:bg-[#ffdad6]/30 transition-colors border-l border-gray-100 disabled:opacity-50"
          >
            {isSaving ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    ), { duration: 10000 });
  };

  const editRecipe = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setCurrentRecipe({
      name: recipe.name,
      ingredients: recipe.ingredients,
      extraCosts: { ...recipe.extraCosts },
      unitsProduced: recipe.unitsProduced,
      profitMargin: recipe.profitMargin || '',
      saleType: recipe.saleType || 'unidad',
    });
    setBudgetQty('');
    setTimeout(() => {
      document.getElementById('recipe-builder')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const updateRecipe = async () => {
    if (!currentRecipe.name || !currentRecipe.ingredients?.length || !editingRecipeId) return;
    const { totalCost, costPerUnit } = calculateRecipeTotals(currentRecipe);
    
    setIsSaving(true);
    try {
      const draftToUpdate = {
        name: currentRecipe.name,
        ingredients: currentRecipe.ingredients,
        extraCosts: {
          packaging: parseFloat(currentRecipe.extraCosts?.packaging as any) || 0,
          bags: parseFloat(currentRecipe.extraCosts?.bags as any) || 0,
          labels: parseFloat(currentRecipe.extraCosts?.labels as any) || 0,
          shipping: parseFloat(currentRecipe.extraCosts?.shipping as any) || 0,
          others: parseFloat(currentRecipe.extraCosts?.others as any) || 0,
        },
        unitsProduced: parseFloat(currentRecipe.unitsProduced as any) || 0,
        profitMargin: parseFloat(currentRecipe.profitMargin as any) || 0,
        saleType: currentRecipe.saleType || 'unidad',
        totalCost,
        costPerUnit,
      };

      const savedRecipe = await upsertRecipe(draftToUpdate, editingRecipeId);
      setRecipes(recipes.map(r => r.id === editingRecipeId ? savedRecipe : r));
      setEditingRecipeId(null);
      resetCurrentRecipe();
      toast.success('Receta actualizada exitosamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar receta');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingRecipeId(null);
    resetCurrentRecipe();
  };


  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

  const getIngredientName = (ing: RecipeIngredient) =>
    baseIngredients.find(i => i.id === ing.baseIngredientId)?.name || ing.ingredientName;

  const totals = calculateRecipeTotals(currentRecipe);
  const budgetTotal = totals.costPerUnit * (parseFloat(budgetQty) || 0);
  const units = parseFloat(String(currentRecipe.unitsProduced)) || 0;
  const costPerUnitWithoutMargin = units > 0 ? totals.totalCost / units : 0;
  const budgetNetProfit = budgetTotal - (costPerUnitWithoutMargin * (parseFloat(budgetQty) || 0));

  if (baseIngredients.length === 0) {
    return (
      <section className="bg-white rounded-[24px] border border-gray-100 p-8 text-center card-animate delay-200" style={stitchShadow}>
        <p className="text-[#5f5e5e] text-[16px] leading-[1.5]">
          Primero debes agregar ingredientes y bloquear el inventario para poder crear recetas
        </p>
      </section>
    );
  }

  const canSave = isIngredientsLocked;

  return (
    <div id="recipe-builder" className="space-y-8">

      {/* ── PASO 2: Armador de Receta ── */}
      <article className="bg-white rounded-[24px] border border-gray-100 p-8 space-y-6 card-animate delay-200" style={stitchShadow}>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#b80049] text-[28px]">receipt_long</span>
          <h2 className="font-semibold text-[24px] leading-[1.3] text-[#151c27]" style={stitchFontManrope}>2. Armador de Receta</h2>
        </div>

        {!canSave && (
          <div className="px-4 py-3 rounded-lg bg-[#ffd9de]/20 border border-[#e4bdc2]/30 text-[#5f5e5e] text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">lock</span>
            Bloqueá el inventario para poder guardar recetas.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Nombre de la Receta</label>
            <input
              className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
              placeholder="Ej: Pastel de Chocolate Especial"
              type="text"
              value={currentRecipe.name}
              onChange={(e) => setCurrentRecipe({ ...currentRecipe, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Rendimiento (Porciones)</label>
            <input
              className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
              placeholder="Ej: 12"
              type="number"
              min="0"
              value={currentRecipe.unitsProduced ?? ''}
              onChange={(e) => setCurrentRecipe({ ...currentRecipe, unitsProduced: e.target.value as any })}
            />
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100">
          {/* Header de la grilla */}
          <div className="grid grid-cols-12 gap-4 items-end mb-2">
            <div className="col-span-12 md:col-span-6">
              <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e] mb-2 uppercase text-[10px]">INGREDIENTE</label>
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e] mb-2 uppercase text-[10px]">CANT. USADA</label>
            </div>
            <div className="col-span-12 md:col-span-3 text-right hidden md:block">
              <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e] mb-2 uppercase text-[10px]">COSTO CALC.</label>
            </div>
          </div>

          {/* Ingredientes agregados a la receta */}
          {currentRecipe.ingredients?.map((ing: any) => (
            editingIngredientId === ing.id ? (
              <div key={ing.id} className="bg-[#ffd9de]/10 p-4 rounded-xl border border-[#e4bdc2]/30 flex flex-col md:flex-row gap-4 items-center mb-2">
                <div className="w-full md:w-1/2">
                  <span className="text-[16px] leading-[1.5] font-medium text-[#151c27]">{getIngredientName(ing)}</span>
                  <span className="block text-xs text-[#5f5e5e] font-normal">editando cantidad...</span>
                </div>
                <div className="w-full md:w-1/4 flex gap-2">
                  <input
                    className="interactive-input flex-1 min-w-0 px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#151c27]"
                    type="number" min="0" placeholder="250"
                    value={editingQuantity}
                    onChange={(e) => setEditingQuantity(e.target.value)}
                    autoFocus
                  />
                  <select
                    className="interactive-input w-24 shrink-0 px-2 py-3 rounded-lg border border-gray-200 bg-white text-[#5f5e5e]"
                    value={editingUnit}
                    onChange={(e) => setEditingUnit(e.target.value as Unit)}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                    <option value="unidad">unidad</option>
                  </select>
                </div>
                <div className="w-full md:w-1/4 flex justify-between md:justify-end items-center gap-4">
                  <span className="md:hidden text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Costo:</span>
                  <span className="text-[18px] leading-[1.2] text-[#151c27] font-semibold">
                    {editingQuantity
                      ? formatCurrency(calculateIngredientCost(ing.baseIngredientId, parseFloat(editingQuantity) || 0, editingUnit))
                      : '$0,00'}
                  </span>
                  <button onClick={() => saveEditIngredient(ing.id)}
                    className="interactive-btn text-[#b80049] hover:text-[#900038] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#ffd9de]">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  </button>
                  <button onClick={() => setEditingIngredientId(null)}
                    className="interactive-btn text-[#5f5e5e] hover:text-[#151c27] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f0f3ff]">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>
            ) : (
              <div key={ing.id} className="bg-[#ffd9de]/10 p-4 rounded-xl border border-[#e4bdc2]/30 flex flex-col md:flex-row gap-4 items-center mb-2 interactive-row">
                <div className="w-full md:w-1/2">
                  <span className="md:hidden text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e] mr-1">Ingrediente:</span>
                  <span className="text-[16px] leading-[1.5] font-medium text-[#151c27]">{getIngredientName(ing)}</span>
                </div>
                <div className="w-full md:w-1/4 flex items-center gap-2 md:justify-center">
                  <span className="md:hidden text-xs text-[#5f5e5e]">Cantidad:</span>
                  <span className="text-sm text-[#151c27]">{ing.quantityUsed} {ing.unit}</span>
                  <button
                    onClick={() => startEditIngredient(ing)}
                    className="interactive-btn text-[#5f5e5e] hover:text-[#b80049] transition-colors"
                    title="Editar cantidad"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                  </button>
                </div>
                <div className="w-full md:w-1/4 flex justify-between md:justify-end items-center gap-2">
                  <span className="md:hidden text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Costo:</span>
                  <span className="text-[20px] leading-[1.2] text-[#151c27] font-semibold">{formatCurrency(ing.cost)}</span>
                  <button
                    onClick={() => removeIngredientFromRecipe(ing.id)}
                    className="interactive-btn text-[#ba1a1a] hover:text-[#ffffff] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#ffdad6]"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            )
          ))}

          {/* Input para nuevo ingrediente */}
          <div className="bg-[#ffd9de]/10 p-4 rounded-xl border border-[#e4bdc2]/30 flex flex-col md:flex-row gap-4 items-center">
            <div className="w-full md:w-1/2">
              <div className="relative">
                <select
                  className="interactive-input w-full appearance-none px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#5f5e5e] text-[16px] pr-10"
                  value={newIngredient.baseIngredientId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const base = baseIngredients.find(ing => ing.id === selectedId);
                    setNewIngredient({
                      ...newIngredient,
                      baseIngredientId: selectedId,
                      unit: base?.unit || 'g',
                    });
                  }}
                >
                  <option value="" disabled>Seleccionar ingrediente...</option>
                  {baseIngredients.map((ing: BaseIngredient) => (
                    <option key={ing.id} value={ing.id}>{ing.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#5f5e5e]">
                  <span className="material-symbols-outlined">expand_more</span>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/4 flex gap-2">
              <input
                className="interactive-input w-2/3 px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                type="number" min="0" placeholder="250"
                value={newIngredient.quantityUsed}
                onChange={(e) => setNewIngredient({ ...newIngredient, quantityUsed: e.target.value })}
              />
              <div className="relative w-1/3">
                <select
                  className="interactive-input w-full appearance-none px-2 py-3 rounded-lg border border-gray-200 bg-white text-[#5f5e5e] text-[16px] text-center"
                  value={newIngredient.unit}
                  onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value as Unit })}
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="l">l</option>
                  <option value="ml">ml</option>
                  <option value="unidad">unidad</option>
                </select>
              </div>
            </div>
            <div className="w-full md:w-1/4 flex justify-between md:justify-end items-center gap-4">
              <span className="md:hidden text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Costo:</span>
              <span className="text-[18px] leading-[1.2] text-[#151c27] font-semibold">
                {newIngredient.baseIngredientId && newIngredient.quantityUsed
                  ? formatCurrency(calculateIngredientCost(newIngredient.baseIngredientId, parseFloat(newIngredient.quantityUsed) || 0, newIngredient.unit))
                  : '$0,00'}
              </span>
              <button
                onClick={addIngredientToRecipe}
                className="interactive-btn text-[#b80049] hover:text-[#900038] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#ffd9de]"
              >
                <span className="material-symbols-outlined text-[24px]">add_circle</span>
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* ── PASO 3: Costos Adicionales + Resumen ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Costos Adicionales */}
        <div id="col-costos-adicionales">
          <article className="bg-white rounded-[24px] border border-gray-100 p-8 card-animate delay-300" style={stitchShadow}>
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-[#b80049] text-[28px]">local_shipping</span>
              <h2 className="font-semibold text-[24px] leading-[1.3] text-[#151c27]" style={stitchFontManrope}>3. Costos Adicionales</h2>
            </div>
            <div className="space-y-6">
              {[
                { key: 'packaging', label: 'Packaging / Cajas' },
                { key: 'bags', label: 'Bolsas / Stickers' },
                { key: 'shipping', label: 'Envío / Logística' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between group">
                  <label className="text-[16px] text-[#5f5e5e] group-hover:text-[#151c27] transition-colors">{label}</label>
                  <div className="relative w-32">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#c5c7c8] pointer-events-none">$</span>
                    <input
                      className="interactive-input w-full pl-8 pr-4 py-2 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-right text-[#151c27] placeholder:text-[#c5c7c8]"
                      placeholder="0" type="number" min="0"
                      value={(currentRecipe.extraCosts as any)?.[key] ?? ''}
                      onChange={(e) => setCurrentRecipe({
                        ...currentRecipe,
                        extraCosts: { ...currentRecipe.extraCosts!, [key]: e.target.value as any }
                      })}
                    />
                  </div>
                </div>
              ))}
              <hr className="border-gray-100 my-6" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-[14px] leading-[1.4] tracking-[0.05em] font-bold text-[#b80049]">Margen de Ganancia (%)</h3>
                  <p className="text-[12px] text-[#5a5c5d]">Porcentaje extra sobre el costo total</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-20">
                    <input
                      className="interactive-input w-full px-4 py-2 rounded-lg border-2 border-[#ffd9de] bg-white text-center text-[#b80049] font-semibold placeholder:text-[#c5c7c8]"
                      placeholder="Ej: 40" type="number" min="0" max="500"
                      value={currentRecipe.profitMargin ?? ''}
                      onChange={(e) => setCurrentRecipe({ ...currentRecipe, profitMargin: e.target.value as any })}
                    />
                  </div>
                  <span className="text-[#b80049] font-bold">%</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {[10, 20, 30, 40].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setCurrentRecipe({ ...currentRecipe, profitMargin: String(pct) as any })}
                    className={`interactive-btn px-4 py-1.5 rounded-full transition-colors text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-xs ${
                      String(currentRecipe.profitMargin) === String(pct)
                        ? 'bg-[#ffd9de] text-[#400014]'
                        : 'bg-[#ffd9de]/30 text-[#b80049] hover:bg-[#ffd9de]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </article>
        </div>

        {/* Resumen Total */}
        <div id="col-resumen-total">
          <article
            className="bg-[#b80049] rounded-[32px] p-8 text-white card-animate delay-400"
            style={{ boxShadow: '0 20px 50px rgba(184, 0, 73, 0.3)' }}
          >
            <h2
              className="font-bold text-[28px] mb-8"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Resumen Total
            </h2>
            <div className="space-y-4 text-sm text-[#ffb2be]" style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', lineHeight: '1.5' }}>
              <div className="flex justify-between items-center border-b border-white/20 pb-4">
                <span>Subtotal Ingredientes:</span>
                <span className="text-white font-medium" style={{ fontSize: '20px', lineHeight: '1.2', fontWeight: '500', fontFamily: "'Inter', sans-serif" }}>{formatCurrency(totals.ingredientsCost)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/20 pb-4">
                <span>Costos Adicionales:</span>
                <span className="text-white font-medium" style={{ fontSize: '20px', lineHeight: '1.2', fontWeight: '500', fontFamily: "'Inter', sans-serif" }}>{formatCurrency(totals.extraCostsTotal)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/20 pb-4">
                <span>Costo Neto:</span>
                <span className="text-white font-medium" style={{ fontSize: '20px', lineHeight: '1.2', fontWeight: '500', fontFamily: "'Inter', sans-serif" }}>{formatCurrency(totals.totalCost)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-white text-base">Total ({currentRecipe.profitMargin || 0}% Ganancia):</span>
                <span className="text-white font-bold text-lg" style={{ fontSize: '20px', lineHeight: '1.2', fontWeight: '700', fontFamily: "'Inter', sans-serif" }}>{formatCurrency(totals.totalWithProfit)}</span>
              </div>
            </div>
            <div className="mt-10 pt-6 border-t border-white/20">
              <p
                className="uppercase tracking-widest text-[#ffd9de] mb-1 text-[10px] font-bold"
                style={{ fontSize: '14px', letterSpacing: '0.05em', lineHeight: '1.4', fontWeight: '600', fontFamily: "'Inter', sans-serif" }}
              >
                COSTO POR UNIDAD
              </p>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="font-extrabold text-[42px] leading-none" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: '800' }}>{formatCurrency(totals.costPerUnit)}</span>
                <span className="text-[#ffb2be] text-sm">/ porción</span>
              </div>
              <button
                onClick={editingRecipeId ? updateRecipe : saveRecipe}
                disabled={!canSave || isSaving}
                className="interactive-btn w-full py-4 bg-white text-[#b80049] rounded-full font-bold tracking-wider hover:bg-[#ffd9de] hover:text-[#400014] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontSize: '14px', letterSpacing: '0.05em', lineHeight: '1.4', fontWeight: '600', fontFamily: "'Inter', sans-serif" }}
              >
                {isSaving ? 'GUARDANDO...' : (editingRecipeId ? 'ACTUALIZAR RECETA' : 'GUARDAR RECETA')}
              </button>
              {editingRecipeId && (
                <button
                  onClick={cancelEdit}
                  className="interactive-btn mt-2 w-full py-2.5 bg-transparent border border-white text-white rounded-full font-bold hover:bg-white/10 transition-colors"
                  style={{ fontSize: '14px', letterSpacing: '0.05em', lineHeight: '1.4', fontWeight: '600', fontFamily: "'Inter', sans-serif" }}
                >
                  CANCELAR
                </button>
              )}
            </div>
          </article>
        </div>
      </div>

      {/* ── PASO 4: Presupuesto para Pedido ── */}
      <article className="bg-white rounded-[24px] border border-gray-100 p-8 card-animate delay-500" style={stitchShadow}>
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-[#b80049] text-[28px]">shopping_bag</span>
          <h2 className="font-semibold text-[24px] leading-[1.3] text-[#151c27]" style={stitchFontManrope}>4. Presupuesto para Pedido</h2>
        </div>
        <p className="text-[#5f5e5e] text-[16px] leading-[1.5] mb-6 text-sm">Calculá el costo total de un pedido según la cantidad de unidades.</p>
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="w-full md:w-1/3 space-y-2">
            <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Cantidad de unidades</label>
            <input
              className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
              placeholder="Ej: 50" type="number" min="1"
              value={budgetQty}
              onChange={(e) => setBudgetQty(e.target.value)}
            />
          </div>
          <div className="w-full md:w-2/3 flex flex-wrap gap-2 pb-1">
            {QUICK_QUANTITIES.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setBudgetQty(String(value))}
                className={`interactive-btn px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 ${
                  budgetQty === String(value)
                    ? 'bg-[#b80049] text-white'
                    : 'bg-[#f0f3ff] text-[#5f5e5e] hover:bg-[#dce2f3]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {(parseFloat(budgetQty) > 0 && totals.costPerUnit > 0) ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-[#f0f3ff] rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wide mb-1">Cantidad</p>
              <p className="text-2xl font-black text-[#151c27]">{parseFloat(budgetQty)} <span className="text-base font-semibold text-[#5f5e5e]">und.</span></p>
            </div>
            <div className="bg-[#f0f3ff] rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wide mb-1">Precio por unidad</p>
              <p className="text-2xl font-black text-[#151c27]">{formatCurrency(totals.costPerUnit)}</p>
            </div>
            <div className="bg-[#b80049] rounded-xl p-4 text-center" style={{ boxShadow: '0 20px 50px rgba(184, 0, 73, 0.3)' }}>
              <p className="text-xs font-bold text-white/80 uppercase tracking-wide mb-1">Total del Pedido</p>
              <p className="text-2xl font-black text-white">{formatCurrency(budgetTotal)}</p>
            </div>
            <div className={`rounded-xl p-4 text-center ${budgetNetProfit > 0 ? 'bg-emerald-500' : 'bg-[#f0f3ff]'}`} style={budgetNetProfit > 0 ? { boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)' } : {}}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${budgetNetProfit > 0 ? 'text-white/70' : 'text-[#5f5e5e]'}`}>Ganancia Neta</p>
              <p className={`text-2xl font-black ${budgetNetProfit > 0 ? 'text-white' : 'text-[#151c27]'}`}>{formatCurrency(budgetNetProfit)}</p>
            </div>
          </div>
        ) : (
          <div className="mt-8 p-6 bg-white border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-[#c5c7c8] text-sm italic">
            {totals.costPerUnit === 0
              ? 'Completá la receta para ver el presupuesto.'
              : 'Ingresá una cantidad para calcular el presupuesto del pedido.'}
          </div>
        )}
      </article>

    </div>
  );
}
