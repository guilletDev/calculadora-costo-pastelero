'use client';

import { IngredientList } from '@/components/ingredient-list';
import { HourlyRateCard } from '@/components/hourly-rate-card';

export default function InventarioPage() {
  return (
    <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-[10%] py-12 md:py-16 space-y-10">
      <section className="mb-4">
        <h1 className="font-stitch-headline-lg text-stitch-headline-lg-mobile md:text-stitch-headline-lg text-stitch-on-surface mb-4">
          Inventario
        </h1>
        <p className="font-stitch-body-lg text-stitch-body-lg text-stitch-secondary max-w-2xl">
          Gestioná tus insumos e ingredientes y configurá tu valor hora para el cálculo de mano de obra.
        </p>
      </section>

      <IngredientList lockEnabled={false} title="Gestión de Insumos e Ingredientes" />

      <HourlyRateCard />
    </main>
  );
}