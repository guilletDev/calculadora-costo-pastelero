import { createClient } from '@/utils/supabase/client';
import { BaseIngredient, Unit } from './types';
import { IngredientRow } from './database.types';

// ── Conversión DB ↔ Frontend ──

function rowToIngredient(row: IngredientRow): BaseIngredient {
  return {
    id: row.id,
    name: row.name,
    purchasedQuantity: Number(row.purchased_quantity),
    unit: row.unit as Unit,
    totalPrice: Number(row.total_price),
    pricePerUnit: Number(row.price_per_unit),
  };
}

// ── CRUD Operations ──

export async function fetchIngredients(): Promise<BaseIngredient[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Error al cargar ingredientes: ${error.message}`);
  return (data as IngredientRow[]).map(rowToIngredient);
}

export async function createIngredient(
  ingredient: Omit<BaseIngredient, 'id'>
): Promise<BaseIngredient> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data, error } = await supabase
    .from('ingredients')
    .insert({
      user_id: user.id,
      name: ingredient.name,
      purchased_quantity: ingredient.purchasedQuantity,
      unit: ingredient.unit,
      total_price: ingredient.totalPrice,
      price_per_unit: ingredient.pricePerUnit,
    })
    .select()
    .single();

  if (error) throw new Error(`Error al crear ingrediente: ${error.message}`);
  return rowToIngredient(data as IngredientRow);
}

export async function updateIngredient(
  id: string,
  updates: Partial<Omit<BaseIngredient, 'id'>>
): Promise<BaseIngredient> {
  const supabase = createClient();

  // Construir objeto de update solo con los campos que vienen
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.purchasedQuantity !== undefined) dbUpdates.purchased_quantity = updates.purchasedQuantity;
  if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
  if (updates.totalPrice !== undefined) dbUpdates.total_price = updates.totalPrice;
  if (updates.pricePerUnit !== undefined) dbUpdates.price_per_unit = updates.pricePerUnit;

  const { data, error } = await supabase
    .from('ingredients')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error al actualizar ingrediente: ${error.message}`);
  return rowToIngredient(data as IngredientRow);
}

export async function deleteIngredient(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('ingredients')
    .delete()
    .eq('id', id);

  if (error) {
    // Si es RESTRICT (ingrediente usado en recetas)
    if (error.code === '23503') {
      throw new Error('Este ingrediente está siendo usado en una o más recetas. Eliminalo de las recetas primero.');
    }
    throw new Error(`Error al eliminar ingrediente: ${error.message}`);
  }
}

export async function upsertIngredient(
  ingredient: Omit<BaseIngredient, 'id'>,
  existingIngredients: BaseIngredient[]
): Promise<{ ingredient: BaseIngredient; isNew: boolean }> {
  const normalizedName = ingredient.name.toLowerCase().trim();
  const existing = existingIngredients.find(
    ing => ing.name.toLowerCase().trim() === normalizedName
  );

  if (existing) {
    // Acumular cantidad y precio
    const newTotalQuantity = existing.purchasedQuantity + ingredient.purchasedQuantity;
    const newTotalPrice = existing.totalPrice + ingredient.totalPrice;
    const newPricePerUnit = newTotalPrice / newTotalQuantity;

    const updated = await updateIngredient(existing.id, {
      purchasedQuantity: newTotalQuantity,
      totalPrice: newTotalPrice,
      pricePerUnit: newPricePerUnit,
    });
    return { ingredient: updated, isNew: false };
  }

  const created = await createIngredient(ingredient);
  return { ingredient: created, isNew: true };
}
