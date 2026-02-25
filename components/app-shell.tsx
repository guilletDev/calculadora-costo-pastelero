'use client';

import { useState } from 'react';
import { IngredientList } from '@/components/ingredient-list';
import { RecipeBuilder } from '@/components/recipe-builder';
import { Separator } from '@/components/ui/separator';

export function AppShell() {
  const [isIngredientsLocked, setIsIngredientsLocked] = useState(false);

  return (
    <main className="container mx-auto px-4 py-8 space-y-12">
      <section>
        <IngredientList onLockChange={setIsIngredientsLocked} />
      </section>

      <Separator className="my-8" />

      <section>
        <RecipeBuilder isIngredientsLocked={isIngredientsLocked} />
      </section>
    </main>
  );
}
