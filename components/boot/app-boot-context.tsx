'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import { BaseIngredient, Recipe, Product } from '@/lib/types';
import { fetchIngredients } from '@/lib/ingredients-db';
import { fetchRecipes } from '@/lib/recipes-db';
import { fetchProducts } from '@/lib/products-db';
import {
  EMPTY_USER_PROFILE,
  fetchCurrentUserProfile,
  type UserProfileData,
} from '@/lib/user-profile-db';
import { isProUser } from '@/lib/limits';
import { MIN_BOOT_MS, SPLASH_FADE_MS, minDelay } from '@/lib/boot';
import { FullPageLoader } from '@/components/boot/full-page-loader';

export interface AppBootProfile {
  planType: string | null;
  proValidUntil: string | null;
  hourlyRate: number | null;
}

interface AppBootData {
  ready: boolean;
  ingredients: BaseIngredient[];
  recipes: Recipe[];
  products: Product[];
  user: User | null;
  profile: AppBootProfile;
  isPro: boolean;
}

interface AppBootState extends AppBootData {
  refresh: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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

function profileFromSession(session: UserProfileData): AppBootProfile {
  return {
    planType: session.planType,
    proValidUntil: session.proValidUntil,
    hourlyRate: session.hourlyRate,
  };
}

export function AppBootProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppBootData>({
    ready: false,
    ingredients: [],
    recipes: [],
    products: [],
    user: null,
    profile: { planType: null, proValidUntil: null, hourlyRate: null },
    isPro: false,
  });
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ingredients, recipes, products, session] = await Promise.allSettled([
        minDelay(fetchIngredients(), MIN_BOOT_MS),
        minDelay(fetchRecipes(), MIN_BOOT_MS),
        minDelay(fetchProducts(), MIN_BOOT_MS),
        fetchCurrentUserProfile(),
      ]);
      if (cancelled) return;

      if (ingredients.status === 'rejected' || recipes.status === 'rejected' || products.status === 'rejected') {
        toast.error('Hubo un problema al cargar los datos. Intentalo de nuevo.');
      }

      const sessionData = session.status === 'fulfilled' ? session.value : EMPTY_USER_PROFILE;

      setState({
        ready: true,
        ingredients: settled(ingredients),
        recipes: settled(recipes),
        products: settled(products),
        user: sessionData.user,
        profile: profileFromSession(sessionData),
        isPro: isProUser(sessionData.user?.email, sessionData.planType, sessionData.proValidUntil),
      });
      setTimeout(() => setHidden(true), SPLASH_FADE_MS);
    })();
    return () => { cancelled = true; };
  }, []);

  // Re-fetch puntual de sesión + perfil (plan, vencimiento, valor hora).
  // Se usa tras confirmar un pago o guardar el valor hora, sin re-cargar
  // ingredientes/recetas/productos.
  const refreshProfile = useCallback(async () => {
    const session = await fetchCurrentUserProfile();
    setState(prev => ({
      ...prev,
      user: session.user,
      profile: profileFromSession(session),
      isPro: isProUser(session.user?.email, session.planType, session.proValidUntil),
    }));
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
    refreshProfile,
    applyLocal,
  }), [state, refresh, refreshProfile, applyLocal]);

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