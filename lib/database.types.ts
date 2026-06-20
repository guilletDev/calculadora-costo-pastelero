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
  units_produced: number;
  sale_type: string;
  extra_costs: {
    packaging: number;
    bags: number;
    labels: number;
    shipping: number;
    others: number;
  };
  profit_margin: number;
  total_cost: number;
  cost_per_unit: number;
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

// Tipos para INSERT (sin id ni timestamps)
export type IngredientInsert = Omit<IngredientRow, 'id' | 'created_at' | 'updated_at'>;
export type IngredientUpdate = Partial<Omit<IngredientRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
