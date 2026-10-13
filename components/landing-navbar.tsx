'use client';

import { useState, useEffect } from 'react';
import { TransitionLink } from '@/components/transition-link';

export function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setIsOpen(false);
    setTimeout(() => {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }, 250);
  };

  // Cerrar al hacer scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  const links = [
    { href: '#inicio', label: 'Inicio' },
    { href: '#beneficios', label: 'Beneficios' },
    { href: '#como-funciona', label: 'Cómo funciona' },
    { href: '#precios', label: 'Precios' },
    { href: '#preguntas', label: 'Preguntas' },
  ];

  return (
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
          {isOpen ? (
            <svg className="w-8 h-8 text-[#b80049]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-[#b80049]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      <div 
        className={`lg:hidden absolute top-full left-0 w-full bg-[#f9f9ff] border-b border-[#e4bdc2]/20 shadow-xl flex flex-col px-6 py-4 gap-3 transition-all duration-300 ease-in-out -z-10 ${
          isOpen 
            ? 'opacity-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={(e) => handleNavClick(e, link.href)}
            className="text-base font-semibold text-[#151c27] hover:text-[#b80049] transition-colors py-2 border-b border-[#e4bdc2]/10"
            style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
          >
            {link.label}
          </a>
        ))}
        <div className="flex flex-col gap-3 mt-2">
          <TransitionLink
            href="/login"
            onClick={() => setIsOpen(false)}
            className="w-full text-center text-base font-semibold text-[#b80049] py-3 border border-[#b80049] rounded-full hover:bg-[#b80049]/10 transition-colors"
          >
            Iniciar Sesión
          </TransitionLink>
          <TransitionLink
            href="/login"
            onClick={() => setIsOpen(false)}
            className="w-full text-center bg-[#b80049] text-white text-base font-semibold py-3 rounded-full shadow-md"
          >
            Comenzar Ahora
          </TransitionLink>
        </div>
      </div>
    </nav>
  );
}
