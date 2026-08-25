import { createClient } from '@/utils/supabase/client';
import { Product, ProductRecipe, Unit, ExtraCosts } from './types';
import { ProductRow, ProductRecipeRow } from './database.types';

// Convertir DB Row a Frontend Type
function rowToProduct(
  row: ProductRow,
  recipeRows: ProductRecipeRow[]
): Product {
  return {
    id: row.id,
    name: row.name,
    profitMargin: row.profit_margin,
    extraCosts: row.extra_costs as ExtraCosts,
    totalCost: row.total_cost,
    recipes: recipeRows.map(recipeRow => ({
      id: recipeRow.id,
      recipeId: recipeRow.recipe_id,
      recipeName: recipeRow.recipe_name,
      quantityUsed: recipeRow.quantity_used,
      unit: recipeRow.unit as Unit,
      cost: recipeRow.cost,
    })),
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const supabase = createClient();

  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (productsError) throw new Error(`Error al cargar productos: ${productsError.message}`);

  if (!productsData || productsData.length === 0) return [];

  const productIds = productsData.map(p => p.id);

  const { data: recipesData, error: recipesError } = await supabase
    .from('product_recipes')
    .select('*')
    .in('product_id', productIds);

  if (recipesError) throw new Error(`Error al cargar recetas de productos: ${recipesError.message}`);

  const recipesByProduct = (recipesData || []).reduce((acc, curr) => {
    if (!acc[curr.product_id]) acc[curr.product_id] = [];
    acc[curr.product_id].push(curr);
    return acc;
  }, {} as Record<string, ProductRecipeRow[]>);

  return (productsData as ProductRow[]).map(row =>
    rowToProduct(row, recipesByProduct[row.id] || [])
  );
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const supabase = createClient();

  const { data: productData, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (productError) {
    if (productError.code === 'PGRST116') return null; // No results
    throw new Error(`Error al cargar producto: ${productError.message}`);
  }

  const { data: recipesData, error: recipesError } = await supabase
    .from('product_recipes')
    .select('*')
    .eq('product_id', id);

  if (recipesError) throw new Error(`Error al cargar recetas de producto: ${recipesError.message}`);

  return rowToProduct(productData as ProductRow, recipesData as ProductRecipeRow[]);
}

export async function upsertProduct(productDraft: Omit<Product, 'id'>, id?: string): Promise<Product> {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Usuario no autenticado');
  const userId = userData.user.id;

  const productInsertData = {
    user_id: userId,
    name: productDraft.name,
    profit_margin: productDraft.profitMargin || 0,
    extra_costs: productDraft.extraCosts,
    total_cost: productDraft.totalCost,
  };

  let productId = id;

  if (productId) {
    // Update existing
    const { error: updateError } = await supabase
      .from('products')
      .update(productInsertData)
      .eq('id', productId)
      .eq('user_id', userId); // For safety

    if (updateError) throw new Error(`Error al actualizar producto: ${updateError.message}`);

    // Delete existing product recipes
    const { error: deleteRecError } = await supabase
      .from('product_recipes')
      .delete()
      .eq('product_id', productId);

    if (deleteRecError) throw new Error(`Error al actualizar recetas del producto: ${deleteRecError.message}`);
  } else {
    // Insert new
    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert(productInsertData)
      .select('id')
      .single();

    if (insertError) throw new Error(`Error al crear producto: ${insertError.message}`);
    productId = newProduct.id;
  }

  // Insert product recipes
  if (productDraft.recipes.length > 0) {
    const recipesToInsert = productDraft.recipes.map(recipe => {
      let quantityUsed = recipe.quantityUsed;
      let unit = recipe.unit;

      if (unit === 'kg') {
        quantityUsed *= 1000;
        unit = 'g';
      } else if (unit === 'l') {
        quantityUsed *= 1000;
        unit = 'ml';
      }

      return {
        product_id: productId,
        recipe_id: recipe.recipeId,
        recipe_name: recipe.recipeName,
        quantity_used: quantityUsed,
        unit,
        cost: recipe.cost,
      };
    });

    const { error: insertRecError } = await supabase
      .from('product_recipes')
      .insert(recipesToInsert);

    if (insertRecError) throw new Error(`Error al guardar recetas del producto: ${insertRecError.message}`);
  }

  // Return the complete product
  return {
    ...productDraft,
    id: productId as string,
  };
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient();

  // The DB cascade will handle product_recipes
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error al eliminar producto: ${error.message}`);
}