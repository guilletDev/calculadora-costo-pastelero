// Verificación local del motor puro de recálculo (sin Supabase).
//
// Ejecutar (compilando a CommonJS en un directorio temporal):
//   npx tsc scripts/cost-recalc.test.ts --outDir <tmp> --rootDir . --module commonjs --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck
//   node <tmp>/scripts/cost-recalc.test.js

import assert from 'node:assert/strict';
import {
  getRecipeAncestorIds,
  recalculateCosts,
} from '../lib/cost-recalc';
import type {
  IngredientRow,
  ProductRecipeRow,
  ProductRow,
  RecipeIngredientRow,
  RecipeRow,
} from '../lib/database.types';
import type {
  ProductRowWithComponents,
  RecipeRowWithIngredients,
} from '../lib/db-mappers';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const CREATED_AT = '2026-01-01T00:00:00.000Z';

function approx(actual: number, expected: number, label: string): void {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) < 1e-9,
    `${label}: esperado ${expected}, recibido ${actual}`
  );
}

function makeIngredient(
  overrides: Partial<IngredientRow> &
    Pick<IngredientRow, 'id' | 'price_per_unit' | 'unit'>
): IngredientRow {
  return {
    user_id: USER_ID,
    name: overrides.id,
    purchased_quantity: 1000,
    total_price: 0,
    deleted_at: null,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...overrides,
  };
}

type RecipeOverrides = Partial<Omit<RecipeRow, 'id'>> & {
  id: string;
  recipe_ingredients?: RecipeIngredientRow[];
};

function makeRecipe(overrides: RecipeOverrides): RecipeRowWithIngredients {
  const { recipe_ingredients, ...rowOverrides } = overrides;

  return {
    user_id: USER_ID,
    name: overrides.id,
    description: null,
    yield_portions: null,
    yield_grams: null,
    sale_type: 'unidad',
    extra_costs: {},
    profit_margin: 0,
    total_cost: 0,
    cost_per_unit: 0,
    labor_minutes: 0,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...rowOverrides,
    recipe_ingredients: recipe_ingredients ?? [],
  };
}

type RecipeIngredientOverrides = Partial<RecipeIngredientRow> & {
  id: string;
  recipe_id: string;
};

function makeRecipeIngredient(
  overrides: RecipeIngredientOverrides
): RecipeIngredientRow {
  return {
    ingredient_id: null,
    ingredient_name: overrides.id,
    quantity_used: 1,
    unit: 'g',
    cost: 0,
    component_type: 'ingredient',
    subproduct_recipe_id: null,
    subproduct_recipe_name: null,
    ...overrides,
  };
}

type ProductOverrides = Partial<Omit<ProductRow, 'id'>> & {
  id: string;
  product_recipes?: ProductRecipeRow[];
};

function makeProduct(overrides: ProductOverrides): ProductRowWithComponents {
  const { product_recipes, ...rowOverrides } = overrides;

  return {
    user_id: USER_ID,
    name: overrides.id,
    description: '',
    profit_margin: 0,
    extra_costs: {},
    total_cost: 0,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...rowOverrides,
    product_recipes: product_recipes ?? [],
  };
}

type ProductComponentOverrides = Partial<ProductRecipeRow> & {
  id: string;
  product_id: string;
};

function makeProductComponent(
  overrides: ProductComponentOverrides
): ProductRecipeRow {
  return {
    component_type: 'ingredient',
    recipe_id: null,
    recipe_name: null,
    ingredient_id: null,
    ingredient_name: null,
    quantity_used: 1,
    unit: 'g',
    cost: 0,
    use_unit: null,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// a) Cascada completa: ingrediente → receta → sub-receta → producto
//    (producto medido en porciones y en gramos)
// ─────────────────────────────────────────────────────────────
function testFullCascade(): void {
  const harinaBefore = makeIngredient({
    id: 'ing-harina',
    name: 'Harina',
    price_per_unit: 0.01,
    unit: 'g',
  });
  const harinaAfter: IngredientRow = { ...harinaBefore, price_per_unit: 0.02 };

  const base = makeRecipe({
    id: 'r-base',
    name: 'Base',
    yield_portions: 10,
    yield_grams: 500,
    profit_margin: 20,
    total_cost: 1,
    cost_per_unit: 0.12,
    recipe_ingredients: [
      makeRecipeIngredient({
        id: 'ri-base-harina',
        recipe_id: 'r-base',
        ingredient_id: 'ing-harina',
        ingredient_name: 'Harina',
        quantity_used: 100,
        unit: 'g',
        cost: 1,
      }),
    ],
  });

  const relleno = makeRecipe({
    id: 'r-relleno',
    name: 'Relleno',
    yield_portions: 20,
    yield_grams: 1000,
    total_cost: 0.5,
    cost_per_unit: 0.025,
    recipe_ingredients: [
      makeRecipeIngredient({
        id: 'ri-relleno-base',
        recipe_id: 'r-relleno',
        ingredient_name: 'Base',
        quantity_used: 250,
        unit: 'g',
        cost: 0.5,
        component_type: 'subproduct',
        subproduct_recipe_id: 'r-base',
        subproduct_recipe_name: 'Base',
      }),
    ],
  });

  const productPortion = makeProduct({
    id: 'p-portion',
    name: 'Producto por porción',
    total_cost: 0.05,
    product_recipes: [
      makeProductComponent({
        id: 'pc-portion',
        product_id: 'p-portion',
        component_type: 'recipe',
        recipe_id: 'r-relleno',
        recipe_name: 'Relleno',
        quantity_used: 2,
        unit: null,
        cost: 0.05,
        use_unit: 'portion',
      }),
    ],
  });

  const productGram = makeProduct({
    id: 'p-gram',
    name: 'Producto por gramos',
    total_cost: 0.125,
    product_recipes: [
      makeProductComponent({
        id: 'pc-gram',
        product_id: 'p-gram',
        component_type: 'recipe',
        recipe_id: 'r-relleno',
        recipe_name: 'Relleno',
        quantity_used: 250,
        unit: null,
        cost: 0.125,
        use_unit: 'gram',
      }),
    ],
  });

  const result = recalculateCosts({
    trigger: { trigger: 'ingredient', ingredientId: 'ing-harina' },
    recipes: [base, relleno],
    products: [productPortion, productGram],
    ingredients: [harinaAfter],
    hourlyRate: 0,
  });

  assert.equal(result.updatedCounts.recipeIngredients, 2);
  assert.equal(result.updatedCounts.recipes, 2);
  assert.equal(result.updatedCounts.productComponents, 2);
  assert.equal(result.updatedCounts.products, 2);
  assert.equal(result.warnings.length, 0);

  const baseRow = result.changedRecipeIngredientRows.find(
    row => row.id === 'ri-base-harina'
  );
  const rellenoRow = result.changedRecipeIngredientRows.find(
    row => row.id === 'ri-relleno-base'
  );
  assert.ok(baseRow, 'Debe cambiar el costo de la harina en la receta base');
  assert.ok(rellenoRow, 'Debe cambiar el costo de la sub-receta en el relleno');
  approx(baseRow.cost, 2, 'harina 100 g a 0.02/g');
  approx(rellenoRow.cost, 1, 'sub-receta 250 g de 500 g');

  const baseResult = result.changedRecipes.find(recipe => recipe.id === 'r-base');
  const rellenoResult = result.changedRecipes.find(
    recipe => recipe.id === 'r-relleno'
  );
  assert.ok(baseResult, 'Debe actualizarse la receta base');
  assert.ok(rellenoResult, 'Debe actualizarse la receta que usa la base');
  approx(baseResult.total_cost, 2, 'total receta base');
  approx(baseResult.cost_per_unit, 0.24, 'venta por porción receta base');
  approx(rellenoResult.total_cost, 1, 'total receta relleno');
  approx(rellenoResult.cost_per_unit, 0.05, 'venta por porción relleno');

  const portionComponent = result.changedProductRecipeRows.find(
    row => row.id === 'pc-portion'
  );
  const gramComponent = result.changedProductRecipeRows.find(
    row => row.id === 'pc-gram'
  );
  assert.ok(portionComponent, 'Debe cambiar el componente por porciones');
  assert.ok(gramComponent, 'Debe cambiar el componente por gramos');
  approx(portionComponent.cost, 0.1, 'componente 2 porciones');
  approx(gramComponent.cost, 0.25, 'componente 250 g');

  const portionProduct = result.changedProducts.find(
    product => product.id === 'p-portion'
  );
  const gramProduct = result.changedProducts.find(
    product => product.id === 'p-gram'
  );
  assert.ok(portionProduct, 'Debe actualizarse el producto por porciones');
  assert.ok(gramProduct, 'Debe actualizarse el producto por gramos');
  approx(portionProduct.total_cost, 0.1, 'total producto por porciones');
  approx(gramProduct.total_cost, 0.25, 'total producto por gramos');

  console.log('✔ a) cascada ingrediente → receta → sub-receta → producto');
}

// ─────────────────────────────────────────────────────────────
// b) Cambio de hourly_rate: solo recetas con mano de obra y sus productos
// ─────────────────────────────────────────────────────────────
function testHourlyRate(): void {
  const azucar = makeIngredient({
    id: 'ing-azucar',
    name: 'Azúcar',
    price_per_unit: 1,
    unit: 'g',
  });

  const laborRecipe = makeRecipe({
    id: 'r-labor',
    name: 'Con mano de obra',
    yield_portions: 10,
    total_cost: 100,
    cost_per_unit: 10,
    labor_minutes: 60,
    recipe_ingredients: [
      makeRecipeIngredient({
        id: 'ri-labor',
        recipe_id: 'r-labor',
        ingredient_id: 'ing-azucar',
        ingredient_name: 'Azúcar',
        quantity_used: 100,
        unit: 'g',
        cost: 100,
      }),
    ],
  });

  const staticRecipe = makeRecipe({
    id: 'r-static',
    name: 'Sin mano de obra',
    yield_portions: 5,
    total_cost: 50,
    cost_per_unit: 10,
    recipe_ingredients: [
      makeRecipeIngredient({
        id: 'ri-static',
        recipe_id: 'r-static',
        ingredient_id: 'ing-azucar',
        ingredient_name: 'Azúcar',
        quantity_used: 50,
        unit: 'g',
        cost: 50,
      }),
    ],
  });

  const laborProduct = makeProduct({
    id: 'p-labor',
    total_cost: 10,
    product_recipes: [
      makeProductComponent({
        id: 'pc-labor',
        product_id: 'p-labor',
        component_type: 'recipe',
        recipe_id: 'r-labor',
        quantity_used: 1,
        unit: null,
        cost: 10,
        use_unit: 'portion',
      }),
    ],
  });

  const staticProduct = makeProduct({
    id: 'p-static',
    total_cost: 10,
    product_recipes: [
      makeProductComponent({
        id: 'pc-static',
        product_id: 'p-static',
        component_type: 'recipe',
        recipe_id: 'r-static',
        quantity_used: 1,
        unit: null,
        cost: 10,
        use_unit: 'portion',
      }),
    ],
  });

  const result = recalculateCosts({
    trigger: { trigger: 'hourly_rate' },
    recipes: [laborRecipe, staticRecipe],
    products: [laborProduct, staticProduct],
    ingredients: [azucar],
    hourlyRate: 1000,
  });

  assert.equal(result.updatedCounts.recipeIngredients, 0);
  assert.equal(result.updatedCounts.recipes, 1);
  assert.equal(result.updatedCounts.productComponents, 1);
  assert.equal(result.updatedCounts.products, 1);

  const updatedRecipe = result.changedRecipes.find(
    recipe => recipe.id === 'r-labor'
  );
  assert.ok(updatedRecipe, 'Debe actualizarse la receta con mano de obra');
  approx(updatedRecipe.total_cost, 1100, 'total con 1 hora a 1000/h');
  approx(updatedRecipe.cost_per_unit, 110, 'venta por porción con mano de obra');

  const updatedComponent = result.changedProductRecipeRows.find(
    row => row.id === 'pc-labor'
  );
  assert.ok(updatedComponent, 'Debe actualizarse el componente del producto');
  approx(updatedComponent.cost, 110, 'componente 1 porción');

  const updatedProduct = result.changedProducts.find(
    product => product.id === 'p-labor'
  );
  assert.ok(updatedProduct, 'Debe actualizarse el producto');
  approx(updatedProduct.total_cost, 110, 'total producto');

  assert.equal(
    result.changedRecipes.some(recipe => recipe.id === 'r-static'),
    false,
    'La receta sin mano de obra no debe cambiar'
  );
  assert.equal(
    result.changedProducts.some(product => product.id === 'p-static'),
    false,
    'El producto sin mano de obra no debe cambiar'
  );

  console.log('✔ b) hourly_rate afecta mano de obra y productos dependientes');
}

// ─────────────────────────────────────────────────────────────
// c) trigger "all": sanea datos viejos y es idempotente
// ─────────────────────────────────────────────────────────────
function testRecalculateAll(): void {
  const ingredient = makeIngredient({
    id: 'ing-i1',
    name: 'Insumo',
    price_per_unit: 2.5,
    unit: 'g',
  });

  const r1 = makeRecipe({
    id: 'all-r1',
    name: 'Base desactualizada',
    yield_portions: 2,
    yield_grams: 100,
    total_cost: 0,
    cost_per_unit: 0,
    recipe_ingredients: [
      makeRecipeIngredient({
        id: 'all-ri1',
        recipe_id: 'all-r1',
        ingredient_id: 'ing-i1',
        ingredient_name: 'Insumo',
        quantity_used: 10,
        unit: 'g',
        cost: 0,
      }),
    ],
  });

  const r2 = makeRecipe({
    id: 'all-r2',
    name: 'Sub-receta desactualizada',
    yield_portions: 4,
    yield_grams: 100,
    total_cost: 0,
    cost_per_unit: 0,
    recipe_ingredients: [
      makeRecipeIngredient({
        id: 'all-ri2',
        recipe_id: 'all-r2',
        ingredient_name: 'Base desactualizada',
        quantity_used: 5,
        unit: 'g',
        cost: 0,
        component_type: 'subproduct',
        subproduct_recipe_id: 'all-r1',
        subproduct_recipe_name: 'Base desactualizada',
      }),
    ],
  });

  const directProduct = makeProduct({
    id: 'all-p-direct',
    total_cost: 0,
    product_recipes: [
      makeProductComponent({
        id: 'all-pc-direct',
        product_id: 'all-p-direct',
        component_type: 'ingredient',
        ingredient_id: 'ing-i1',
        ingredient_name: 'Insumo',
        quantity_used: 3,
        unit: 'g',
        cost: 0,
      }),
    ],
  });

  const recipeProduct = makeProduct({
    id: 'all-p-recipe',
    total_cost: 0,
    product_recipes: [
      makeProductComponent({
        id: 'all-pc-recipe',
        product_id: 'all-p-recipe',
        component_type: 'recipe',
        recipe_id: 'all-r2',
        recipe_name: 'Sub-receta desactualizada',
        quantity_used: 10,
        unit: null,
        cost: 0,
        use_unit: 'gram',
      }),
    ],
  });

  const recipes = [r1, r2];
  const products = [directProduct, recipeProduct];

  const result = recalculateCosts({
    trigger: { trigger: 'all' },
    recipes,
    products,
    ingredients: [ingredient],
    hourlyRate: 0,
  });

  assert.equal(result.updatedCounts.recipeIngredients, 2);
  assert.equal(result.updatedCounts.recipes, 2);
  assert.equal(result.updatedCounts.productComponents, 2);
  assert.equal(result.updatedCounts.products, 2);
  assert.equal(result.warnings.length, 0);

  const r1Result = result.changedRecipes.find(recipe => recipe.id === 'all-r1');
  const r2Result = result.changedRecipes.find(recipe => recipe.id === 'all-r2');
  assert.ok(r1Result && r2Result);
  approx(r1Result.total_cost, 25, 'total base saneada');
  approx(r1Result.cost_per_unit, 12.5, 'porción base saneada');
  approx(r2Result.total_cost, 1.25, 'total sub-receta saneada');
  approx(r2Result.cost_per_unit, 0.3125, 'porción sub-receta saneada');

  const directComponent = result.changedProductRecipeRows.find(
    row => row.id === 'all-pc-direct'
  );
  const recipeComponent = result.changedProductRecipeRows.find(
    row => row.id === 'all-pc-recipe'
  );
  assert.ok(directComponent && recipeComponent);
  approx(directComponent.cost, 7.5, 'componente directo de insumo');
  approx(recipeComponent.cost, 0.125, 'componente de sub-receta');

  // Simula persistir los cambios y vuelve a correr "all": debe ser idempotente.
  const recipesAfter = recipes.map(recipe => {
    const changedRecipe = result.changedRecipes.find(row => row.id === recipe.id);
    const rows = (recipe.recipe_ingredients ?? []).map(
      row =>
        result.changedRecipeIngredientRows.find(changed => changed.id === row.id) ??
        row
    );
    return {
      ...recipe,
      ...(changedRecipe ?? {}),
      recipe_ingredients: rows,
    };
  });

  const productsAfter = products.map(product => {
    const changedProduct = result.changedProducts.find(
      row => row.id === product.id
    );
    const rows = (product.product_recipes ?? []).map(
      row =>
        result.changedProductRecipeRows.find(changed => changed.id === row.id) ??
        row
    );
    return {
      ...product,
      ...(changedProduct ?? {}),
      product_recipes: rows,
    };
  });

  const secondRun = recalculateCosts({
    trigger: { trigger: 'all' },
    recipes: recipesAfter,
    products: productsAfter,
    ingredients: [ingredient],
    hourlyRate: 0,
  });

  assert.deepEqual(secondRun.updatedCounts, {
    recipeIngredients: 0,
    recipes: 0,
    productComponents: 0,
    products: 0,
  });
  assert.equal(secondRun.warnings.length, 0);

  console.log('✔ c) trigger "all" sanea datos viejos y es idempotente');
}

// ─────────────────────────────────────────────────────────────
// d) Ciclo entre dos recetas: sin bucle infinito ni NaN
// ─────────────────────────────────────────────────────────────
function testCycle(): void {
  const r1 = makeRecipe({
    id: 'cycle-r1',
    name: 'Ciclo R1',
    yield_grams: 100,
    total_cost: 100,
    cost_per_unit: 0,
    recipe_ingredients: [
      makeRecipeIngredient({
        id: 'cycle-ri1',
        recipe_id: 'cycle-r1',
        ingredient_name: 'Ciclo R2',
        quantity_used: 10,
        unit: 'g',
        cost: 10,
        component_type: 'subproduct',
        subproduct_recipe_id: 'cycle-r2',
        subproduct_recipe_name: 'Ciclo R2',
      }),
    ],
  });

  const r2 = makeRecipe({
    id: 'cycle-r2',
    name: 'Ciclo R2',
    yield_grams: 100,
    total_cost: 100,
    cost_per_unit: 0,
    recipe_ingredients: [
      makeRecipeIngredient({
        id: 'cycle-ri2',
        recipe_id: 'cycle-r2',
        ingredient_name: 'Ciclo R1',
        quantity_used: 10,
        unit: 'g',
        cost: 10,
        component_type: 'subproduct',
        subproduct_recipe_id: 'cycle-r1',
        subproduct_recipe_name: 'Ciclo R1',
      }),
    ],
  });

  const result = recalculateCosts({
    trigger: { trigger: 'all' },
    recipes: [r1, r2],
    products: [],
    ingredients: [],
    hourlyRate: 0,
  });

  assert.ok(result.warnings.length >= 1, 'Debe registrar un warning de ciclo');
  assert.match(result.warnings.join(' '), /Ciclo entre recetas/);

  const numbers = [
    ...result.changedRecipeIngredientRows.map(row => row.cost),
    ...result.changedRecipes.flatMap(recipe => [
      recipe.total_cost,
      recipe.cost_per_unit,
    ]),
  ];
  for (const value of numbers) {
    assert.ok(Number.isFinite(value), `Valor no finito en ciclo: ${value}`);
  }

  const ancestors = getRecipeAncestorIds([r1, r2], 'cycle-r1');
  assert.equal(ancestors.has('cycle-r2'), true);
  assert.equal(ancestors.has('cycle-r1'), false);

  console.log('✔ d) ciclo R1 ↔ R2 cortado con warning, sin NaN ni bucle');
}

// ─────────────────────────────────────────────────────────────
// e) Yields 0/null y referencias eliminadas → fallback al snapshot
// ─────────────────────────────────────────────────────────────
function testFallbacks(): void {
  const presentIngredient = makeIngredient({
    id: 'ing-present',
    name: 'Presente',
    price_per_unit: 1,
    unit: 'g',
  });

  const missingIngredientRecipe = makeRecipe({
    id: 'fallback-missing-ingredient',
    name: 'Ingrediente eliminado',
    yield_portions: 3,
    total_cost: 7.5,
    cost_per_unit: 2.5,
    recipe_ingredients: [
      makeRecipeIngredient({
        id: 'fallback-ri-missing-ingredient',
        recipe_id: 'fallback-missing-ingredient',
        ingredient_id: 'ghost-ingredient',
        ingredient_name: 'Eliminado',
        quantity_used: 10,
        unit: 'g',
        cost: 7.5,
      }),
    ],
  });

  const missingSubproductRecipe = makeRecipe({
    id: 'fallback-missing-subrecipe',
    name: 'Sub-receta eliminada',
    yield_portions: 2,
    yield_grams: 100,
    total_cost: 9,
    cost_per_unit: 4.5,
    recipe_ingredients: [
      makeRecipeIngredient({
        id: 'fallback-ri-missing-subrecipe',
        recipe_id: 'fallback-missing-subrecipe',
        ingredient_name: 'Receta eliminada',
        quantity_used: 10,
        unit: 'g',
        cost: 9,
        component_type: 'subproduct',
        subproduct_recipe_id: 'ghost-recipe',
        subproduct_recipe_name: 'Receta eliminada',
      }),
    ],
  });

  const zeroYieldRecipe = makeRecipe({
    id: 'fallback-zero-yield',
    name: 'Rendimiento cero',
    yield_portions: 0,
    yield_grams: 0,
    total_cost: 10,
    cost_per_unit: 0,
    recipe_ingredients: [
      makeRecipeIngredient({
        id: 'fallback-ri-zero-yield',
        recipe_id: 'fallback-zero-yield',
        ingredient_id: 'ing-present',
        ingredient_name: 'Presente',
        quantity_used: 10,
        unit: 'g',
        cost: 10,
      }),
    ],
  });

  const nullYieldRecipe = makeRecipe({
    id: 'fallback-null-yield',
    name: 'Sin rendimiento',
    yield_portions: null,
    yield_grams: null,
    total_cost: 10,
    cost_per_unit: 0,
    recipe_ingredients: [
      makeRecipeIngredient({
        id: 'fallback-ri-null-yield',
        recipe_id: 'fallback-null-yield',
        ingredient_id: 'ing-present',
        ingredient_name: 'Presente',
        quantity_used: 10,
        unit: 'g',
        cost: 10,
      }),
    ],
  });

  const zeroYieldProduct = makeProduct({
    id: 'fallback-p-zero-yield',
    total_cost: 4,
    product_recipes: [
      makeProductComponent({
        id: 'fallback-pc-zero-yield',
        product_id: 'fallback-p-zero-yield',
        component_type: 'recipe',
        recipe_id: 'fallback-zero-yield',
        recipe_name: 'Rendimiento cero',
        quantity_used: 5,
        unit: null,
        cost: 4,
        use_unit: 'gram',
      }),
    ],
  });

  const nullYieldProduct = makeProduct({
    id: 'fallback-p-null-yield',
    total_cost: 2,
    product_recipes: [
      makeProductComponent({
        id: 'fallback-pc-null-yield',
        product_id: 'fallback-p-null-yield',
        component_type: 'recipe',
        recipe_id: 'fallback-null-yield',
        recipe_name: 'Sin rendimiento',
        quantity_used: 1,
        unit: null,
        cost: 2,
        use_unit: 'portion',
      }),
    ],
  });

  const missingRecipeProduct = makeProduct({
    id: 'fallback-p-missing-recipe',
    total_cost: 3.5,
    product_recipes: [
      makeProductComponent({
        id: 'fallback-pc-missing-recipe',
        product_id: 'fallback-p-missing-recipe',
        component_type: 'recipe',
        recipe_id: 'ghost-recipe',
        recipe_name: 'Receta eliminada',
        quantity_used: 1,
        unit: null,
        cost: 3.5,
        use_unit: 'portion',
      }),
    ],
  });

  const result = recalculateCosts({
    trigger: { trigger: 'all' },
    recipes: [
      missingIngredientRecipe,
      missingSubproductRecipe,
      zeroYieldRecipe,
      nullYieldRecipe,
    ],
    products: [zeroYieldProduct, nullYieldProduct, missingRecipeProduct],
    ingredients: [presentIngredient],
    hourlyRate: 0,
  });

  assert.deepEqual(result.updatedCounts, {
    recipeIngredients: 0,
    recipes: 0,
    productComponents: 0,
    products: 0,
  });
  assert.equal(result.warnings.length, 0);

  // Los snapshots quedaron intactos y jamás se produjo NaN/Infinity.
  for (const row of [
    ...(missingIngredientRecipe.recipe_ingredients ?? []),
    ...(missingSubproductRecipe.recipe_ingredients ?? []),
    ...(zeroYieldRecipe.recipe_ingredients ?? []),
    ...(nullYieldRecipe.recipe_ingredients ?? []),
  ]) {
    assert.ok(Number.isFinite(row.cost));
  }

  console.log('✔ e) yields 0/null y referencias eliminadas usan fallback');
}

// ─────────────────────────────────────────────────────────────
// getRecipeAncestorIds en cadena (para el filtro de la UI)
// ─────────────────────────────────────────────────────────────
function testAncestors(): void {
  const a = makeRecipe({ id: 'anc-a', name: 'A' });
  const b = makeRecipe({
    id: 'anc-b',
    name: 'B',
    recipe_ingredients: [
      makeRecipeIngredient({
        id: 'anc-ri-b',
        recipe_id: 'anc-b',
        component_type: 'subproduct',
        subproduct_recipe_id: 'anc-a',
        quantity_used: 10,
        unit: 'g',
      }),
    ],
  });
  const c = makeRecipe({
    id: 'anc-c',
    name: 'C',
    recipe_ingredients: [
      makeRecipeIngredient({
        id: 'anc-ri-c',
        recipe_id: 'anc-c',
        component_type: 'subproduct',
        subproduct_recipe_id: 'anc-b',
        quantity_used: 10,
        unit: 'g',
      }),
    ],
  });

  assert.deepEqual([...getRecipeAncestorIds([a, b, c], 'anc-a')], [
    'anc-b',
    'anc-c',
  ]);
  assert.deepEqual([...getRecipeAncestorIds([a, b, c], 'anc-b')], ['anc-c']);
  assert.deepEqual([...getRecipeAncestorIds([a, b, c], 'anc-c')], []);

  // La UI usa el tipo camelCase del frontend (Recipe), no las filas de DB.
  const clientRecipes = [
    { id: 'client-a', ingredients: [] },
    {
      id: 'client-b',
      ingredients: [
        { componentType: 'subproduct' as const, subproductRecipeId: 'client-a' },
      ],
    },
    {
      id: 'client-c',
      ingredients: [
        { componentType: 'subproduct' as const, subproductRecipeId: 'client-b' },
      ],
    },
  ];

  assert.deepEqual([...getRecipeAncestorIds(clientRecipes, 'client-a')], [
    'client-b',
    'client-c',
  ]);

  console.log('✔ getRecipeAncestorIds recorre sub-recetas en cadena (DB y UI)');
}

testFullCascade();
testHourlyRate();
testRecalculateAll();
testCycle();
testFallbacks();
testAncestors();

console.log('\nOK: todos los casos del motor de recálculo pasaron');
