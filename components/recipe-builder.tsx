'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { BaseIngredient, Recipe, RecipeIngredient, Unit } from '@/lib/types';
import { storage } from '@/lib/storage';

interface RecipeBuilderProps {
  isIngredientsLocked?: boolean;
  ingredientsVersion?: number;
  onStockDeducted?: () => void;
}

// Opciones rápidas de presupuesto
const QUICK_QUANTITIES = [
  { label: '½ doc.', value: 6 },
  { label: '1 doc.', value: 12 },
  { label: '2 doc.', value: 24 },
  { label: '3 doc.', value: 36 },
];

export function RecipeBuilder({ isIngredientsLocked = false, ingredientsVersion = 0, onStockDeducted }: RecipeBuilderProps) {
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
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);

  // Estado para edición inline de cantidad de un ingrediente en la receta
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState('');
  const [editingUnit, setEditingUnit] = useState<Unit>('g');

  // Estado presupuesto
  const [budgetQty, setBudgetQty] = useState('');

  const [newIngredient, setNewIngredient] = useState({
    baseIngredientId: '',
    quantityUsed: '',
    unit: 'g' as Unit,
  });

  const searchParams = useSearchParams();

  // Cargar datos iniciales + restaurar borrador
  useEffect(() => {
    const ingredients = storage.getIngredients();
    const savedRecipes = storage.getRecipes();
    setBaseIngredients(ingredients);
    setRecipes(savedRecipes);

    // Si viene ?edit=<id>, cargar esa receta para edición
    const editId = searchParams.get('edit');
    if (editId) {
      const recipeToEdit = savedRecipes.find(r => r.id === editId);
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
        // Scroll al armador de receta
        setTimeout(() => {
          document.getElementById('recipe-builder')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        return;
      }
    }

    // Restaurar borrador si existe (solo cuando no estamos editando una receta guardada)
    const draft = storage.getDraft();
    if (draft) setCurrentRecipe(draft);
  }, [searchParams]);

  // Persistir borrador en cada cambio (solo si no estamos en modo edición de receta guardada)
  useEffect(() => {
    if (editingRecipeId) return; // No sobreescribir el draft cuando se edita una receta guardada
    storage.saveDraft(currentRecipe);
  }, [currentRecipe, editingRecipeId]);

  useEffect(() => {
    if (ingredientsVersion === 0) return;
    setBaseIngredients(storage.getIngredients());
  }, [ingredientsVersion]);

  const toBaseQuantity = (quantity: number, unit: Unit): number => {
    if (unit === 'kg') return quantity * 1000;
    if (unit === 'l') return quantity * 1000;
    return quantity;
  };

  const calculateIngredientCost = (baseIngredientId: string, quantityUsed: number, unit: Unit): number => {
    const baseIngredient = baseIngredients.find(ing => ing.id === baseIngredientId);
    if (!baseIngredient) return 0;
    return baseIngredient.pricePerUnit * toBaseQuantity(quantityUsed, unit);
  };

  const deductStock = (recipeIngredients: RecipeIngredient[]) => {
    const currentIngredients = storage.getIngredients();
    const updated = currentIngredients.map(ing => {
      const usedItems = recipeIngredients.filter(ri => ri.baseIngredientId === ing.id);
      if (usedItems.length === 0) return ing;
      let totalUsedInBase = 0;
      for (const item of usedItems) totalUsedInBase += toBaseQuantity(item.quantityUsed, item.unit);
      const newQuantity = Math.max(0, ing.purchasedQuantity - totalUsedInBase);
      const newTotalPrice = ing.purchasedQuantity > 0 ? (ing.totalPrice / ing.purchasedQuantity) * newQuantity : 0;
      const newPricePerUnit = newQuantity > 0 ? newTotalPrice / newQuantity : ing.pricePerUnit;
      return { ...ing, purchasedQuantity: newQuantity, totalPrice: newTotalPrice, pricePerUnit: newPricePerUnit };
    });
    storage.saveIngredients(updated);
    setBaseIngredients(updated);
    onStockDeducted?.();
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
    const recipeIngredient: RecipeIngredient = {
      id: crypto.randomUUID(),
      baseIngredientId: newIngredient.baseIngredientId,
      quantityUsed,
      unit: newIngredient.unit,
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

  // Iniciar edición inline de cantidad de ingrediente en receta
  const startEditIngredient = (ing: RecipeIngredient) => {
    setEditingIngredientId(ing.id);
    setEditingQuantity(String(ing.quantityUsed));
    setEditingUnit(ing.unit);
  };

  const saveEditIngredient = (ingId: string) => {
    const qty = parseFloat(editingQuantity);
    if (!qty || qty <= 0) return;
    const updatedIngredients = (currentRecipe.ingredients || []).map((ing: RecipeIngredient) => {
      if (ing.id !== ingId) return ing;
      const cost = calculateIngredientCost(ing.baseIngredientId, qty, editingUnit);
      return { ...ing, quantityUsed: qty, unit: editingUnit, cost };
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

  const saveRecipe = () => {
    if (!currentRecipe.name || !currentRecipe.ingredients?.length) return;
    const { totalCost, costPerUnit } = calculateRecipeTotals(currentRecipe);
    const recipe: Recipe = {
      id: crypto.randomUUID(),
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
    const updated = [...recipes, recipe];
    setRecipes(updated);
    storage.saveRecipes(updated);
    deductStock(currentRecipe.ingredients);
    resetCurrentRecipe();
    router.push('/recetas');
  };

  const deleteRecipe = (id: string) => {
    const recipe = recipes.find(r => r.id === id);
    toast('¿Eliminar esta receta?', {
      description: `"${recipe?.name}" se eliminará permanentemente.`,
      action: {
        label: 'Eliminar',
        onClick: () => {
          const updated = recipes.filter(r => r.id !== id);
          setRecipes(updated);
          storage.saveRecipes(updated);
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {},
      },
      duration: 8000,
    });
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

  const updateRecipe = () => {
    if (!currentRecipe.name || !currentRecipe.ingredients?.length || !editingRecipeId) return;
    const { totalCost, costPerUnit } = calculateRecipeTotals(currentRecipe);
    const recipe: Recipe = {
      id: editingRecipeId,
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
    const updated = recipes.map(r => r.id === editingRecipeId ? recipe : r);
    setRecipes(updated);
    storage.saveRecipes(updated);
    setEditingRecipeId(null);
    resetCurrentRecipe();
  };

  const cancelEdit = () => {
    setEditingRecipeId(null);
    resetCurrentRecipe();
  };

  const toggleRecipeExpanded = (id: string) => {
    const newExpanded = new Set(expandedRecipes);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRecipes(newExpanded);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

  const getIngredientName = (baseIngredientId: string) =>
    baseIngredients.find(ing => ing.id === baseIngredientId)?.name || 'Desconocido';

  const totals = calculateRecipeTotals(currentRecipe);
  const budgetTotal = totals.costPerUnit * (parseFloat(budgetQty) || 0);

  if (baseIngredients.length === 0) {
    return (
      <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center mt-12">
        <p className="text-slate-500 dark:text-slate-400">
          Primero debes agregar ingredientes y bloquear el inventario para poder crear recetas
        </p>
      </section>
    );
  }

  const canSave = isIngredientsLocked;

  return (
    <div id="recipe-builder" className="space-y-8 mt-12">

      {/* ── PASO 2: Armador de Receta ── */}
      <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-5">
            <span className="material-symbols-outlined text-[#ee2b6c]">menu_book</span>
            <h3 className="text-xl font-bold">2. Armador de Receta</h3>
          </div>

          {!canSave && (
            <div className="mb-4 px-4 py-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">lock</span>
              Bloqueá el inventario para poder guardar recetas.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre de la Receta</label>
              <input
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c] focus:border-[#ee2b6c]"
                placeholder="Ej: Pastel de Chocolate Especial"
                type="text"
                value={currentRecipe.name}
                onChange={(e) => setCurrentRecipe({ ...currentRecipe, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Rendimiento (Porciones)</label>
              <input
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c] focus:border-[#ee2b6c]"
                placeholder="Ej: 12"
                type="number"
                min="0"
                value={currentRecipe.unitsProduced ?? ''}
                onChange={(e) => setCurrentRecipe({ ...currentRecipe, unitsProduced: e.target.value as any })}
              />
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="space-y-3">
            {/* Header desktop */}
            <div className="hidden sm:grid grid-cols-12 gap-3 text-xs font-bold text-slate-500 uppercase px-2">
              <div className="col-span-4">Ingrediente</div>
              <div className="col-span-4 text-center">Cant. Usada</div>
              <div className="col-span-3 text-right">Costo Calc.</div>
              <div className="col-span-1"></div>
            </div>

            {/* Ingredientes agregados a la receta */}
            {currentRecipe.ingredients?.map((ing: any) => (
              editingIngredientId === ing.id ? (
                /* ── Fila edición inline de cantidad ── */
                <div key={ing.id} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 items-start sm:items-center bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 rounded-md">
                  <div className="sm:col-span-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {getIngredientName(ing.baseIngredientId)}
                    <span className="block text-xs text-blue-500 font-normal">editando cantidad...</span>
                  </div>
                  <div className="sm:col-span-4 w-full">
                    <div className="flex items-center gap-2">
                      <input
                        className="flex-1 min-w-0 rounded-md border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        type="number" min="0" placeholder="250"
                        value={editingQuantity}
                        onChange={(e) => setEditingQuantity(e.target.value)}
                        autoFocus
                      />
                      <select
                        className="w-24 shrink-0 rounded-md border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                  </div>
                  <div className="sm:col-span-3 text-sm text-slate-500 sm:text-right">
                    {editingQuantity
                      ? formatCurrency(calculateIngredientCost(ing.baseIngredientId, parseFloat(editingQuantity) || 0, editingUnit))
                      : '—'}
                  </div>
                  <div className="sm:col-span-1 flex sm:flex-col gap-1.5 items-center sm:items-center">
                    <button onClick={() => saveEditIngredient(ing.id)} className="p-1 text-blue-500 hover:text-blue-700">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </button>
                    <button onClick={() => setEditingIngredientId(null)} className="p-1 text-slate-400 hover:text-slate-600">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Fila normal con botón editar ── */
                <div key={ing.id} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 items-start sm:items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md group">
                  <div className="sm:col-span-4 text-sm font-medium w-full sm:w-auto">
                    <span className="sm:hidden text-xs text-slate-400 font-normal mr-1">Ingrediente:</span>
                    {getIngredientName(ing.baseIngredientId)}
                  </div>
                  <div className="sm:col-span-4 flex items-center gap-2 w-full sm:w-auto sm:justify-center">
                    <span className="sm:hidden text-xs text-slate-400">Cantidad:</span>
                    <span className="text-sm">{ing.quantityUsed} {ing.unit}</span>
                    <button
                      onClick={() => startEditIngredient(ing)}
                      className="p-0.5 text-slate-300 hover:text-blue-500 transition-all"
                      title="Editar cantidad"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                    </button>
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2 w-full sm:w-auto sm:justify-end">
                    <span className="sm:hidden text-xs text-slate-400">Costo:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(ing.cost)}</span>
                  </div>
                  <div className="sm:col-span-1 sm:text-center self-end sm:self-auto">
                    <span
                      onClick={() => removeIngredientFromRecipe(ing.id)}
                      className="material-symbols-outlined text-slate-300 text-[18px] cursor-pointer hover:text-red-500"
                    >close</span>
                  </div>
                </div>
              )
            ))}

            {/* Input para nuevo ingrediente */}
            <div className="flex flex-col sm:grid sm:grid-cols-12 gap-3 items-start sm:items-center bg-[#ee2b6c]/5 dark:bg-[#ee2b6c]/10 border border-[#ee2b6c]/20 p-3 rounded-md">
              {/* Selector de ingrediente */}
              <div className="w-full sm:col-span-4">
                <label className="sm:hidden text-xs font-bold text-slate-500 uppercase block mb-1">Ingrediente</label>
                <select
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c]"
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
              </div>

              {/* Cantidad + Unidad en mobile: apilados, en desktop: en fila */}
              <div className="w-full sm:col-span-4">
                <label className="sm:hidden text-xs font-bold text-slate-500 uppercase block mb-1">Cantidad Usada</label>
                {/* Mobile: dos campos en columnas fijas */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                  <input
                    className="col-span-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c]"
                    type="number" min="0" placeholder="250"
                    value={newIngredient.quantityUsed}
                    onChange={(e) => setNewIngredient({ ...newIngredient, quantityUsed: e.target.value })}
                  />
                  <select
                    className="col-span-1 w-full sm:w-24 sm:shrink-0 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c]"
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

              {/* Costo calculado + botón agregar (mobile) */}
              <div className="w-full sm:col-span-3 flex items-center justify-between sm:justify-end gap-2">
                <div>
                  <span className="sm:hidden text-xs font-bold text-slate-500 uppercase block mb-0.5">Costo Calc.</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    {newIngredient.baseIngredientId && newIngredient.quantityUsed
                      ? formatCurrency(calculateIngredientCost(newIngredient.baseIngredientId, parseFloat(newIngredient.quantityUsed) || 0, newIngredient.unit))
                      : '$0,00'
                    }
                  </span>
                </div>
                <button
                  onClick={addIngredientToRecipe}
                  className="sm:hidden flex items-center gap-1.5 px-4 py-2.5 bg-[#ee2b6c] text-white rounded-md font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Agregar
                </button>
              </div>

              {/* Botón agregar (desktop) */}
              <div className="hidden sm:flex sm:col-span-1 justify-center">
                <span onClick={addIngredientToRecipe} className="material-symbols-outlined text-[#ee2b6c] text-[24px] cursor-pointer hover:scale-110 transition-transform">
                  add_circle
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PASO 3: Costos Adicionales + Resumen ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Costos Adicionales */}
        <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ee2b6c]">local_shipping</span>
            <h3 className="text-xl font-bold">3. Costos Adicionales</h3>
          </div>
          <div className="space-y-3">
            {[
              { key: 'packaging', label: 'Packaging / Cajas' },
              { key: 'bags', label: 'Bolsas / Stickers' },
              { key: 'shipping', label: 'Envío / Logística' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</label>
                <div className="flex items-center gap-2 w-36">
                  <span className="text-slate-400">$</span>
                  <input
                    className="w-full text-right rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c]"
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
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-bold text-[#ee2b6c] dark:text-[#fc5c91]">Margen de Ganancia (%)</label>
                  <p className="text-xs text-slate-500">Porcentaje extra sobre el costo total</p>
                </div>
                <div className="flex items-center gap-2 w-36">
                  <input
                    className="w-full text-right rounded-md border border-[#ee2b6c]/30 dark:border-[#ee2b6c]/30 bg-[#ee2b6c]/5 dark:bg-[#ee2b6c]/10 text-sm font-bold px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c]"
                    placeholder="Ej: 40" type="number" min="0" max="500"
                    value={currentRecipe.profitMargin ?? ''}
                    onChange={(e) => setCurrentRecipe({ ...currentRecipe, profitMargin: e.target.value as any })}
                  />
                  <span className="text-[#ee2b6c] font-bold">%</span>
                </div>
              </div>
              {/* Chips selección rápida */}
              <div className="flex flex-wrap gap-2">
                {[10, 20, 30, 40].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setCurrentRecipe({ ...currentRecipe, profitMargin: String(pct) as any })}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      String(currentRecipe.profitMargin) === String(pct)
                        ? 'bg-[#ee2b6c] text-white shadow-sm'
                        : 'bg-[#ee2b6c]/10 text-[#ee2b6c] hover:bg-[#ee2b6c]/20'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Resumen Total */}
        <section className="rounded-xl bg-[#ee2b6c] text-white p-7 shadow-lg shadow-[#ee2b6c]/20 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-2xl font-black">Resumen Total</h3>
            <div className="space-y-2 opacity-90 border-b border-white/20 pb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal Ingredientes:</span>
                <span className="font-bold">{formatCurrency(totals.ingredientsCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Costos Adicionales:</span>
                <span className="font-bold">{formatCurrency(totals.extraCostsTotal)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1 opacity-80 border-t border-white/10 pt-1">
                <span>Costo Neto:</span>
                <span>{formatCurrency(totals.totalCost)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2">
                <span>Total ({currentRecipe.profitMargin || 0}% Ganancia):</span>
                <span>{formatCurrency(totals.totalWithProfit)}</span>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <p className="text-xs uppercase font-bold tracking-widest opacity-80 mb-1">Costo por Unidad</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black">{formatCurrency(totals.costPerUnit)}</span>
              <span className="text-lg opacity-80">/ porción</span>
            </div>
          </div>
          <button
            onClick={editingRecipeId ? updateRecipe : saveRecipe}
            disabled={!canSave}
            className="mt-5 w-full py-3.5 bg-white text-[#ee2b6c] rounded-md font-black text-base shadow-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {editingRecipeId ? 'ACTUALIZAR RECETA' : 'GUARDAR RECETA'}
          </button>
          {editingRecipeId && (
            <button
              onClick={cancelEdit}
              className="mt-2 w-full py-2.5 bg-transparent border border-white text-white rounded-md font-bold hover:bg-white/10 transition-colors"
            >
              CANCELAR
            </button>
          )}
        </section>
      </div>

      {/* ── PASO 4: Presupuesto para Pedido ── */}
      <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ee2b6c]">shopping_bag</span>
            <h3 className="text-xl font-bold">4. Presupuesto para Pedido</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Calculá el costo total de un pedido según la cantidad de unidades.
          </p>
        </div>

        <div className="p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            {/* Input cantidad */}
            <div className="w-full sm:w-auto space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Cantidad de unidades</label>
              <div className="flex items-center gap-2">
                <input
                  className="w-full sm:w-40 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c]"
                  type="number" min="1" placeholder="Ej: 30"
                  value={budgetQty}
                  onChange={(e) => setBudgetQty(e.target.value)}
                />
              </div>
            </div>

            {/* Chips rápidos */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 sm:opacity-0 select-none block">Selección rápida</label>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUANTITIES.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
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

          {/* Resultado */}
          {(parseFloat(budgetQty) > 0 && totals.costPerUnit > 0) ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-4 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Cantidad</p>
                <p className="text-2xl font-black text-slate-700 dark:text-slate-200">{parseFloat(budgetQty)} <span className="text-base font-semibold text-slate-400">und.</span></p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-4 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Costo por unidad</p>
                <p className="text-2xl font-black text-slate-700 dark:text-slate-200">{formatCurrency(totals.costPerUnit)}</p>
              </div>
              <div className="bg-[#ee2b6c] rounded-md p-4 text-center shadow-md shadow-[#ee2b6c]/20">
                <p className="text-xs font-bold text-white/80 uppercase tracking-wide mb-1">Total del Pedido</p>
                <p className="text-2xl font-black text-white">{formatCurrency(budgetTotal)}</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 px-4 py-6 rounded-md bg-slate-50 dark:bg-slate-800/30 text-center text-sm text-slate-400">
              {totals.costPerUnit === 0
                ? 'Completá la receta para ver el presupuesto.'
                : 'Ingresá una cantidad para calcular el presupuesto del pedido.'}
            </div>
          )}
        </div>
      </section>

      {/* ── Recetas Guardadas ── */}
      {recipes.length > 0 && (
        <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mt-4 p-5">
          <h3 className="text-xl font-bold mb-5">Recetas Guardadas</h3>
          <div className="space-y-3">
            {recipes.map(recipe => (
              <div key={recipe.id} className="border border-slate-100 dark:border-slate-800 rounded-md p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleRecipeExpanded(recipe.id)}
                >
                  <div>
                    <h4 className="font-semibold text-base">{recipe.name}</h4>
                    <p className="text-sm text-slate-500">{formatCurrency(recipe.costPerUnit)} / porción</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span
                      className="material-symbols-outlined text-slate-400 hover:text-blue-500 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); editRecipe(recipe); }}
                    >edit</span>
                    <span
                      className="material-symbols-outlined text-slate-400 hover:text-red-500 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); deleteRecipe(recipe.id); }}
                    >delete</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
