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
    { href: '#beneficios', label: 'Beneficios' },
    { href: '#como-funciona', label: 'Cómo funciona' },
    { href: '#testimonios', label: 'Testimonios' },
    { href: '#preguntas', label: 'Preguntas' },
  ];

  return (
    <nav className="sticky top-0 w-full z-50 bg-surface/80 dark:bg-surface/80 backdrop-blur-xl shadow-sm border-b border-surface-container-low dark:border-surface-dim">
      <div className="flex justify-between items-center px-6 lg:px-8 py-4 max-w-7xl mx-auto">
        <button onClick={scrollToTop} className="flex items-center gap-2.5 shrink-0 cursor-pointer">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ee2b6c] text-white shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bakery_dining</span>
          </div>
          <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            costo repostero
          </span>
        </button>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(link => (
            <a key={link.href} href={link.href} className="font-headline text-body-md text-on-surface-variant hover:text-primary transition-colors duration-300">
              {link.label}
            </a>
          ))}
        </div>
        
        <div className="hidden md:flex items-center gap-4">
          <TransitionLink href="/login" className="font-headline text-body-md text-on-surface font-medium hover:text-primary transition-colors">
            Iniciar sesión
          </TransitionLink>
          <TransitionLink href="/login" className="gradient-bg text-on-primary font-headline text-sm font-semibold py-3 px-6 rounded-xl hover:opacity-90 active:scale-95 transition-all duration-200 shadow-md">
            Empezar gratis
          </TransitionLink>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="text-on-surface hover:text-primary transition-colors p-2"
          >
            <span className="material-symbols-outlined text-3xl">{isOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-surface border-b border-surface-container-low shadow-xl flex flex-col px-6 py-4 gap-4 animate-in slide-in-from-top-2 duration-200">
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="font-headline text-lg text-on-surface hover:text-primary transition-colors py-2 border-b border-surface-container-low/50"
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-3 mt-2">
            <TransitionLink
              href="/login"
              onClick={() => setIsOpen(false)}
              className="w-full text-center font-headline text-base text-on-surface font-medium py-3 border border-outline-variant/20 rounded-xl"
            >
              Iniciar sesión
            </TransitionLink>
            <TransitionLink
              href="/login"
              onClick={() => setIsOpen(false)}
              className="w-full text-center gradient-bg text-on-primary font-headline text-base font-semibold py-3 rounded-xl shadow-md"
            >
              Empezar gratis
            </TransitionLink>
          </div>
        </div>
      )}
    </nav>
  );
}
