'use client';

import { SubproductBuilder } from '@/components/subproduct-builder';

export default function NuevoSubproductoPage() {
  return (
    <main
      className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-[10%] py-12 md:py-16 space-y-4"
    >
      <section className="mb-12">
        <h1
          className="font-stitch-headline-lg text-stitch-headline-lg-mobile md:text-stitch-headline-lg text-stitch-on-surface mb-4"
        >
          Nuevo Subproducto
        </h1>
        <p className="font-stitch-body-lg text-stitch-body-lg text-stitch-secondary max-w-2xl">
          Creá preparaciones base con rendimiento físico para reutilizarlas en tus productos.
        </p>
      </section>

      <SubproductBuilder />
    </main>
  );
}