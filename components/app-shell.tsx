'use client';

import { useState, useCallback } from 'react';
import { IngredientList } from '@/components/ingredient-list';
import { RecipeBuilder } from '@/components/recipe-builder';
import { BaseIngredient } from '@/lib/types';

export function AppShell() {
  const [isIngredientsLocked, setIsIngredientsLocked] = useState(false);
  const [ingredientsVersion, setIngredientsVersion] = useState(0);

  const handleIngredientsChange = useCallback((_ingredients: BaseIngredient[]) => {
    setIngredientsVersion(v => v + 1);
  }, []);


  return (
    <div className="space-y-8" id="calculator-content-flow">
      <IngredientList
        onLockChange={setIsIngredientsLocked}
        onIngredientsChange={handleIngredientsChange}
        ingredientsVersion={ingredientsVersion}
      />
      
      <RecipeBuilder
        isIngredientsLocked={isIngredientsLocked}
        ingredientsVersion={ingredientsVersion}
      />
    </div>
  );
}
