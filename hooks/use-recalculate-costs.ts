'use client';

import { useCallback, useRef, useState } from 'react';
import { useAppBoot } from '@/components/boot/app-boot-context';
import type { Product, Recipe } from '@/lib/types';
import type { CostRecalcCounts } from '@/lib/cost-recalc';

export type RecalcTrigger =
  | { trigger: 'ingredient'; id: string }
  | { trigger: 'recipe'; id: string }
  | { trigger: 'hourly_rate' }
  | { trigger: 'all' };

export interface RecalcResponse {
  updated: CostRecalcCounts;
  warnings: string[];
}

const EMPTY_COUNTS: CostRecalcCounts = {
  recipeIngredients: 0,
  recipes: 0,
  productComponents: 0,
  products: 0,
};

function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeCounts(value: unknown): CostRecalcCounts {
  if (typeof value !== 'object' || value === null) return { ...EMPTY_COUNTS };

  const record = value as Record<string, unknown>;

  return {
    recipeIngredients: toCount(record.recipeIngredients),
    recipes: toCount(record.recipes),
    productComponents: toCount(record.productComponents),
    products: toCount(record.products),
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    if (typeof data.error === 'string' && data.error.trim().length > 0) {
      return data.error;
    }
  } catch {
    // Sin body JSON: se usa el mensaje por status.
  }

  return `Error ${response.status} al recalcular los costos`;
}

/**
 * Mensaje breve para el toast de guardado. Prioriza la cantidad de productos
 * afectados; si no hubo productos pero sí recetas, lo indica igual.
 */
export function formatRecalcToast(
  baseMessage: string,
  updated: CostRecalcCounts
): string {
  if (updated.products > 0) {
    const count = updated.products;
    return `${baseMessage} · ${count} ${
      count === 1 ? 'producto actualizado' : 'productos actualizados'
    }`;
  }

  if (updated.recipes > 0) {
    const count = updated.recipes;
    return `${baseMessage} · ${count} ${
      count === 1 ? 'receta actualizada' : 'recetas actualizadas'
    }`;
  }

  if (updated.recipeIngredients > 0) {
    return `${baseMessage} · costos de recetas actualizados`;
  }

  return baseMessage;
}

/**
 * Ejecuta el recálculo en cascada desde el cliente. Si la API falla, intenta
 * refrescar el boot cache para no dejar recetas/productos desfasados y relanza
 * el error para que el componente muestre una advertencia sin revertir el
 * guardado que ya se completó.
 */
export function useRecalculateCosts() {
  const { applyLocal, refresh } = useAppBoot();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const inFlightRef = useRef(0);

  const recalc = useCallback(
    async (trigger: RecalcTrigger): Promise<RecalcResponse> => {
      inFlightRef.current += 1;
      setIsRecalculating(true);

      try {
        const response = await fetch('/api/costs/recalculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(trigger),
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }

        const data = (await response.json()) as {
          recipes?: unknown;
          products?: unknown;
          updated?: unknown;
          warnings?: unknown;
        };

        if (!Array.isArray(data.recipes) || !Array.isArray(data.products)) {
          throw new Error('El servidor devolvió una respuesta inválida');
        }

        const recipes = data.recipes as Recipe[];
        const products = data.products as Product[];
        const updated = normalizeCounts(data.updated);
        const warnings = Array.isArray(data.warnings)
          ? data.warnings.filter(
              (warning): warning is string => typeof warning === 'string'
            )
          : [];

        applyLocal({ recipes, products });

        return { updated, warnings };
      } catch (error) {
        // Respaldo: si el recálculo falló, resincronizamos el cache completo.
        try {
          await refresh();
        } catch {
          // El error original es el que le importa al componente.
        }

        if (error instanceof TypeError) {
          throw new Error(
            'No se pudieron recalcular los costos. Revisá tu conexión e intentá nuevamente.'
          );
        }

        throw error instanceof Error
          ? error
          : new Error('No se pudieron recalcular los costos');
      } finally {
        inFlightRef.current = Math.max(0, inFlightRef.current - 1);
        if (inFlightRef.current === 0) {
          setIsRecalculating(false);
        }
      }
    },
    [applyLocal, refresh]
  );

  return { recalc, isRecalculating };
}
