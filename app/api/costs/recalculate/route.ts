import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type {
  IngredientRow,
  ProductRecipeRow,
  ProductRow,
  RecipeIngredientRow,
  RecipeRow,
} from '@/lib/database.types';
import {
  rowToProduct,
  rowToRecipe,
  type ProductRowWithComponents,
  type RecipeRowWithIngredients,
} from '@/lib/db-mappers';
import {
  recalculateCosts,
  type CostRecalcTrigger,
} from '@/lib/cost-recalc';

export const runtime = 'nodejs';

type TriggerName = 'ingredient' | 'recipe' | 'hourly_rate' | 'all';

const CHUNK_SIZE = 100;

function isTriggerName(value: unknown): value is TriggerName {
  return (
    value === 'ingredient' ||
    value === 'recipe' ||
    value === 'hourly_rate' ||
    value === 'all'
  );
}

interface RecalcBody {
  trigger?: unknown;
  id?: unknown;
}

/**
 * Recalcula costos en cascada y persiste solo las filas modificadas.
 * Los pedidos (`orders`) son snapshots históricos: este endpoint no los lee
 * ni los escribe.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let body: RecalcBody;

  try {
    const parsed: unknown = await request.json();

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud debe ser un objeto JSON' },
        { status: 400 }
      );
    }

    body = parsed as RecalcBody;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!isTriggerName(body.trigger)) {
    return NextResponse.json(
      {
        error:
          'Trigger inválido. Usá "ingredient", "recipe", "hourly_rate" o "all"',
      },
      { status: 400 }
    );
  }

  const trigger = body.trigger;
  const needsId = trigger === 'ingredient' || trigger === 'recipe';

  if (needsId && (typeof body.id !== 'string' || body.id.trim().length === 0)) {
    return NextResponse.json(
      { error: `El trigger "${trigger}" requiere un id` },
      { status: 400 }
    );
  }

  const targetId =
    typeof body.id === 'string' && body.id.trim().length > 0
      ? body.id.trim()
      : undefined;

  const engineTrigger: CostRecalcTrigger =
    trigger === 'ingredient'
      ? { trigger: 'ingredient', ingredientId: targetId! }
      : trigger === 'recipe'
        ? { trigger: 'recipe', recipeId: targetId! }
        : trigger === 'hourly_rate'
          ? { trigger: 'hourly_rate' }
          : { trigger: 'all' };

  try {
    // Consultas en paralelo, siempre filtradas por el usuario autenticado.
    // Los ingredientes soft-deleted se incluyen: las recetas pueden referenciarlos.
    // Las tablas junction no tienen created_at; el orden created_at DESC se
    // aplica a las recetas/productos, que es el orden que consume la UI.
    const [ingredientsResult, recipesResult, productsResult, profileResult] =
      await Promise.all([
        supabase
          .from('ingredients')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('recipes')
          .select('*, recipe_ingredients!recipe_ingredients_recipe_id_fkey(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('*, product_recipes(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('hourly_rate')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

    if (ingredientsResult.error) {
      console.error(
        '[costs/recalculate] Error consultando ingredientes:',
        ingredientsResult.error
      );
      return NextResponse.json(
        { error: 'No se pudieron cargar los ingredientes' },
        { status: 500 }
      );
    }

    if (recipesResult.error) {
      console.error(
        '[costs/recalculate] Error consultando recetas:',
        recipesResult.error
      );
      return NextResponse.json(
        { error: 'No se pudieron cargar las recetas' },
        { status: 500 }
      );
    }

    if (productsResult.error) {
      console.error(
        '[costs/recalculate] Error consultando productos:',
        productsResult.error
      );
      return NextResponse.json(
        { error: 'No se pudieron cargar los productos' },
        { status: 500 }
      );
    }

    if (profileResult.error) {
      console.error(
        '[costs/recalculate] Error consultando el perfil:',
        profileResult.error
      );
      return NextResponse.json(
        { error: 'No se pudo cargar el valor hora del perfil' },
        { status: 500 }
      );
    }

    const ingredients = (ingredientsResult.data ?? []) as IngredientRow[];
    const recipes = (recipesResult.data ??
      []) as unknown as RecipeRowWithIngredients[];
    const products = (productsResult.data ??
      []) as unknown as ProductRowWithComponents[];
    const hourlyRate = profileResult.data?.hourly_rate ?? 0;

    const result = recalculateCosts({
      trigger: engineTrigger,
      recipes,
      products,
      ingredients,
      hourlyRate,
    });

    const upsertInChunks = async (
      table: string,
      rows: ReadonlyArray<object>,
      label: string
    ): Promise<void> => {
      for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
        const chunk = rows.slice(index, index + CHUNK_SIZE);
        const { error } = await supabase
          .from(table)
          .upsert(chunk, { onConflict: 'id' });

        if (error) {
          console.error(
            `[costs/recalculate] Error actualizando ${label}:`,
            error
          );
          throw new Error(`No se pudieron actualizar ${label}`);
        }
      }
    };

    // Orden de dependencias: primero filas hijas, luego recetas/productos.
    await upsertInChunks(
      'recipe_ingredients',
      result.changedRecipeIngredientRows as RecipeIngredientRow[],
      'los ingredientes de las recetas'
    );
    await upsertInChunks(
      'recipes',
      result.changedRecipes as RecipeRow[],
      'las recetas'
    );
    await upsertInChunks(
      'product_recipes',
      result.changedProductRecipeRows as ProductRecipeRow[],
      'los componentes de los productos'
    );
    await upsertInChunks(
      'products',
      result.changedProducts as ProductRow[],
      'los productos'
    );

    const hasChanges =
      result.changedRecipeIngredientRows.length > 0 ||
      result.changedRecipes.length > 0 ||
      result.changedProductRecipeRows.length > 0 ||
      result.changedProducts.length > 0;

    let finalRecipes = recipes;
    let finalProducts = products;

    // Releer después de escribir para devolver los valores autoritativos de la
    // DB, conservando el orden created_at DESC que usa la UI.
    if (hasChanges) {
      const [updatedRecipesResult, updatedProductsResult] = await Promise.all([
        supabase
          .from('recipes')
          .select('*, recipe_ingredients!recipe_ingredients_recipe_id_fkey(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('*, product_recipes(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (updatedRecipesResult.error) {
        console.error(
          '[costs/recalculate] Error releyendo recetas:',
          updatedRecipesResult.error
        );
        return NextResponse.json(
          { error: 'Se guardaron los costos, pero no se pudieron releer las recetas' },
          { status: 500 }
        );
      }

      if (updatedProductsResult.error) {
        console.error(
          '[costs/recalculate] Error releyendo productos:',
          updatedProductsResult.error
        );
        return NextResponse.json(
          { error: 'Se guardaron los costos, pero no se pudieron releer los productos' },
          { status: 500 }
        );
      }

      finalRecipes = (updatedRecipesResult.data ??
        []) as unknown as RecipeRowWithIngredients[];
      finalProducts = (updatedProductsResult.data ??
        []) as unknown as ProductRowWithComponents[];
    }

    return NextResponse.json({
      recipes: finalRecipes.map(rowToRecipe),
      products: finalProducts.map(rowToProduct),
      updated: result.updatedCounts,
      warnings: result.warnings,
    });
  } catch (error) {
    console.error('[costs/recalculate] Error inesperado:', error);
    const message =
      error instanceof Error && error.message.startsWith('No se pudieron')
        ? error.message
        : 'Error inesperado al recalcular los costos';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
