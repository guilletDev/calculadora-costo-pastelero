'use client';

import { useState } from 'react';
import { IngredientList } from '@/components/ingredient-list';
import { RecipeBuilder } from '@/components/recipe-builder';
import { Separator } from '@/components/ui/separator';
import { ChefHat } from 'lucide-react';

export default function Home() {
  const [isIngredientsLocked, setIsIngredientsLocked] = useState(false);

  console.log('[v0] isIngredientsLocked state:', isIngredientsLocked);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Calculadora de Costos</h1>
              <p className="text-sm text-muted-foreground">Para emprendedores gastronómicos</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-12">
        <section>
          <IngredientList onLockChange={(locked) => {
            console.log('[v0] onLockChange called with:', locked);
            setIsIngredientsLocked(locked);
          }} />
        </section>

        <Separator className="my-8" />

        <section>
          <RecipeBuilder isIngredientsLocked={isIngredientsLocked} />
        </section>
      </main>

      <footer className="border-t mt-12 py-6 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Calculadora de costos para recetas • Gestiona tu emprendimiento gastronómico</p>
        </div>
      </footer>
    </div>
  );
}
