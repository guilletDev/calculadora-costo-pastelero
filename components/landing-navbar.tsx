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
      <div className="flex justify-between items-center px-6 lg:px-8 max-w-[1200px] mx-auto h-20">
        {/* Logo */}
        <button onClick={scrollToTop} className="flex items-center gap-2.5 shrink-0 cursor-pointer">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ee2b6c] text-white shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bakery_dining</span>
          </div>
          <span className="text-lg font-extrabold tracking-tight text-[#151c27] whitespace-nowrap" style={{ fontFamily: "'Manrope', sans-serif" }}>
            costo repostero
          </span>
        </button>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="stitch-nav-link text-sm font-semibold tracking-[0.02em] text-[#5f5e5e] hover:text-[#151c27] transition-colors duration-200"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden lg:flex items-center gap-6">
          <TransitionLink
            href="/login"
            className="text-sm font-semibold tracking-[0.02em] text-[#5f5e5e] hover:text-[#151c27] transition-colors duration-200 whitespace-nowrap"
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

        {/* Mobile Menu Button */}
        <button className="lg:hidden text-[#b80049]" onClick={() => setIsOpen(!isOpen)}>
          <span className="material-symbols-outlined text-3xl">{isOpen ? 'close' : 'menu'}</span>
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
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {link.label}
          </a>
        ))}
        <div className="flex flex-col gap-3 mt-2">
          <TransitionLink
            href="/login"
            onClick={() => setIsOpen(false)}
            className="w-full text-center text-base font-semibold text-[#151c27] py-3 border border-[#e4bdc2]/20 rounded-full"
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
