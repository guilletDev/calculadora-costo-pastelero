// Motor puro de recálculo de costos: ingredientes → recetas (y sub-recetas)
// → productos. No conoce Supabase ni toca `orders`; solo transforma filas en
// memoria. La persistencia la hace la capa que lo invoque.

import type {
  IngredientRow,
  ProductRecipeRow,
  ProductRow,
  RecipeIngredientRow,
  RecipeRow,
} from './database.types';
import type {
  ProductRowWithComponents,
  RecipeRowWithIngredients,
} from './db-mappers';
import type { Unit } from './types';
import {
  calculateProductComponentCost,
  calculateProductCosts,
  calculateRecipeCosts,
  safeNumber,
} from './cost';

export type CostRecalcTrigger =
  | { trigger: 'ingredient'; ingredientId: string }
  | { trigger: 'recipe'; recipeId: string }
  | { trigger: 'hourly_rate' }
  | { trigger: 'all' };

export interface CostRecalcInput {
  trigger: CostRecalcTrigger;
  recipes: readonly RecipeRowWithIngredients[];
  products: readonly ProductRowWithComponents[];
  ingredients: readonly IngredientRow[];
  hourlyRate: number | null | undefined;
}

export interface CostRecalcCounts {
  recipeIngredients: number;
  recipes: number;
  productComponents: number;
  products: number;
}

export interface CostRecalcResult {
  changedRecipeIngredientRows: RecipeIngredientRow[];
  changedRecipes: RecipeRow[];
  changedProductRecipeRows: ProductRecipeRow[];
  changedProducts: ProductRow[];
  updatedCounts: CostRecalcCounts;
  warnings: string[];
}

interface RecipeMetrics {
  totalCost: number;
  costPerUnit: number;
}

const COST_EPSILON = 1e-9;

function approximatelyEqual(a: number, b: number): boolean {
  return Math.abs(safeNumber(a) - safeNumber(b)) <= COST_EPSILON;
}

export interface RecipeDependencyIngredient {
  componentType?: 'ingredient' | 'subproduct';
  subproductRecipeId?: string | null;
}

/**
 * Acepta tanto filas de DB (snake_case, usadas por el motor) como recetas del
 * frontend (camelCase, usadas por los builders) para reutilizar la misma
 * detección de ancestros en ambos lados.
 */
export type RecipeDependencySource =
  | RecipeRowWithIngredients
  | { id: string; ingredients: readonly RecipeDependencyIngredient[] };

function getSubproductRecipeIds(recipe: RecipeDependencySource): string[] {
  if ('recipe_ingredients' in recipe) {
    return (recipe.recipe_ingredients ?? []).flatMap(row =>
      row.component_type === 'subproduct' && row.subproduct_recipe_id
        ? [row.subproduct_recipe_id]
        : []
    );
  }

  return (recipe.ingredients ?? []).flatMap(row =>
    row.componentType === 'subproduct' && row.subproductRecipeId
      ? [row.subproductRecipeId]
      : []
  );
}

/** Mapa inverso: id de receta → recetas que la usan como subproducto. */
function buildSubproductUsers(
  recipes: readonly RecipeDependencySource[]
): Map<string, Set<string>> {
  const usersBySubproduct = new Map<string, Set<string>>();

  for (const recipe of recipes) {
    for (const subproductId of getSubproductRecipeIds(recipe)) {
      let users = usersBySubproduct.get(subproductId);
      if (!users) {
        users = new Set<string>();
        usersBySubproduct.set(subproductId, users);
      }
      users.add(recipe.id);
    }
  }

  return usersBySubproduct;
}

/**
 * Recetas que contienen a `targetId` como subproducto, directa o
 * transitivamente. En ciclos termina igual y nunca incluye al propio target.
 */
function collectAncestorIds(
  usersBySubproduct: Map<string, Set<string>>,
  targetIds: Iterable<string>
): Set<string> {
  const ancestors = new Set<string>();
  const visited = new Set<string>();
  const queue: string[] = [];

  for (const id of targetIds) {
    if (visited.has(id)) continue;
    visited.add(id);
    queue.push(id);
  }

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    const users = usersBySubproduct.get(current);
    if (!users) continue;

    for (const user of users) {
      if (visited.has(user)) continue;
      visited.add(user);
      ancestors.add(user);
      queue.push(user);
    }
  }

  return ancestors;
}

/** API pública para la UI: bloquea ancestros al elegir una sub-receta. */
export function getRecipeAncestorIds(
  recipes: readonly RecipeDependencySource[],
  targetId: string
): Set<string> {
  return collectAncestorIds(buildSubproductUsers(recipes), [targetId]);
}

function collectAffectedRecipeIds(
  trigger: CostRecalcTrigger,
  recipes: readonly RecipeRowWithIngredients[],
  usersBySubproduct: Map<string, Set<string>>
): Set<string> {
  if (trigger.trigger === 'all' || trigger.trigger === 'hourly_rate') {
    return new Set(recipes.map(recipe => recipe.id));
  }

  const seeds = new Set<string>();

  if (trigger.trigger === 'ingredient') {
    for (const recipe of recipes) {
      for (const row of recipe.recipe_ingredients ?? []) {
        if (row.component_type === 'subproduct') continue;
        if (row.ingredient_id === trigger.ingredientId) {
          seeds.add(recipe.id);
        }
      }
    }
  } else {
    seeds.add(trigger.recipeId);
  }

  const affected = collectAncestorIds(usersBySubproduct, seeds);
  for (const seed of seeds) affected.add(seed);
  return affected;
}

function collectAffectedProductIds(
  trigger: CostRecalcTrigger,
  products: readonly ProductRowWithComponents[],
  affectedRecipeIds: Set<string>
): Set<string> {
  if (trigger.trigger === 'all') {
    return new Set(products.map(product => product.id));
  }

  const affected = new Set<string>();

  for (const product of products) {
    for (const row of product.product_recipes ?? []) {
      const isRecipeRow = row.component_type === 'recipe';
      const affectedByRecipe =
        isRecipeRow && row.recipe_id != null && affectedRecipeIds.has(row.recipe_id);
      const affectedByIngredient =
        trigger.trigger === 'ingredient' &&
        !isRecipeRow &&
        row.ingredient_id === trigger.ingredientId;

      if (affectedByRecipe || affectedByIngredient) {
        affected.add(product.id);
        break;
      }
    }
  }

  return affected;
}

function stripRecipeIngredients(recipe: RecipeRowWithIngredients): RecipeRow {
  return {
    id: recipe.id,
    user_id: recipe.user_id,
    name: recipe.name,
    description: recipe.description,
    yield_portions: recipe.yield_portions,
    yield_grams: recipe.yield_grams,
    sale_type: recipe.sale_type,
    extra_costs: recipe.extra_costs,
    profit_margin: recipe.profit_margin,
    total_cost: recipe.total_cost,
    cost_per_unit: recipe.cost_per_unit,
    labor_minutes: recipe.labor_minutes,
    created_at: recipe.created_at,
    updated_at: recipe.updated_at,
  };
}

function stripProductComponents(product: ProductRowWithComponents): ProductRow {
  return {
    id: product.id,
    user_id: product.user_id,
    name: product.name,
    description: product.description,
    profit_margin: product.profit_margin,
    extra_costs: product.extra_costs,
    total_cost: product.total_cost,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

/**
 * Recalcula en memoria los costos afectados por un disparador y devuelve solo
 * las filas que realmente cambiaron. Los pedidos (`orders`) no se leen ni se
 * escriben: son snapshots históricos.
 */
export function recalculateCosts(input: CostRecalcInput): CostRecalcResult {
  const warnings: string[] = [];
  const recipes = input.recipes ?? [];
  const products = input.products ?? [];
  const ingredients = input.ingredients ?? [];
  const hourlyRate = safeNumber(input.hourlyRate);

  const ingredientById = new Map(ingredients.map(ingredient => [ingredient.id, ingredient]));
  const recipeById = new Map(recipes.map(recipe => [recipe.id, recipe]));
  const usersBySubproduct = buildSubproductUsers(recipes);
  const affectedRecipeIds = collectAffectedRecipeIds(
    input.trigger,
    recipes,
    usersBySubproduct
  );
  const affectedProductIds = collectAffectedProductIds(
    input.trigger,
    products,
    affectedRecipeIds
  );

  const changedRecipeIngredientRows: RecipeIngredientRow[] = [];
  const changedRecipes: RecipeRow[] = [];
  const changedProductRecipeRows: ProductRecipeRow[] = [];
  const changedProducts: ProductRow[] = [];

  const metricsById = new Map<string, RecipeMetrics>();
  const visiting = new Set<string>();
  const warnedCycleEdges = new Set<string>();

  const addCycleWarning = (
    from: RecipeRowWithIngredients,
    to: RecipeRowWithIngredients
  ) => {
    const key = `${from.id}->${to.id}`;
    if (warnedCycleEdges.has(key)) return;
    warnedCycleEdges.add(key);
    warnings.push(
      `Ciclo entre recetas: "${from.name}" y "${to.name}". ` +
        `Se usó el costo guardado de "${to.name}" como fallback para cortar la dependencia.`
    );
  };

  const applyRecipeRowCost = (
    row: RecipeIngredientRow,
    newCost: number
  ): RecipeIngredientRow => {
    if (approximatelyEqual(row.cost, newCost)) return row;

    const updated = { ...row, cost: newCost };
    changedRecipeIngredientRows.push(updated);
    return updated;
  };

  const computeRecipe = (recipe: RecipeRowWithIngredients): RecipeMetrics => {
    const cached = metricsById.get(recipe.id);
    if (cached) return cached;

    // Defensivo: nunca debería llegarse acá con la misma receta en la pila.
    if (visiting.has(recipe.id)) {
      return {
        totalCost: safeNumber(recipe.total_cost),
        costPerUnit: safeNumber(recipe.cost_per_unit),
      };
    }

    visiting.add(recipe.id);

    const computedRows = (recipe.recipe_ingredients ?? []).map(row => {
      let newCost: number;

      if (row.component_type === 'subproduct') {
        const subproductId = row.subproduct_recipe_id;
        const subproduct = subproductId ? recipeById.get(subproductId) : undefined;
        let subproductTotal: number | undefined;

        if (subproduct) {
          if (visiting.has(subproduct.id)) {
            // Corte de ciclo: el snapshot guardado es el único valor estable.
            addCycleWarning(recipe, subproduct);
            subproductTotal = safeNumber(subproduct.total_cost);
          } else if (affectedRecipeIds.has(subproduct.id)) {
            subproductTotal = computeRecipe(subproduct).totalCost;
          } else {
            // No está afectada por este trigger: se usa su total persistido.
            subproductTotal = safeNumber(subproduct.total_cost);
          }
        }

        newCost = calculateProductComponentCost({
          componentType: 'recipe',
          quantityUsed: row.quantity_used,
          unit: row.unit as Unit,
          useUnit: 'gram',
          recipeTotalCost: subproductTotal,
          recipeYieldGrams: subproduct?.yield_grams,
          fallbackCost: row.cost,
        });
      } else {
        const ingredient = row.ingredient_id
          ? ingredientById.get(row.ingredient_id)
          : undefined;

        newCost = calculateProductComponentCost({
          componentType: 'ingredient',
          quantityUsed: row.quantity_used,
          unit: row.unit as Unit,
          ingredientPricePerUnit: ingredient?.price_per_unit,
          fallbackCost: row.cost,
        });
      }

      return applyRecipeRowCost(row, newCost);
    });

    const costs = calculateRecipeCosts({
      ingredients: computedRows.map(row => ({ cost: row.cost })),
      laborMinutes: recipe.labor_minutes,
      hourlyRate,
      extraCosts: recipe.extra_costs,
      profitMargin: recipe.profit_margin,
      yieldPortions: recipe.yield_portions,
      yieldGrams: recipe.yield_grams,
    });

    visiting.delete(recipe.id);

    const metrics: RecipeMetrics = {
      totalCost: costs.totalCost,
      costPerUnit: costs.costPerUnit,
    };
    metricsById.set(recipe.id, metrics);

    if (
      !approximatelyEqual(recipe.total_cost, metrics.totalCost) ||
      !approximatelyEqual(recipe.cost_per_unit, metrics.costPerUnit)
    ) {
      changedRecipes.push({
        ...stripRecipeIngredients(recipe),
        total_cost: metrics.totalCost,
        cost_per_unit: metrics.costPerUnit,
      });
    }

    return metrics;
  };

  for (const recipe of recipes) {
    if (affectedRecipeIds.has(recipe.id)) computeRecipe(recipe);
  }

  const recipeTotalForProduct = (
    recipeId: string | null | undefined
  ): number | undefined => {
    if (!recipeId) return undefined;

    const computed = metricsById.get(recipeId);
    if (computed) return computed.totalCost;

    const recipe = recipeById.get(recipeId);
    return recipe ? safeNumber(recipe.total_cost) : undefined;
  };

  for (const product of products) {
    if (!affectedProductIds.has(product.id)) continue;

    const computedComponents = (product.product_recipes ?? []).map(row => {
      let newCost: number;

      if (row.component_type === 'ingredient') {
        const ingredient = row.ingredient_id
          ? ingredientById.get(row.ingredient_id)
          : undefined;

        newCost = calculateProductComponentCost({
          componentType: 'ingredient',
          quantityUsed: row.quantity_used,
          unit: row.unit as Unit,
          ingredientPricePerUnit: ingredient?.price_per_unit,
          fallbackCost: row.cost,
        });
      } else {
        const recipe = row.recipe_id ? recipeById.get(row.recipe_id) : undefined;
        const useUnit = row.use_unit === 'gram' ? 'gram' : 'portion';

        newCost = calculateProductComponentCost({
          componentType: 'recipe',
          quantityUsed: row.quantity_used,
          unit: row.unit as Unit,
          useUnit,
          recipeTotalCost: recipe ? recipeTotalForProduct(recipe.id) : undefined,
          recipeYieldPortions: recipe?.yield_portions,
          recipeYieldGrams: recipe?.yield_grams,
          fallbackCost: row.cost,
        });
      }

      if (approximatelyEqual(row.cost, newCost)) return row;

      const updated = { ...row, cost: newCost };
      changedProductRecipeRows.push(updated);
      return updated;
    });

    const costs = calculateProductCosts({
      components: computedComponents.map(row => ({ cost: row.cost })),
      extraCosts: product.extra_costs,
      profitMargin: product.profit_margin,
    });

    if (!approximatelyEqual(product.total_cost, costs.totalCost)) {
      changedProducts.push({
        ...stripProductComponents(product),
        total_cost: costs.totalCost,
      });
    }
  }

  return {
    changedRecipeIngredientRows,
    changedRecipes,
    changedProductRecipeRows,
    changedProducts,
    updatedCounts: {
      recipeIngredients: changedRecipeIngredientRows.length,
      recipes: changedRecipes.length,
      productComponents: changedProductRecipeRows.length,
      products: changedProducts.length,
    },
    warnings,
  };
}
