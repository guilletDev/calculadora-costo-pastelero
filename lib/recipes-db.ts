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
    unitsProduced: row.units_produced,
    saleType: row.sale_type as SaleType,
    extraCosts: row.extra_costs as ExtraCosts,
    profitMargin: row.profit_margin,
    totalCost: row.total_cost,
    costPerUnit: row.cost_per_unit,
    ingredients: ingredientRows.map(ingRow => ({
      id: ingRow.id,
      baseIngredientId: ingRow.ingredient_id,
      quantityUsed: ingRow.quantity_used,
      unit: ingRow.unit as Unit,
      cost: ingRow.cost,
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
    units_produced: recipeDraft.unitsProduced,
    sale_type: recipeDraft.saleType,
    extra_costs: recipeDraft.extraCosts,
    profit_margin: recipeDraft.profitMargin || 0,
    total_cost: recipeDraft.totalCost,
    cost_per_unit: recipeDraft.costPerUnit,
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

    if (insertError) throw new Error(`Error al crear receta: ${insertError.message}`);
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

      return {
        recipe_id: recipeId,
        ingredient_id: ing.baseIngredientId,
        quantity_used: quantityUsed,
        unit,
        cost: ing.cost,
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
