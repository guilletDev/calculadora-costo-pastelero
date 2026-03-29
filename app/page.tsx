'use client';

import { Suspense, useEffect } from 'react';
import { AppShell } from '@/components/app-shell';

export default function Home() {
  useEffect(() => {
    if (window.location.hash === '#recipe-builder') {
      setTimeout(() => {
        document.getElementById('recipe-builder')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-8 space-y-10">
      {/* Hero Section */}
      <section className="space-y-1.5">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          Calculadora de Costos
        </h2>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400">
          Optimiza tus márgenes de ganancia con cálculos precisos para tu emprendimiento pastelero.
        </p>
      </section>

      <Suspense>
        <AppShell />
      </Suspense>
    </main>
  );
}
