import { createClient } from '@/utils/supabase/client';
import { Recipe, RecipeIngredient, Unit, SaleType, ExtraCosts } from './types';
import { RecipeRow, RecipeIngredientRow } from './database.types';

// Convertir DB Row a Frontend Type
function rowToRecipe(
  row: RecipeRow,
  ingredientRows: RecipeIngredientRow[]
): Recipe {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    yieldPortions: row.yield_portions,
    yieldGrams: row.yield_grams,
    saleType: row.sale_type as SaleType,
    extraCosts: row.extra_costs as ExtraCosts,
    profitMargin: row.profit_margin,
    totalCost: row.total_cost,
    costPerUnit: row.cost_per_unit,
    laborMinutes: row.labor_minutes ?? 0,
    ingredients: ingredientRows.map(ingRow => ({
      id: ingRow.id,
      baseIngredientId: ingRow.ingredient_id,
      ingredientName: ingRow.ingredient_name,
      quantityUsed: ingRow.quantity_used,
      unit: ingRow.unit as Unit,
      cost: ingRow.cost,
      componentType: ingRow.component_type as 'ingredient' | 'subproduct',
      subproductRecipeId: ingRow.subproduct_recipe_id,
      subproductRecipeName: ingRow.subproduct_recipe_name,
    })),
  };
}

export async function fetchRecipes(): Promise<Recipe[]> {
  const supabase = createClient();
  
  const { data: recipesData, error: recipesError } = await supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });

  if (recipesError) throw new Error(`Error al cargar recetas: ${recipesError.message}`);

  if (!recipesData || recipesData.length === 0) return [];

  const recipeIds = recipesData.map(r => r.id);

  const { data: ingredientsData, error: ingredientsError } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .in('recipe_id', recipeIds);

  if (ingredientsError) throw new Error(`Error al cargar ingredientes de recetas: ${ingredientsError.message}`);

  const ingredientsByRecipe = (ingredientsData || []).reduce((acc, curr) => {
    if (!acc[curr.recipe_id]) acc[curr.recipe_id] = [];
    acc[curr.recipe_id].push(curr);
    return acc;
  }, {} as Record<string, RecipeIngredientRow[]>);

  return (recipesData as RecipeRow[]).map(row => 
    rowToRecipe(row, ingredientsByRecipe[row.id] || [])
  );
}

export async function fetchRecipeById(id: string): Promise<Recipe | null> {
  const supabase = createClient();
  
  const { data: recipeData, error: recipeError } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single();

  if (recipeError) {
    if (recipeError.code === 'PGRST116') return null; // No results
    throw new Error(`Error al cargar receta: ${recipeError.message}`);
  }

  const { data: ingredientsData, error: ingredientsError } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .eq('recipe_id', id);

  if (ingredientsError) throw new Error(`Error al cargar ingredientes de receta: ${ingredientsError.message}`);

  return rowToRecipe(recipeData as RecipeRow, ingredientsData as RecipeIngredientRow[]);
}

export async function upsertRecipe(recipeDraft: Omit<Recipe, 'id'>, id?: string): Promise<Recipe> {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Usuario no autenticado');
  const userId = userData.user.id;

  const recipeInsertData = {
    user_id: userId,
    name: recipeDraft.name,
    description: recipeDraft.description || '',
    yield_portions: recipeDraft.yieldPortions && recipeDraft.yieldPortions > 0
      ? recipeDraft.yieldPortions
      : null,
    yield_grams: recipeDraft.yieldGrams && recipeDraft.yieldGrams > 0
      ? recipeDraft.yieldGrams
      : null,
    sale_type: recipeDraft.saleType,
    extra_costs: recipeDraft.extraCosts,
    profit_margin: recipeDraft.profitMargin || 0,
    total_cost: recipeDraft.totalCost,
    cost_per_unit: recipeDraft.costPerUnit,
    labor_minutes: recipeDraft.laborMinutes || 0,
  };

  let recipeId = id;

  if (recipeId) {
    // Update existing
    const { error: updateError } = await supabase
      .from('recipes')
      .update(recipeInsertData)
      .eq('id', recipeId)
      .eq('user_id', userId); // For safety

    if (updateError) throw new Error(`Error al actualizar receta: ${updateError.message}`);

    // Delete existing ingredients
    const { error: deleteIngError } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', recipeId);
      
    if (deleteIngError) throw new Error(`Error al actualizar ingredientes: ${deleteIngError.message}`);
  } else {
    // Insert new
    const { data: newRecipe, error: insertError } = await supabase
      .from('recipes')
      .insert(recipeInsertData)
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        throw new Error('Ya existe una receta con ese nombre. Elegí otro nombre o editá la receta existente.');
      }
      throw new Error(`Error al crear receta: ${insertError.message}`);
    }
    recipeId = newRecipe.id;
  }

  // Insert ingredients
  if (recipeDraft.ingredients.length > 0) {
    const ingredientsToInsert = recipeDraft.ingredients.map(ing => {
      let quantityUsed = ing.quantityUsed;
      let unit = ing.unit;

      if (unit === 'kg') {
        quantityUsed *= 1000;
        unit = 'g';
      } else if (unit === 'l') {
        quantityUsed *= 1000;
        unit = 'ml';
      }

      const isSubproduct = ing.componentType === 'subproduct';

      return {
        recipe_id: recipeId,
        ingredient_id: isSubproduct ? null : ing.baseIngredientId,
        ingredient_name: isSubproduct ? (ing.subproductRecipeName ?? ing.ingredientName) : ing.ingredientName,
        quantity_used: quantityUsed,
        unit,
        cost: ing.cost,
        component_type: isSubproduct ? 'subproduct' : 'ingredient',
        subproduct_recipe_id: isSubproduct ? ing.subproductRecipeId : null,
        subproduct_recipe_name: isSubproduct ? (ing.subproductRecipeName ?? null) : null,
      };
    });

    const { error: insertIngError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientsToInsert);

    if (insertIngError) throw new Error(`Error al guardar ingredientes de receta: ${insertIngError.message}`);
  }

  // Return the complete recipe
  return {
    ...recipeDraft,
    id: recipeId as string,
  };
}

export async function deleteRecipe(id: string): Promise<void> {
  const supabase = createClient();
  
  // The DB cascade will handle recipe_ingredients
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error al eliminar receta: ${error.message}`);
}
