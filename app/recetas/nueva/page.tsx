'use client';

import { Suspense } from 'react';
import { RecipeBuilder } from '@/components/recipe-builder';

export default function NuevaRecetaPage() {
  return (
    <main
      className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-[10%] py-12 md:py-16 space-y-4"
    >
      <section className="mb-12">
        <h1
          className="font-stitch-headline-lg text-stitch-headline-lg-mobile md:text-stitch-headline-lg text-stitch-on-surface mb-4"
        >
          Nueva Receta
        </h1>
        <p className="font-stitch-body-lg text-stitch-body-lg text-stitch-secondary max-w-2xl">
          Armá tu receta con insumos y subproductos, sumá mano de obra y packaging, y calculá tu precio de venta.
        </p>
      </section>

      <Suspense fallback={
        <div className="py-20 text-center text-[#5f5e5e] flex flex-col items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
          <p className="text-[16px]">Cargando creador de recetas...</p>
        </div>
      }>
        <RecipeBuilder standalone />
      </Suspense>
    </main>
  );
}