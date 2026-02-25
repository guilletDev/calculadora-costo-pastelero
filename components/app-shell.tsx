'use client';

import { useState, useCallback } from 'react';
import { IngredientList } from '@/components/ingredient-list';
import { RecipeBuilder } from '@/components/recipe-builder';
import { Separator } from '@/components/ui/separator';
import { BaseIngredient } from '@/lib/types';

export function AppShell() {
  const [isIngredientsLocked, setIsIngredientsLocked] = useState(false);
  const [ingredientsVersion, setIngredientsVersion] = useState(0);

  const handleIngredientsChange = useCallback((_ingredients: BaseIngredient[]) => {
    setIngredientsVersion(v => v + 1);
  }, []);

  return (
    <main className="container mx-auto px-4 py-8 space-y-12">
      <section>
        <IngredientList
          onLockChange={setIsIngredientsLocked}
          onIngredientsChange={handleIngredientsChange}
        />
      </section>

      <Separator className="my-8" />

      <section>
        <RecipeBuilder
          isIngredientsLocked={isIngredientsLocked}
          ingredientsVersion={ingredientsVersion}
        />
      </section>
    </main>
  );
}
