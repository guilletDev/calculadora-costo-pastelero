'use client';

import { useState, useEffect } from 'react';
import { TransitionLink } from '@/components/transition-link';

export function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setIsOpen(false);
    setTimeout(() => {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }, 250);
  };

  // Bloquear el scroll del fondo mientras el menú fullscreen está abierto.
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const links = [
    { href: '#inicio', label: 'Inicio' },
    { href: '#beneficios', label: 'Beneficios' },
    { href: '#como-funciona', label: 'Cómo funciona' },
    { href: '#precios', label: 'Precios' },
    { href: '#preguntas', label: 'Preguntas' },
  ];

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-[#f9f9ff]/90 backdrop-blur-lg border-b border-[#e4bdc2]/20 shadow-sm transition-all duration-300 ease-in-out">
        <div className="animate-nav-fade-down w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-16 h-20 flex items-center">
          {/* Izquierda: Logo */}
          <button onClick={scrollToTop} className="flex items-center gap-2.5 shrink-0 cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ee2b6c] text-white shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bakery_dining</span>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-[#151c27] whitespace-nowrap" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
              costo repostero
            </span>
          </button>

          {/* Centro: Menú de navegación */}
          <div className="hidden lg:flex flex-1 justify-center items-center gap-8">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="stitch-nav-link text-sm font-semibold tracking-[0.02em] text-[#5f5e5e] hover:text-[#151c27] transition-colors duration-200"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Derecha: Botones de CTA */}
          <div className="hidden lg:flex items-center justify-end gap-3">
            <TransitionLink
              href="/login"
              className="text-sm font-semibold tracking-[0.02em] border border-[#b80049] text-[#b80049] px-4 py-2.5 rounded-full font-medium hover:bg-[#b80049]/10 transition-colors whitespace-nowrap"
            >
              Iniciar Sesión
            </TransitionLink>
            <TransitionLink
              href="/login"
              className="bg-[#b80049] text-white text-sm font-semibold tracking-[0.02em] px-6 py-2.5 rounded-full btn-hover-effect transition-all duration-300 hover:scale-105 whitespace-nowrap"
            >
              Comenzar Ahora
            </TransitionLink>
          </div>

          {/* Mobile Menu Button: fuera del wrapper animado para ser visible
              e interactivo desde el frame 0 en mobile */}
          <button
            className="lg:hidden absolute top-0 right-6 md:right-12 h-20 flex items-center text-[#b80049] opacity-100"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isOpen}
          >
            <svg className="w-8 h-8 text-[#b80049]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu fullscreen (hermano del nav: evita el containing block
          que crean backdrop-blur/transform para descendientes fixed) */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className="fixed inset-0 z-50 h-dvh w-full bg-[#f9f9ff] p-6 flex flex-col justify-between animate-in slide-in-from-top duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden"
        >
          <div>
            {/* Header: logo + cierre */}
            <div className="flex items-center justify-between">
              <button onClick={scrollToTop} className="flex items-center gap-2.5 shrink-0 cursor-pointer">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ee2b6c] text-white shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bakery_dining</span>
                </div>
                <span className="text-lg font-extrabold tracking-tight text-[#151c27] whitespace-nowrap" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                  costo repostero
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar menú"
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#b80049] hover:bg-[#b80049]/10 transition-colors"
              >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navegación */}
            <div className="mt-10 space-y-4">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="block text-3xl font-bold tracking-tight text-[#151c27] hover:text-[#b80049] transition-colors"
                  style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* CTAs inferiores */}
          <div className="border-t border-[#e4bdc2]/60 pt-6 space-y-3">
            <TransitionLink
              href="/login"
              onClick={() => setIsOpen(false)}
              className="block w-full py-3 text-base text-center bg-[#b80049] text-white font-semibold rounded-full hover:bg-[#bc004b] transition-colors"
            >
              Comenzar gratis
            </TransitionLink>
            <TransitionLink
              href="/login"
              onClick={() => setIsOpen(false)}
              className="block w-full py-3 text-base text-center border border-[#b80049] text-[#b80049] font-semibold rounded-full hover:bg-[#b80049]/10 transition-colors"
            >
              Iniciar Sesión
            </TransitionLink>
          </div>
        </div>
      )}
    </>
  );
}
