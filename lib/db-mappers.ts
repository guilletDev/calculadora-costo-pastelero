// Mappers puros DB Row → tipo de frontend.
// Sin imports de Supabase: pueden usarse tanto en cliente como en servidor.

import {
  ComponentType,
  ExtraCosts,
  Product,
  Recipe,
  SaleType,
  Unit,
} from './types';
import {
  ProductRecipeRow,
  ProductRow,
  RecipeIngredientRow,
  RecipeRow,
} from './database.types';

export type RecipeRowWithIngredients = RecipeRow & {
  recipe_ingredients: RecipeIngredientRow[] | null;
};

export type ProductRowWithComponents = ProductRow & {
  product_recipes: ProductRecipeRow[] | null;
};

/** Convierte una fila de recipes (con recipe_ingredients embebido) a Recipe. */
export function rowToRecipe(row: RecipeRowWithIngredients): Recipe {
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
    ingredients: (row.recipe_ingredients ?? []).map(ingRow => ({
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

/** Convierte una fila de products (con product_recipes embebido) a Product. */
export function rowToProduct(row: ProductRowWithComponents): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    profitMargin: row.profit_margin,
    extraCosts: row.extra_costs as ExtraCosts,
    totalCost: row.total_cost,
    components: (row.product_recipes ?? []).map(componentRow => ({
      id: componentRow.id,
      componentType: componentRow.component_type as ComponentType,
      recipeId: componentRow.recipe_id,
      recipeName: componentRow.recipe_name,
      ingredientId: componentRow.ingredient_id,
      ingredientName: componentRow.ingredient_name,
      quantityUsed: componentRow.quantity_used,
      unit: componentRow.unit as Unit | null,
      cost: componentRow.cost,
      useUnit: componentRow.use_unit as 'portion' | 'gram' | null,
    })),
  };
}
