'use client';

import { AppShell } from '@/components/app-shell';

export default function Home() {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
      `}} />
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f8f6f6] dark:bg-[#221016] text-slate-900 dark:text-slate-100 antialiased" style={{ fontFamily: "'Manrope', sans-serif" }}>
        {/* Header/Navigation */}
        <header className="sticky top-0 z-50 w-full border-b border-[#ee2b6c]/10 bg-white/80 backdrop-blur-md dark:bg-[#221016]/80">
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ee2b6c] text-white">
                <span className="material-symbols-outlined">bakery_dining</span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">costo respostero</h1>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a className="text-sm font-semibold text-[#ee2b6c]" href="#">Calculadora</a>
              <a className="text-sm font-medium text-slate-600 hover:text-[#ee2b6c] transition-colors dark:text-slate-400" href="#">Inventario</a>
              <a className="text-sm font-medium text-slate-600 hover:text-[#ee2b6c] transition-colors dark:text-slate-400" href="#">Recetas</a>
            </nav>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-[#ee2b6c]/10 flex items-center justify-center text-[#ee2b6c] cursor-pointer border border-[#ee2b6c]/20">
                <span className="material-symbols-outlined">person</span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-10 space-y-12">
          {/* Hero Section */}
          <section className="space-y-2">
            <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Calculadora de Costos</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">Optimiza tus márgenes de ganancia con cálculos precisos para tu emprendimiento pastelero.</p>
          </section>

          <AppShell />

        </main>

        <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-8 text-center text-slate-400 text-sm">
          <p>© 2024 costo respostero. Hecho para emprendedores pasteleros.</p>
        </footer>
      </div>
    </>
  );
}
