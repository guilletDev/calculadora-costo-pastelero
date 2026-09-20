import { createClient } from '@/utils/supabase/client';
import { Product, ProductComponent, ComponentType, Unit, ExtraCosts } from './types';
import { ProductRow, ProductRecipeRow } from './database.types';

// Convertir DB Row a Frontend Type
function rowToProduct(
  row: ProductRow,
  componentRows: ProductRecipeRow[]
): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    profitMargin: row.profit_margin,
    extraCosts: row.extra_costs as ExtraCosts,
    totalCost: row.total_cost,
    components: componentRows.map(componentRow => ({
      id: componentRow.id,
      componentType: componentRow.component_type as ComponentType,
      recipeId: componentRow.recipe_id,
      recipeName: componentRow.recipe_name,
      ingredientId: componentRow.ingredient_id,
      ingredientName: componentRow.ingredient_name,
      quantityUsed: componentRow.quantity_used,
      unit: componentRow.unit as Unit | null,
      cost: componentRow.cost,
      useUnit: componentRow.use_unit as 'portion' | 'gram' | null,
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

  const { data: componentsData, error: componentsError } = await supabase
    .from('product_recipes')
    .select('*')
    .in('product_id', productIds);

  if (componentsError) throw new Error(`Error al cargar componentes de productos: ${componentsError.message}`);

  const componentsByProduct = (componentsData || []).reduce((acc, curr) => {
    if (!acc[curr.product_id]) acc[curr.product_id] = [];
    acc[curr.product_id].push(curr);
    return acc;
  }, {} as Record<string, ProductRecipeRow[]>);

  return (productsData as ProductRow[]).map(row =>
    rowToProduct(row, componentsByProduct[row.id] || [])
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

  const { data: componentsData, error: componentsError } = await supabase
    .from('product_recipes')
    .select('*')
    .eq('product_id', id);

  if (componentsError) throw new Error(`Error al cargar componentes de producto: ${componentsError.message}`);

  return rowToProduct(productData as ProductRow, componentsData as ProductRecipeRow[]);
}

export async function upsertProduct(productDraft: Omit<Product, 'id'>, id?: string): Promise<Product> {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Usuario no autenticado');
  const userId = userData.user.id;

  const productInsertData = {
    user_id: userId,
    name: productDraft.name,
    description: productDraft.description || '',
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

    // Delete existing product components
    const { error: deleteCompError } = await supabase
      .from('product_recipes')
      .delete()
      .eq('product_id', productId);

    if (deleteCompError) throw new Error(`Error al actualizar componentes del producto: ${deleteCompError.message}`);
  } else {
    // Insert new
    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert(productInsertData)
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        throw new Error('Ya existe un producto con ese nombre. Elegí otro nombre o editá el producto existente.');
      }
      throw new Error(`Error al crear producto: ${insertError.message}`);
    }
    productId = newProduct.id;
  }

  // Insert product components
  if (productDraft.components.length > 0) {
    const componentsToInsert = productDraft.components.map(component => {
      let quantityUsed = component.quantityUsed;
      let unit = component.unit;

      if (unit === 'kg') {
        quantityUsed *= 1000;
        unit = 'g';
      } else if (unit === 'l') {
        quantityUsed *= 1000;
        unit = 'ml';
      }

      const isIngredient = component.componentType === 'ingredient';

      return {
        product_id: productId,
        component_type: isIngredient ? 'ingredient' : 'recipe',
        recipe_id: isIngredient ? null : component.recipeId,
        recipe_name: isIngredient ? null : component.recipeName,
        ingredient_id: isIngredient ? component.ingredientId : null,
        ingredient_name: isIngredient ? component.ingredientName : null,
        quantity_used: quantityUsed,
        unit: isIngredient ? unit : null,
        cost: component.cost,
        use_unit: isIngredient ? null : (component.useUnit ?? 'portion'),
      };
    });

    const { error: insertCompError } = await supabase
      .from('product_recipes')
      .insert(componentsToInsert);

    if (insertCompError) throw new Error(`Error al guardar componentes del producto: ${insertCompError.message}`);
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