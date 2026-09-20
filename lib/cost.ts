import { Unit } from './types';
import { toBaseQuantity } from './units';

export function sumIngredientCosts(ingredients: { cost: number }[]): number {
  return (ingredients || []).reduce((sum, ing) => sum + ing.cost, 0);
}

export function sumExtraCosts(extraCosts: object): number {
  if (!extraCosts) return 0;
  let total = 0;
  for (const value of Object.values(extraCosts)) {
    total += parseFloat(String(value)) || 0;
  }
  return total;
}

export function calculateTotalCost(ingredientsCost: number, extraCostsTotal: number): number {
  return ingredientsCost + extraCostsTotal;
}

export function applyMargin(cost: number, marginPercent: number): number {
  return cost * (1 + marginPercent / 100);
}

export function calculateCostPerUnit(totalWithProfit: number, unitsProduced: number): number {
  return unitsProduced > 0 ? totalWithProfit / unitsProduced : 0;
}

export function calculateRawCostPerUnit(totalCost: number, unitsProduced: number): number {
  return unitsProduced > 0 ? totalCost / unitsProduced : 0;
}

export function calculateIngredientCost(
  pricePerUnit: number | null | undefined,
  quantityUsed: number,
  unit: Unit,
  existingCost?: number
): number {
  if (pricePerUnit == null) return existingCost ?? 0;
  return pricePerUnit * toBaseQuantity(quantityUsed, unit);
}

export interface RecipeTotalsInput {
  ingredients: { cost: number }[];
  extraCosts: Record<string, string | number>;
  profitMargin: string;
  unitsProduced: string;
}

export function calculateRecipeTotals(input: RecipeTotalsInput) {
  const ingredientsCost = sumIngredientCosts(input.ingredients);
  const extraCostsTotal = sumExtraCosts(input.extraCosts);
  const totalCost = calculateTotalCost(ingredientsCost, extraCostsTotal);
  const margin = parseFloat(input.profitMargin) || 0;
  const totalWithProfit = applyMargin(totalCost, margin);
  const units = parseFloat(input.unitsProduced) || 0;
  const costPerUnit = calculateCostPerUnit(totalWithProfit, units);
  return { ingredientsCost, extraCostsTotal, totalCost, totalWithProfit, costPerUnit };
}

export function costPerPortion(totalCost: number, portions: number): number {
  if (!portions || portions <= 0) return 0;
  return totalCost / portions;
}

export function costPerGram(totalCost: number, grams: number): number {
  if (!grams || grams <= 0) return 0;
  return totalCost / grams;
}

export function proportionalCost(totalCost: number, yieldQty: number, usedQuantity: number): number {
  if (!yieldQty || yieldQty <= 0) return 0;
  return (totalCost / yieldQty) * usedQuantity;
}

export function calculateSalePrice(totalCost: number, marginPercent: number): number {
  return applyMargin(totalCost, marginPercent);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}