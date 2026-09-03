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
  baseIngredientId: string | null;
  ingredientName: string;
  quantityUsed: number;
  unit: Unit;
  cost: number;
}

export type ExtraCosts = Record<string, number>;

export const EXTRA_COST_LABELS: Record<string, string> = {
  packaging: 'Packaging / Cajas',
  bags: 'Bolsas / Stickers',
  shipping: 'Envío / Logística',
  labels: 'Etiquetas',
  labor: 'Mano de obra',
  others: 'Otros',
};

export interface AdditionalCost {
  key: string;
  label: string;
  value: string;
  isCustom: boolean;
}

export type SaleType = 'unidad' | 'docena' | 'media-docena';

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  extraCosts: ExtraCosts;
  unitsProduced: number;
  saleType: SaleType;
  totalCost: number;
  costPerUnit: number;
  profitMargin?: number;
  outputQuantity: number | null;
  outputUnit: Unit | null;
}

export type ComponentType = 'recipe' | 'ingredient';

export interface ProductComponent {
  id: string;
  componentType: ComponentType;
  recipeId: string | null;
  recipeName: string | null;
  ingredientId: string | null;
  ingredientName: string | null;
  quantityUsed: number;
  unit: Unit;
  cost: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  components: ProductComponent[];
  extraCosts: ExtraCosts;
  profitMargin: number;
  totalCost: number;
}
