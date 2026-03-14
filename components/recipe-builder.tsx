'use client';

import { useState, useEffect } from 'react';
import { BaseIngredient, Recipe, RecipeIngredient, ExtraCosts, Unit, SaleType } from '@/lib/types';
import { storage } from '@/lib/storage';

interface RecipeBuilderProps {
  isIngredientsLocked?: boolean;
  ingredientsVersion?: number;
  onStockDeducted?: () => void;
}

export function RecipeBuilder({ isIngredientsLocked = false, ingredientsVersion = 0, onStockDeducted }: RecipeBuilderProps) {
  const [baseIngredients, setBaseIngredients] = useState<BaseIngredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentRecipe, setCurrentRecipe] = useState<any>({
    name: '',
    ingredients: [],
    extraCosts: { packaging: '', bags: '', labels: '', shipping: '', others: '' },
    unitsProduced: '',
    profitMargin: '',
    saleType: 'unidad',
  });
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  
  const [newIngredient, setNewIngredient] = useState({
    baseIngredientId: '',
    quantityUsed: '',
    unit: 'g' as Unit,
  });

  useEffect(() => {
    setBaseIngredients(storage.getIngredients());
    setRecipes(storage.getRecipes());
  }, []);

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
    const quantityInBase = toBaseQuantity(quantityUsed, unit);
    return baseIngredient.pricePerUnit * quantityInBase;
  };

  const deductStock = (recipeIngredients: RecipeIngredient[]) => {
    const currentIngredients = storage.getIngredients();
    const updated = currentIngredients.map(ing => {
      const usedItems = recipeIngredients.filter(ri => ri.baseIngredientId === ing.id);
      if (usedItems.length === 0) return ing;

      let totalUsedInBase = 0;
      for (const item of usedItems) {
        totalUsedInBase += toBaseQuantity(item.quantityUsed, item.unit);
      }

      const newQuantity = Math.max(0, ing.purchasedQuantity - totalUsedInBase);
      const newTotalPrice = ing.purchasedQuantity > 0
        ? (ing.totalPrice / ing.purchasedQuantity) * newQuantity
        : 0;
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

    setCurrentRecipe({
      ...currentRecipe,
      ingredients: [...(currentRecipe.ingredients || []), recipeIngredient],
    });

    setNewIngredient({ baseIngredientId: '', quantityUsed: '', unit: 'g' });
  };

  const removeIngredientFromRecipe = (id: string) => {
    setCurrentRecipe({
      ...currentRecipe,
      ingredients: currentRecipe.ingredients?.filter((ing: RecipeIngredient) => ing.id !== id) || [],
    });
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

    setCurrentRecipe({
      name: '',
      ingredients: [],
      extraCosts: { packaging: '', bags: '', labels: '', shipping: '', others: '' } as any,
      unitsProduced: '',
      profitMargin: '',
      saleType: 'unidad',
    });
  };

  const deleteRecipe = (id: string) => {
    const updated = recipes.filter(r => r.id !== id);
    setRecipes(updated);
    storage.saveRecipes(updated);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setCurrentRecipe({
      name: '',
      ingredients: [],
      extraCosts: { packaging: '', bags: '', labels: '', shipping: '', others: '' } as any,
      unitsProduced: '',
      profitMargin: '',
      saleType: 'unidad',
    });
  };

  const cancelEdit = () => {
    setEditingRecipeId(null);
    setCurrentRecipe({
      name: '',
      ingredients: [],
      extraCosts: { packaging: '', bags: '', labels: '', shipping: '', others: '' },
      unitsProduced: '',
      profitMargin: '',
      saleType: 'unidad',
    });
  };

  const toggleRecipeExpanded = (id: string) => {
    const newExpanded = new Set(expandedRecipes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRecipes(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const getIngredientName = (baseIngredientId: string) => {
    return baseIngredients.find(ing => ing.id === baseIngredientId)?.name || 'Desconocido';
  };

  const totals = calculateRecipeTotals(currentRecipe);

  if (baseIngredients.length === 0 || !isIngredientsLocked) {
    return (
      <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center mt-12">
        <p className="text-slate-500 dark:text-slate-400">
          Primero debes agregar ingredientes y bloquear el inventario para poder crear recetas
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-12 mt-12">
      {/* Section 2: Recipe Builder */}
      <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[#ee2b6c]">menu_book</span>
            <h3 className="text-xl font-bold">2. Armador de Receta</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre de la Receta</label>
              <input
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-[#ee2b6c] focus:border-[#ee2b6c]"
                placeholder="Ej: Pastel de Chocolate Especial"
                type="text"
                value={currentRecipe.name}
                onChange={(e) => setCurrentRecipe({ ...currentRecipe, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Rendimiento (Porciones)</label>
              <input
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-[#ee2b6c] focus:border-[#ee2b6c]"
                placeholder="Ej: 12"
                type="number"
                value={currentRecipe.unitsProduced ?? ''}
                onChange={(e) => setCurrentRecipe({ ...currentRecipe, unitsProduced: e.target.value as any })}
              />
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase px-2">
              <div className="col-span-5">Ingrediente</div>
              <div className="col-span-3 text-center">Cantidad Usada</div>
              <div className="col-span-3 text-right">Costo Calculado</div>
              <div className="col-span-1"></div>
            </div>

            {/* Existing recipe ingredients */}
            {currentRecipe.ingredients?.map((ing) => (
              <div key={ing.id} className="grid grid-cols-12 gap-4 items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                <div className="col-span-5 text-sm font-medium">
                  {getIngredientName(ing.baseIngredientId)}
                </div>
                <div className="col-span-3 flex items-center justify-center gap-2">
                  <span className="text-sm">{ing.quantityUsed} {ing.unit}</span>
                </div>
                <div className="col-span-3 text-right font-bold text-slate-700 dark:text-slate-300">
                  {formatCurrency(ing.cost)}
                </div>
                <div className="col-span-1 text-center">
                  <span
                    onClick={() => removeIngredientFromRecipe(ing.id)}
                    className="material-symbols-outlined text-slate-300 text-[18px] cursor-pointer hover:text-red-500"
                  >
                    close
                  </span>
                </div>
              </div>
            ))}

            {/* Input for new ingredient */}
            <div className="grid grid-cols-12 gap-4 items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
              <div className="col-span-5">
                <select
                  className="w-full rounded-lg border-none bg-transparent text-sm focus:ring-0"
                  value={newIngredient.baseIngredientId}
                  onChange={(e) => setNewIngredient({ ...newIngredient, baseIngredientId: e.target.value })}
                >
                  <option value="" disabled>Seleccionar...</option>
                  {baseIngredients.map((ing: BaseIngredient) => (
                    <option key={ing.id} value={ing.id}>{ing.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3 flex items-center gap-2">
                <input
                  className="w-full text-center rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm py-1"
                  type="number"
                  placeholder="250"
                  value={newIngredient.quantityUsed}
                  onChange={(e) => setNewIngredient({ ...newIngredient, quantityUsed: e.target.value })}
                />
                <select
                  className="w-16 text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-transparent py-1 pl-1 pr-6"
                  value={newIngredient.unit}
                  onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value as Unit })}
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="l">l</option>
                  <option value="ml">ml</option>
                  <option value="unidad">ud</option>
                </select>
              </div>
              <div className="col-span-3 text-right font-bold text-slate-700 dark:text-slate-300">
                {newIngredient.baseIngredientId && newIngredient.quantityUsed ?
                  formatCurrency(calculateIngredientCost(newIngredient.baseIngredientId, parseFloat(newIngredient.quantityUsed) || 0, newIngredient.unit)) 
                  : '$0,00'
                }
              </div>
              <div className="col-span-1 text-center">
                <span onClick={addIngredientToRecipe} className="material-symbols-outlined text-[#ee2b6c] text-[22px] cursor-pointer hover:scale-110">
                  add_circle
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Additional Costs & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Additional Costs */}
        <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ee2b6c]">local_shipping</span>
            <h3 className="text-xl font-bold">3. Costos Adicionales</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Packaging / Cajas</label>
              <div className="flex items-center gap-2 w-32">
                <span className="text-slate-400">$</span>
                <input
                  className="w-full text-right rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  placeholder="0" type="number"
                  value={currentRecipe.extraCosts?.packaging ?? ''}
                  onChange={(e) => setCurrentRecipe({
                    ...currentRecipe,
                    extraCosts: { ...currentRecipe.extraCosts!, packaging: e.target.value as any }
                  })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Bolsas / Stickers</label>
              <div className="flex items-center gap-2 w-32">
                <span className="text-slate-400">$</span>
                <input
                  className="w-full text-right rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  placeholder="0" type="number"
                  value={currentRecipe.extraCosts?.bags ?? ''}
                  onChange={(e) => setCurrentRecipe({
                    ...currentRecipe,
                    extraCosts: { ...currentRecipe.extraCosts!, bags: e.target.value as any }
                  })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Envío / Logística</label>
              <div className="flex items-center gap-2 w-32">
                <span className="text-slate-400">$</span>
                <input
                  className="w-full text-right rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  placeholder="0" type="number"
                  value={currentRecipe.extraCosts?.shipping ?? ''}
                  onChange={(e) => setCurrentRecipe({
                    ...currentRecipe,
                    extraCosts: { ...currentRecipe.extraCosts!, shipping: e.target.value as any }
                  })}
                />
              </div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex items-center justify-between gap-4">
              <div>
                <label className="text-sm font-bold text-[#ee2b6c] dark:text-[#fc5c91]">Margen de Ganancia (%)</label>
                <p className="text-xs text-slate-500">Porcentaje extra sobre el costo total</p>
              </div>
              <div className="flex items-center gap-2 w-32">
                <input
                  className="w-full text-right rounded-lg border-[#ee2b6c]/30 dark:border-[#ee2b6c]/30 bg-[#ee2b6c]/5 dark:bg-[#ee2b6c]/10 text-sm font-bold focus:ring-[#ee2b6c] focus:border-[#ee2b6c]"
                  placeholder="40" type="number"
                  value={currentRecipe.profitMargin ?? ''}
                  onChange={(e) => setCurrentRecipe({
                    ...currentRecipe,
                    profitMargin: e.target.value as any
                  })}
                />
                <span className="text-[#ee2b6c] font-bold">%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Total Summary Card */}
        <section className="rounded-xl bg-[#ee2b6c] text-white p-8 shadow-lg shadow-[#ee2b6c]/20 flex flex-col justify-between">
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
              <div className="flex justify-between text-sm mt-1 mb-2 opacity-80 border-t border-white/10 pt-1">
                <span>Costo Neto:</span>
                <span>{formatCurrency(totals.totalCost)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2">
                <span>Total Gral ({(currentRecipe.profitMargin || 0)}% Ganancia):</span>
                <span>{formatCurrency(totals.totalWithProfit)}</span>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <p className="text-xs uppercase font-bold tracking-widest opacity-80 mb-1">Costo por Unidad</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black">{formatCurrency(totals.costPerUnit)}</span>
              <span className="text-lg opacity-80">/ porción</span>
            </div>
          </div>
          <button
            onClick={editingRecipeId ? updateRecipe : saveRecipe}
            className="mt-6 w-full py-4 bg-white text-[#ee2b6c] rounded-xl font-black text-lg shadow-xl hover:scale-[1.02] transition-transform"
          >
            {editingRecipeId ? 'ACTUALIZAR RECETA' : 'GUARDAR RECETA'}
          </button>
          {editingRecipeId && (
            <button
              onClick={cancelEdit}
              className="mt-2 w-full py-2 bg-transparent border border-white text-white rounded-xl font-bold hover:bg-white/10 transition-colors"
            >
              CANCELAR
            </button>
          )}
        </section>
      </div>

      {/* Recetas Guardadas (Extra para no perder funcionalidad) */}
      {recipes.length > 0 && (
        <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mt-12 p-6">
          <h3 className="text-xl font-bold mb-6">Recetas Guardadas</h3>
          <div className="space-y-4">
            {recipes.map(recipe => (
              <div key={recipe.id} className="border border-slate-100 dark:border-slate-800 rounded-lg p-4">
                <div 
                  className="flex items-center justify-between cursor-pointer" 
                  onClick={() => toggleRecipeExpanded(recipe.id)}
                >
                  <div>
                    <h4 className="font-semibold text-lg">{recipe.name}</h4>
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
