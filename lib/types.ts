export type Unit = 'kg' | 'g' | 'l' | 'ml' | 'unidad';

export interface BaseIngredient {
  id: string;
  name: string;
  purchasedQuantity: number;
  unit: Unit;
  totalPrice: number;
  pricePerUnit: number;
}

export interface RecipeIngredient {
  id: string;
  baseIngredientId: string;
  quantityUsed: number;
  unit: Unit;
  cost: number;
}

export interface ExtraCosts {
  packaging: number;
  bags: number;
  labels: number;
  shipping: number;
  others: number;
}

export type SaleType = 'unidad' | 'docena' | 'media-docena';

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  extraCosts: ExtraCosts;
  unitsProduced: number;
  saleType: SaleType;
  totalCost: number;
  costPerUnit: number;
}
