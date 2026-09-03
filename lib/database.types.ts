// Tipos que representan las filas de Supabase (snake_case)
// Se usan internamente en las funciones de DB

export interface IngredientRow {
  id: string;
  user_id: string;
  name: string;
  purchased_quantity: number;
  unit: string;
  total_price: number;
  price_per_unit: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  units_produced: number;
  sale_type: string;
  extra_costs: Record<string, number>;
  profit_margin: number;
  total_cost: number;
  cost_per_unit: number;
  output_quantity: number | null;
  output_unit: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredientRow {
  id: string;
  recipe_id: string;
  ingredient_id: string | null;
  ingredient_name: string;
  quantity_used: number;
  unit: string;
  cost: number;
}

export interface ProductRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  profit_margin: number;
  extra_costs: Record<string, number>;
  total_cost: number;
  created_at: string;
  updated_at: string;
}

export interface ProductRecipeRow {
  id: string;
  product_id: string;
  component_type: string;
  recipe_id: string | null;
  recipe_name: string | null;
  ingredient_id: string | null;
  ingredient_name: string | null;
  quantity_used: number;
  unit: string;
  cost: number;
}

export interface ProfileRow {
  id: string;
  plan_type: string;
  pro_valid_until: string | null;
  created_at: string;
  updated_at: string;
}

// Tipos para INSERT (sin id ni timestamps)
export type IngredientInsert = Omit<IngredientRow, 'id' | 'created_at' | 'updated_at'>;
export type IngredientUpdate = Partial<Omit<IngredientRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
