'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BaseIngredient, Recipe, Product } from '@/lib/types';
import { fetchIngredients } from '@/lib/ingredients-db';
import { fetchRecipes } from '@/lib/recipes-db';
import { fetchProducts } from '@/lib/products-db';
import { MIN_BOOT_MS, SPLASH_FADE_MS, minDelay } from '@/lib/boot';
import { FullPageLoader } from '@/components/boot/full-page-loader';

interface AppBootState {
  ready: boolean;
  ingredients: BaseIngredient[];
  recipes: Recipe[];
  products: Product[];
}

const AppBootContext = createContext<AppBootState | null>(null);

function settled<T>(result: PromiseSettledResult<T[]>, fallback: T[] = []): T[] {
  return result.status === 'fulfilled' ? result.value : fallback;
}

export function AppBootProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppBootState>({
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

  useEffect(() => {
    document.body.style.overflow = state.ready ? '' : 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [state.ready]);

  return (
    <AppBootContext.Provider value={state}>
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