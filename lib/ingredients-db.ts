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

  if (error) throw new Error(`Error al eliminar ingrediente: ${error.message}`);
}

// Upsert atómico en la base de datos: si ya existe un ingrediente con
// el mismo nombre (insensible a mayúsculas) suma cantidad y precio;
// si no, inserta. Lo resuelve el RPC public.upsert_ingredient (migración 010),
// por lo que no depende del estado local del cliente ni hay race conditions.
// El RPC devuelve RETURNS SETOF public.ingredients (fila completa, incluye
// user_id/created_at/updated_at de más): el mapeo rowToIngredient solo lee
// los campos que necesita, por eso la respuesta se puede castear directo.
export async function upsertIngredient(
  ingredient: Omit<BaseIngredient, 'id'>
): Promise<BaseIngredient> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('upsert_ingredient', {
    p_name: ingredient.name,
    p_purchased_quantity: ingredient.purchasedQuantity,
    p_unit: ingredient.unit,
    p_total_price: ingredient.totalPrice,
  });

  if (error) {
    console.error('[upsertIngredient]', error);
    throw new Error(`Error al guardar ingrediente: ${error.message} (${error.code})`);
  }

  const row = (Array.isArray(data) ? data[0] : data) as IngredientRow | undefined;
  if (!row) throw new Error('Error al guardar ingrediente: no se recibió respuesta');
  return rowToIngredient(row);
}
