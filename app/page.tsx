'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/app-shell';

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('header')) setMenuOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined' !important;
          font-weight: normal;
          font-style: normal;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-feature-settings: 'liga';
          font-feature-settings: 'liga';
          -webkit-font-smoothing: antialiased;
        }
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to   { opacity: 1; max-height: 200px; }
        }
        .menu-animate {
          animation: slideDown 0.25s ease-out both;
          overflow: hidden;
        }
      `}} />
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f8f6f6] dark:bg-[#221016] text-slate-900 dark:text-slate-100 antialiased">
        {/* Header/Navigation */}
        <header className="sticky top-0 z-50 w-full border-b border-[#ee2b6c]/10 bg-white/95 backdrop-blur-md dark:bg-[#221016]/95">
          {/* Barra principal */}
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-4">
            {/* Logo — siempre visible */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ee2b6c] text-white shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bakery_dining</span>
              </div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                costo respostero
              </span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              <a className="text-sm font-semibold text-[#ee2b6c]" href="#">Calculadora</a>
              <a className="text-sm font-medium text-slate-600 hover:text-[#ee2b6c] transition-colors dark:text-slate-400" href="#">Recetas</a>
              <a className="text-sm font-medium text-slate-600 hover:text-[#ee2b6c] transition-colors dark:text-slate-400" href="#">Inventario</a>
            </nav>

            {/* Derecha: avatar + hamburger */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="h-9 w-9 rounded-full bg-[#ee2b6c]/10 flex items-center justify-center text-[#ee2b6c] cursor-pointer border border-[#ee2b6c]/20 shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person</span>
              </div>
              {/* Botón hamburguesa — solo mobile */}
              <button
                className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 overflow-hidden"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
                aria-label="Abrir menú"
                aria-expanded={menuOpen}
              >
                <span
                  className="material-symbols-outlined transition-transform duration-200"
                  style={{ fontSize: 24, transform: menuOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  {menuOpen ? 'close' : 'menu'}
                </span>
              </button>
            </div>
          </div>

          {/* Mobile dropdown — animado */}
          {menuOpen && (
            <div className="menu-animate md:hidden bg-white dark:bg-[#1a0c10] border-t border-slate-100 dark:border-slate-800 shadow-xl">
              <div className="px-5 py-3 flex flex-col gap-0.5">
                <a
                  href="#"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md font-semibold text-sm text-[#ee2b6c] bg-[#ee2b6c]/5 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>calculate</span>
                  Calculadora
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md font-medium text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-[#ee2b6c] transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>menu_book</span>
                  Recetas
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md font-medium text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-[#ee2b6c] transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>inventory_2</span>
                  Inventario
                </a>
              </div>
            </div>
          )}
        </header>

        <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-8 space-y-10">
          {/* Hero Section */}
          <section className="space-y-1.5">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Calculadora de Costos</h2>
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400">Optimiza tus márgenes de ganancia con cálculos precisos para tu emprendimiento pastelero.</p>
          </section>

          <AppShell />
        </main>

        <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-6 text-center text-slate-400 text-sm">
          <p>© 2026 costo respostero. Hecho para emprendedores pasteleros.</p>
        </footer>
      </div>
    </>
  );
}
