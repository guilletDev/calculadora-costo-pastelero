'use client';

import { useState, useCallback } from 'react';
import { IngredientList } from '@/components/ingredient-list';
import { BaseIngredient } from '@/lib/types';

export default function InventarioPage() {
  const [ingredientsVersion, setIngredientsVersion] = useState(0);

  const handleIngredientsChange = useCallback((_ingredients: BaseIngredient[]) => {
    setIngredientsVersion(v => v + 1);
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-8 space-y-8">
      {/* Encabezado */}
      <div>
        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Inventario de Ingredientes
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Gestioná todos tus ingredientes y sus precios en un solo lugar.
        </p>
      </div>

      <IngredientList
        onIngredientsChange={handleIngredientsChange}
        ingredientsVersion={ingredientsVersion}
      />
    </main>
  );
}
