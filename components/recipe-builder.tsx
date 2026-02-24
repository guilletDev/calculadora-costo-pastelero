'use client';

import { useState, useEffect } from 'react';
import { BaseIngredient, Recipe, RecipeIngredient, ExtraCosts } from '@/lib/types';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { CostSummary } from './cost-summary';

interface RecipeBuilderProps {
  isIngredientsLocked?: boolean;
}

export function RecipeBuilder({ isIngredientsLocked = false }: RecipeBuilderProps) {
  console.log('[v0] RecipeBuilder isIngredientsLocked prop:', isIngredientsLocked);
  
  const [baseIngredients, setBaseIngredients] = useState<BaseIngredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentRecipe, setCurrentRecipe] = useState<Partial<Recipe>>({
    name: '',
    ingredients: [],
    extraCosts: { packaging: 0, bags: 0, labels: 0, shipping: 0, others: 0 },
    unitsProduced: 0,
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

  const calculateIngredientCost = (baseIngredientId: string, quantityUsed: number): number => {
    const baseIngredient = baseIngredients.find(ing => ing.id === baseIngredientId);
    if (!baseIngredient) return 0;

    let quantity = quantityUsed;
    // Convert to base unit if needed
    if (baseIngredient.unit === 'kg' || baseIngredient.unit === 'l') {
      quantity = quantityUsed; // assuming user enters in grams or ml
    }

    return baseIngredient.pricePerUnit * quantity;
  };

  const calculateRecipeTotals = (recipe: Partial<Recipe>) => {
    const ingredientsCost = (recipe.ingredients || []).reduce((sum, ing) => sum + ing.cost, 0);
    const extraCostsTotal = recipe.extraCosts
      ? Object.values(recipe.extraCosts).reduce((sum, cost) => sum + cost, 0)
      : 0;
    const totalCost = ingredientsCost + extraCostsTotal;
    const costPerUnit = recipe.unitsProduced ? totalCost / recipe.unitsProduced : 0;

    return { ingredientsCost, extraCostsTotal, totalCost, costPerUnit };
  };

  const addIngredientToRecipe = () => {
    if (!newIngredient.baseIngredientId || !newIngredient.quantityUsed) return;

    const quantityUsed = parseFloat(newIngredient.quantityUsed);
    const cost = calculateIngredientCost(newIngredient.baseIngredientId, quantityUsed);

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
      ingredients: currentRecipe.ingredients?.filter(ing => ing.id !== id) || [],
    });
  };

  const saveRecipe = () => {
    if (!currentRecipe.name || !currentRecipe.ingredients?.length) return;

    const { totalCost, costPerUnit } = calculateRecipeTotals(currentRecipe);

    const recipe: Recipe = {
      id: crypto.randomUUID(),
      name: currentRecipe.name,
      ingredients: currentRecipe.ingredients,
      extraCosts: currentRecipe.extraCosts!,
      unitsProduced: currentRecipe.unitsProduced || 0,
      saleType: currentRecipe.saleType || 'unidad',
      totalCost,
      costPerUnit,
    };

    const updated = [...recipes, recipe];
    setRecipes(updated);
    storage.saveRecipes(updated);

    setCurrentRecipe({
      name: '',
      ingredients: [],
      extraCosts: { packaging: 0, bags: 0, labels: 0, shipping: 0, others: 0 },
      unitsProduced: 0,
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
      extraCosts: recipe.extraCosts,
      unitsProduced: recipe.unitsProduced,
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
      extraCosts: currentRecipe.extraCosts!,
      unitsProduced: currentRecipe.unitsProduced || 0,
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
      extraCosts: { packaging: 0, bags: 0, labels: 0, shipping: 0, others: 0 },
      unitsProduced: 0,
      saleType: 'unidad',
    });
  };

  const cancelEdit = () => {
    setEditingRecipeId(null);
    setCurrentRecipe({
      name: '',
      ingredients: [],
      extraCosts: { packaging: 0, bags: 0, labels: 0, shipping: 0, others: 0 },
      unitsProduced: 0,
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

  const getIngredientUnit = (baseIngredientId: string) => {
    const ingredient = baseIngredients.find(ing => ing.id === baseIngredientId);
    if (!ingredient) return '';
    return ingredient.unit === 'kg' || ingredient.unit === 'l' ? 
      (ingredient.unit === 'kg' ? 'g' : 'ml') : ingredient.unit;
  };

  const totals = calculateRecipeTotals(currentRecipe);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Crear Nueva Receta</h2>
        <p className="text-muted-foreground">Calcula el costo de tus preparaciones</p>
      </div>

      {baseIngredients.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Primero debes agregar ingredientes en la sección Lista de Ingredientes
          </p>
        </Card>
      ) : !isIngredientsLocked ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Debes presionar Lista terminada en la sección de ingredientes para poder crear recetas
          </p>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="recipe-name">Nombre de la receta</Label>
              <Input
                id="recipe-name"
                placeholder="Ej: Pizza Margarita"
                value={currentRecipe.name}
                onChange={(e) => setCurrentRecipe({ ...currentRecipe, name: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <Label>Ingredientes de la receta</Label>
              
              <div className="grid gap-4 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Ingrediente</Label>
                  <Select
                    value={newIngredient.baseIngredientId}
                    onValueChange={(value) => setNewIngredient({ ...newIngredient, baseIngredientId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar ingrediente" />
                    </SelectTrigger>
                    <SelectContent>
                      {baseIngredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cantidad</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 200"
                    value={newIngredient.quantityUsed}
                    onChange={(e) => setNewIngredient({ ...newIngredient, quantityUsed: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Unidad</Label>
                  <Select
                    value={newIngredient.unit}
                    onValueChange={(value) => setNewIngredient({ ...newIngredient, unit: value as Unit })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="l">l</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="unidad">unidad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={addIngredientToRecipe} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Ingrediente
              </Button>

              {currentRecipe.ingredients && currentRecipe.ingredients.length > 0 && (
                <div className="space-y-2 mt-4">
                  {currentRecipe.ingredients.map((ing) => (
                    <div key={ing.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex-1">
                        <p className="font-medium">{getIngredientName(ing.baseIngredientId)}</p>
                        <p className="text-sm text-muted-foreground">
                          {ing.quantityUsed} {ing.unit} • {formatCurrency(ing.cost)}
                        </p>
                      </div>
                      <Button
                        onClick={() => removeIngredientFromRecipe(ing.id)}
                        variant="ghost"
                        size="icon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm text-muted-foreground">Subtotal ingredientes</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(totals.ingredientsCost)}</p>
                  </div>
                </div>
              )}
            </div>

            {currentRecipe.ingredients && currentRecipe.ingredients.length > 0 && (
              <>
                <div className="space-y-4">
                  <Label>Costos adicionales</Label>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(currentRecipe.extraCosts || {}).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key} className="capitalize">
                          {key === 'packaging' ? 'Packaging' :
                           key === 'bags' ? 'Bolsas' :
                           key === 'labels' ? 'Etiquetas' :
                           key === 'shipping' ? 'Envío' : 'Otros'}
                        </Label>
                        <Input
                          id={key}
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={value || ''}
                          onChange={(e) => setCurrentRecipe({
                            ...currentRecipe,
                            extraCosts: {
                              ...currentRecipe.extraCosts!,
                              [key]: parseFloat(e.target.value) || 0,
                            },
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="units-produced">¿Cuántas unidades rinde esta receta?</Label>
                    <Input
                      id="units-produced"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0"
                      value={currentRecipe.unitsProduced || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setCurrentRecipe({
                          ...currentRecipe,
                          unitsProduced: Math.min(Math.max(value, 0), 100),
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sale-type">Tipo de venta</Label>
                    <Select
                      value={currentRecipe.saleType || 'unidad'}
                      onValueChange={(value) => setCurrentRecipe({
                        ...currentRecipe,
                        saleType: value as SaleType,
                      })}
                    >
                      <SelectTrigger id="sale-type">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unidad">Por unidad</SelectItem>
                        <SelectItem value="docena">Por docena (12)</SelectItem>
                        <SelectItem value="media-docena">Por media docena (6)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <CostSummary
                  ingredientsCost={totals.ingredientsCost}
                  extraCostsTotal={totals.extraCostsTotal}
                  totalCost={totals.totalCost}
                  costPerUnit={totals.costPerUnit}
                  unitsProduced={currentRecipe.unitsProduced || 1}
                />

                <div className="flex gap-2">
                  {editingRecipeId && (
                    <Button onClick={cancelEdit} variant="outline" className="flex-1" size="lg">
                      Cancelar
                    </Button>
                  )}
                  <Button 
                    onClick={editingRecipeId ? updateRecipe : saveRecipe} 
                    className="flex-1" 
                    size="lg"
                  >
                    {editingRecipeId ? 'Actualizar Receta' : 'Guardar Receta'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {recipes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Recetas Guardadas</h3>
          {recipes.map((recipe) => (
            <Card key={recipe.id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleRecipeExpanded(recipe.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{recipe.name}</h4>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{recipe.ingredients.length} ingredientes</span>
                      <span>•</span>
                      <span>{recipe.unitsProduced} {recipe.saleType === 'docena' ? 'docenas' : recipe.saleType === 'media-docena' ? 'medias docenas' : 'unidades'}</span>
                      <span>•</span>
                      <span className="font-semibold text-primary">{formatCurrency(recipe.costPerUnit)} por {recipe.saleType === 'docena' ? 'docena' : recipe.saleType === 'media-docena' ? 'media docena' : 'unidad'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        editRecipe(recipe);
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      Editar
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRecipe(recipe.id);
                      }}
                      variant="ghost"
                      size="icon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {expandedRecipes.has(recipe.id) ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </div>
              </div>

              {expandedRecipes.has(recipe.id) && (
                <div className="border-t p-4 bg-muted/20">
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-semibold mb-2">Ingredientes</h5>
                      <div className="space-y-1">
                        {recipe.ingredients.map((ing) => (
                          <div key={ing.id} className="flex justify-between text-sm">
                            <span>{getIngredientName(ing.baseIngredientId)} ({ing.quantityUsed} {ing.unit})</span>
                            <span className="font-medium">{formatCurrency(ing.cost)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <CostSummary
                      ingredientsCost={recipe.ingredients.reduce((sum, ing) => sum + ing.cost, 0)}
                      extraCostsTotal={Object.values(recipe.extraCosts).reduce((sum, cost) => sum + cost, 0)}
                      totalCost={recipe.totalCost}
                      costPerUnit={recipe.costPerUnit}
                      unitsProduced={recipe.unitsProduced}
                    />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
