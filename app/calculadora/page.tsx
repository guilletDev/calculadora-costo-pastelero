'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';

export default function CalculadoraPage() {
  return (
    <main
      className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-[10%] py-12 md:py-16 space-y-4"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Hero Section */}
      <section className="mb-12">
        <h1
          className="font-extrabold text-[#151c27] mb-4 text-[28px] md:text-[48px] md:leading-[1.1] md:tracking-[-0.02em]"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Calculadora de Costos
        </h1>
        <p className="text-[#5f5e5e] text-[18px] leading-[1.6] max-w-2xl">
          Optimiza tus márgenes de ganancia con cálculos precisos para tu emprendimiento pastelero.
        </p>
      </section>

      <Suspense>
        <AppShell />
      </Suspense>
    </main>
  );
}
