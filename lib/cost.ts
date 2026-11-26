import { Unit } from './types';
import { toBaseQuantity } from './units';

// ── Utilidades numéricas ──
// Todo cálculo de costos pasa por acá para blindar contra NaN/Infinity,
// strings vacíos, null/undefined y divisores <= 0.

export type CostValue = string | number | null | undefined;

/** Valor numérico tolerante a strings, null/undefined, NaN e Infinity. */
export function safeNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

// ── Sumas base ──

export function sumIngredientCosts(
  ingredients: ReadonlyArray<{ cost: CostValue }> | null | undefined
): number {
  if (!ingredients) return 0;
  return ingredients.reduce((sum, ing) => sum + safeNumber(ing?.cost), 0);
}

/**
 * Suma extra_costs. Acepta el JSONB de la DB (Record<string, value>) o las
 * filas del builder ({ value }), preservando la suma fila por fila.
 */
export function sumExtraCosts(
  extraCosts:
    | Record<string, CostValue>
    | ReadonlyArray<{ value: CostValue }>
    | null
    | undefined
): number {
  if (!extraCosts) return 0;

  const values: CostValue[] = Array.isArray(extraCosts)
    ? extraCosts.map(row => row.value)
    : Object.values(extraCosts as Record<string, CostValue>);

  return values.reduce<number>((sum, value) => sum + safeNumber(value), 0);
}

export function calculateTotalCost(ingredientsCost: number, extraCostsTotal: number): number {
  return safeNumber(ingredientsCost) + safeNumber(extraCostsTotal);
}

export function applyMargin(cost: CostValue, marginPercent: CostValue): number {
  return safeNumber(cost) * (1 + safeNumber(marginPercent) / 100);
}

export function calculateCostPerUnit(totalWithProfit: number, unitsProduced: number): number {
  const units = safeNumber(unitsProduced);
  return units > 0 ? safeNumber(totalWithProfit) / units : 0;
}

export function calculateRawCostPerUnit(totalCost: number, unitsProduced: number): number {
  const units = safeNumber(unitsProduced);
  return units > 0 ? safeNumber(totalCost) / units : 0;
}

export function calculateIngredientCost(
  pricePerUnit: number | null | undefined,
  quantityUsed: number,
  unit: Unit,
  existingCost?: number
): number {
  if (pricePerUnit == null) return safeNumber(existingCost);
  const cost = safeNumber(pricePerUnit) * toBaseQuantity(safeNumber(quantityUsed), unit);
  return Number.isFinite(cost) ? cost : safeNumber(existingCost);
}

// ── Recetas ──

export interface RecipeTotalsInput {
  ingredients: { cost: CostValue }[];
  extraCosts: Record<string, CostValue>;
  profitMargin: string;
  unitsProduced: string;
}

/** Cálculo legacy (sin mano de obra) que se conserva por compatibilidad. */
export function calculateRecipeTotals(input: RecipeTotalsInput) {
  const ingredientsCost = sumIngredientCosts(input.ingredients);
  const extraCostsTotal = sumExtraCosts(input.extraCosts);
  const totalCost = calculateTotalCost(ingredientsCost, extraCostsTotal);
  const margin = safeNumber(input.profitMargin);
  const totalWithProfit = applyMargin(totalCost, margin);
  const units = safeNumber(input.unitsProduced);
  const costPerUnit = calculateCostPerUnit(totalWithProfit, units);
  return { ingredientsCost, extraCostsTotal, totalCost, totalWithProfit, costPerUnit };
}

export interface RecipeCostInput {
  ingredients: ReadonlyArray<{ cost: CostValue }>;
  laborMinutes: CostValue;
  hourlyRate: CostValue;
  extraCosts:
    | Record<string, CostValue>
    | ReadonlyArray<{ value: CostValue }>
    | null
    | undefined;
  profitMargin: CostValue;
  yieldPortions: number | null | undefined;
  yieldGrams: number | null | undefined;
}

export interface RecipeCosts {
  componentsCost: number;
  laborCost: number;
  extraCostsTotal: number;
  /** Costo neto: componentes + mano de obra + extra_costs. */
  totalCost: number;
  /** Costo neto sin extra_costs: componentes + mano de obra. */
  baseCost: number;
  /** totalCost con margen aplicado (sin dividir por rendimiento). */
  salePriceTotal: number;
  /** Precio de venta por porción o, si no hay porciones, por gramo. 0 sin rendimiento. */
  costPerUnit: number;
}

/** Fórmula canónica de una receta (builder y servidor). */
export function calculateRecipeCosts(input: RecipeCostInput): RecipeCosts {
  const componentsCost = sumIngredientCosts(input.ingredients);
  const laborCost = (safeNumber(input.laborMinutes) / 60) * safeNumber(input.hourlyRate);
  const extraCostsTotal = sumExtraCosts(input.extraCosts);
  const totalCost = componentsCost + laborCost + extraCostsTotal;
  const salePriceTotal = applyMargin(totalCost, input.profitMargin);

  return {
    componentsCost,
    laborCost,
    extraCostsTotal,
    totalCost,
    baseCost: componentsCost + laborCost,
    salePriceTotal,
    costPerUnit: calculateRecipeUnitPrice(
      totalCost,
      input.profitMargin,
      input.yieldPortions,
      input.yieldGrams
    ),
  };
}

/**
 * Precio de venta por porción o, si la receta no tiene porciones, por gramo.
 * Devuelve 0 si no hay rendimiento válido (nunca Infinity/NaN).
 */
export function calculateRecipeUnitPrice(
  totalCost: number,
  marginPercent: CostValue,
  yieldPortions: number | null | undefined,
  yieldGrams: number | null | undefined
): number {
  const saleTotal = applyMargin(totalCost, marginPercent);
  const portions = safeNumber(yieldPortions);
  if (portions > 0) return saleTotal / portions;

  const grams = safeNumber(yieldGrams);
  if (grams > 0) return saleTotal / grams;

  return 0;
}

// ── Productos ──

export interface ProductComponentCostInput {
  componentType: 'recipe' | 'ingredient';
  quantityUsed: CostValue;
  unit?: Unit | null;
  useUnit?: 'portion' | 'gram' | null;
  ingredientPricePerUnit?: number | null;
  recipeTotalCost?: number | null;
  recipeYieldPortions?: number | null;
  recipeYieldGrams?: number | null;
  /** Costo a conservar si falta la referencia o el divisor no es válido. */
  fallbackCost?: number;
}

/**
 * Costo de un componente de producto. Si la referencia ya no existe o el
 * rendimiento no permite dividir, conserva el snapshot (fallbackCost).
 */
export function calculateProductComponentCost(input: ProductComponentCostInput): number {
  const fallback = safeNumber(input.fallbackCost);
  const qty = safeNumber(input.quantityUsed);

  if (input.componentType === 'ingredient') {
    if (input.ingredientPricePerUnit == null) return fallback;
    const cost = safeNumber(input.ingredientPricePerUnit) * toBaseQuantity(qty, input.unit ?? 'g');
    return Number.isFinite(cost) ? cost : fallback;
  }

  if (input.recipeTotalCost == null) return fallback;
  const total = safeNumber(input.recipeTotalCost);

  if (input.useUnit === 'gram') {
    const grams = safeNumber(input.recipeYieldGrams);
    if (grams <= 0) return fallback;
    const gramsUsed = input.unit ? toBaseQuantity(qty, input.unit) : qty;
    const cost = proportionalCost(total, grams, gramsUsed);
    return Number.isFinite(cost) ? cost : fallback;
  }

  const portions = safeNumber(input.recipeYieldPortions);
  if (portions <= 0) return fallback;
  const cost = proportionalCost(total, portions, qty);
  return Number.isFinite(cost) ? cost : fallback;
}

export interface ProductCostInput {
  components: ReadonlyArray<{ cost: CostValue }>;
  extraCosts:
    | Record<string, CostValue>
    | ReadonlyArray<{ value: CostValue }>
    | null
    | undefined;
  profitMargin: CostValue;
}

export interface ProductCosts {
  componentsCost: number;
  extraCostsTotal: number;
  totalCost: number;
  salePrice: number;
}

/** Fórmula canónica de un producto (builder y servidor). */
export function calculateProductCosts(input: ProductCostInput): ProductCosts {
  const componentsCost = sumIngredientCosts(input.components);
  const extraCostsTotal = sumExtraCosts(input.extraCosts);
  const totalCost = calculateTotalCost(componentsCost, extraCostsTotal);

  return {
    componentsCost,
    extraCostsTotal,
    totalCost,
    salePrice: calculateSalePrice(totalCost, safeNumber(input.profitMargin)),
  };
}

// ── Costos unitarios / proporcionales ──

export function costPerPortion(totalCost: number, portions: number): number {
  const count = safeNumber(portions);
  if (count <= 0) return 0;
  return safeNumber(totalCost) / count;
}

export function costPerGram(totalCost: number, grams: number): number {
  const weight = safeNumber(grams);
  if (weight <= 0) return 0;
  return safeNumber(totalCost) / weight;
}

export function proportionalCost(totalCost: number, yieldQty: number, usedQuantity: number): number {
  const total = safeNumber(totalCost);
  const yieldSafe = safeNumber(yieldQty);
  const used = safeNumber(usedQuantity);
  if (yieldSafe <= 0) return 0;
  const result = (total / yieldSafe) * used;
  return Number.isFinite(result) ? result : 0;
}

export function calculateSalePrice(totalCost: number, marginPercent: CostValue): number {
  return applyMargin(totalCost, marginPercent);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
    safeNumber(amount)
  );
}
