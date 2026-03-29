'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

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

  const navLinks = [
    { href: '/', label: 'Calculadora', icon: 'calculate' },
    { href: '/inventario', label: 'Inventario', icon: 'inventory_2' },
    { href: '/recetas', label: 'Recetas', icon: 'menu_book' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
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

      <header className="sticky top-0 z-50 w-full border-b border-[#ee2b6c]/10 bg-white/95 backdrop-blur-md dark:bg-[#221016]/95">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ee2b6c] text-white shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bakery_dining</span>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              costo repostero
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-semibold transition-colors ${
                  isActive(href)
                    ? 'text-[#ee2b6c]'
                    : 'text-slate-600 hover:text-[#ee2b6c] dark:text-slate-400'
                }`}
              >
                {label}
              </Link>
            ))}
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

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="menu-animate md:hidden bg-white dark:bg-[#1a0c10] border-t border-slate-100 dark:border-slate-800 shadow-xl">
            <div className="px-5 py-3 flex flex-col gap-0.5">
              {navLinks.map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md font-semibold text-sm transition-colors ${
                    isActive(href)
                      ? 'text-[#ee2b6c] bg-[#ee2b6c]/5'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-[#ee2b6c]'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
