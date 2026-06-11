'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { UserProfile } from '@/components/user-profile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { User } from '@supabase/supabase-js';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Cargar usuario autenticado
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Cerrar dropdown de perfil al hacer click fuera
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  // Datos del usuario para el panel
  const meta = user?.user_metadata ?? {};
  const userName: string = meta.full_name || meta.name || user?.email?.split('@')[0] || 'Usuario';
  const userEmail: string = user?.email ?? '';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  const openLogoutConfirm = () => {
    setProfileOpen(false);
    setMenuOpen(false);
    setLogoutOpen(true);
  };

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
    { href: '/recetas', label: 'Recetas', icon: 'menu_book' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ── Modal de confirmación de cierre de sesión ── */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#ee2b6c]/10">
              <span className="material-symbols-outlined text-[#ee2b6c]" style={{ fontSize: 24 }}>logout</span>
            </div>
            <AlertDialogTitle className="text-center text-base font-bold text-slate-900 dark:text-white">
              Cerrar sesión
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-slate-500 dark:text-slate-400">
              ¿Estás seguro de que deseas cerrar sesión?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 sm:flex-row gap-2">
            <AlertDialogCancel
              disabled={isLoggingOut}
              className="flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-sm py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleLogout(); }}
              disabled={isLoggingOut}
              className="flex-1 rounded-md bg-[#ee2b6c] text-white font-semibold text-sm py-2.5 hover:bg-[#d4255f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

          {/* Derecha: perfil de usuario + hamburger */}
          <div className="flex items-center gap-2.5 shrink-0">

            {/* Avatar con dropdown de perfil — desktop */}
            <div ref={profileRef} className="relative hidden md:block">
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Perfil de usuario"
                aria-expanded={profileOpen}
              >
                <UserProfile size={32} />
                <span
                  className="material-symbols-outlined text-slate-400 transition-transform duration-200"
                  style={{ fontSize: 16, transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  expand_more
                </span>
              </button>

              {/* Panel desplegable */}
              {profileOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50"
                  style={{ animation: 'slideDown 0.2s ease-out both' }}
                >
                  {/* Info del usuario */}
                  <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
                    <UserProfile size={40} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{userName}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</span>
                    </div>
                  </div>
                  {/* Botón cerrar sesión */}
                  <button
                    onClick={openLogoutConfirm}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-[#ee2b6c]/5 hover:text-[#ee2b6c] transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                    Cerrar sesión
                  </button>
                </div>
              )}
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
            {/* Mini perfil mobile */}
            <div className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
              <UserProfile size={38} />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{userName}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</span>
              </div>
            </div>
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
              <button
                onClick={openLogoutConfirm}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md font-semibold text-sm transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-[#ee2b6c]"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
