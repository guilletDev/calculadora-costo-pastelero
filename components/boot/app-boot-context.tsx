'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { BaseIngredient, Recipe, Product } from '@/lib/types';
import { fetchIngredients } from '@/lib/ingredients-db';
import { fetchRecipes } from '@/lib/recipes-db';
import { fetchProducts } from '@/lib/products-db';
import { MIN_BOOT_MS, SPLASH_FADE_MS, minDelay } from '@/lib/boot';
import { FullPageLoader } from '@/components/boot/full-page-loader';

interface AppBootData {
  ready: boolean;
  ingredients: BaseIngredient[];
  recipes: Recipe[];
  products: Product[];
}

interface AppBootState extends AppBootData {
  refresh: () => Promise<void>;
  applyLocal: (partial: {
    ingredients?: BaseIngredient[];
    recipes?: Recipe[];
    products?: Product[];
  }) => void;
}

const AppBootContext = createContext<AppBootState | null>(null);

function settled<T>(result: PromiseSettledResult<T[]>, fallback: T[] = []): T[] {
  return result.status === 'fulfilled' ? result.value : fallback;
}

export function AppBootProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppBootData>({
    ready: false,
    ingredients: [],
    recipes: [],
    products: [],
  });
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ingredients, recipes, products] = await Promise.allSettled([
        minDelay(fetchIngredients(), MIN_BOOT_MS),
        minDelay(fetchRecipes(), MIN_BOOT_MS),
        minDelay(fetchProducts(), MIN_BOOT_MS),
      ]);
      if (cancelled) return;

      if (ingredients.status === 'rejected' || recipes.status === 'rejected' || products.status === 'rejected') {
        toast.error('Hubo un problema al cargar los datos. Intentalo de nuevo.');
      }

      setState({
        ready: true,
        ingredients: settled(ingredients),
        recipes: settled(recipes),
        products: settled(products),
      });
      setTimeout(() => setHidden(true), SPLASH_FADE_MS);
    })();
    return () => { cancelled = true; };
  }, []);

  // Re-fetch completo de las tres entidades (para sincronizar tras operaciones
  // o cuando se detecta que la caché quedó desactualizada).
  const refresh = useCallback(async () => {
    const [ingredients, recipes, products] = await Promise.allSettled([
      fetchIngredients(),
      fetchRecipes(),
      fetchProducts(),
    ]);
    setState(prev => ({
      ...prev,
      ready: true,
      ingredients: settled(ingredients),
      recipes: settled(recipes),
      products: settled(products),
    }));
  }, []);

  // Actualiza el caché con datos ya conocidos por el componente que mutó,
  // sin re-fetch. Todas las páginas que leen de useAppBoot() reaccionan al instante.
  const applyLocal = useCallback((partial: {
    ingredients?: BaseIngredient[];
    recipes?: Recipe[];
    products?: Product[];
  }) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    document.body.style.overflow = state.ready ? '' : 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [state.ready]);

  const value = useMemo<AppBootState>(() => ({
    ...state,
    refresh,
    applyLocal,
  }), [state, refresh, applyLocal]);

  return (
    <AppBootContext.Provider value={value}>
      {!hidden && <FullPageLoader exiting={state.ready} />}
      {children}
    </AppBootContext.Provider>
  );
}

export function useAppBoot() {
  const ctx = useContext(AppBootContext);
  if (!ctx) throw new Error('useAppBoot debe usarse dentro de AppBootProvider');
  return ctx;
}