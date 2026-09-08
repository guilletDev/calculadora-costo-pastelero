'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { TransitionLink } from '@/components/transition-link';
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { User } from '@supabase/supabase-js';
import { isProUser } from '@/lib/limits';
import { formatProValidUntil } from '@/lib/pricing';
import { UpgradeButton } from '@/components/upgrade-button';

export function Navbar() {
  const [logoutOpen, setLogoutOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [proStatus, setProStatus] = useState<{ planType: string | null; proValidUntil: string | null }>({
    planType: null,
    proValidUntil: null,
  });

  const pathname = usePathname();
  const router   = useRouter();

  // ── Cargar usuario autenticado ──────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (!data.user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_type, pro_valid_until')
        .eq('id', data.user.id)
        .maybeSingle();
      setProStatus({
        planType: profile?.plan_type ?? null,
        proValidUntil: profile?.pro_valid_until ?? null,
      });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isPro = isProUser(user?.email, proStatus.planType, proStatus.proValidUntil);

  // ── Datos del usuario ───────────────────────────────────────────────────────
  const meta      = user?.user_metadata ?? {};
  const userName  = (meta.full_name || meta.name || user?.email?.split('@')[0] || 'Usuario') as string;
  const userEmail = (user?.email ?? '') as string;

  // ── Logout ──────────────────────────────────────────────────────────────────
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
    setDropdownOpen(false);
    setLogoutOpen(true);
  };

  const navLinks = [
    { href: '/calculadora', label: 'Calculadora', icon: 'calculate' },
    { href: '/recetas',     label: 'Recetas',      icon: 'menu_book' },
    { href: '/productos',   label: 'Productos',    icon: 'storefront' },
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* ── Modal de confirmación logout ───────────────────────────────────── */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="max-w-sm rounded-[24px] bg-stitch-surface-container-lowest border-stitch-outline-variant">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stitch-primary-fixed">
              <span className="material-symbols-outlined text-stitch-primary" style={{ fontSize: 24 }}>logout</span>
            </div>
            <AlertDialogTitle className="text-center text-base font-bold text-stitch-on-surface">
              Cerrar sesión
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-stitch-secondary">
              ¿Estás seguro de que deseas cerrar sesión?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 sm:flex-row gap-2">
            <AlertDialogCancel
              disabled={isLoggingOut}
              className="flex-1 rounded-md border border-stitch-outline-variant bg-stitch-surface-container-lowest text-stitch-on-surface font-semibold text-sm py-2.5 hover:bg-stitch-surface-container-low transition-colors"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleLogout(); }}
              disabled={isLoggingOut}
              className="flex-1 rounded-md bg-stitch-primary text-on-primary font-semibold text-sm py-2.5 hover:bg-stitch-surface-tint transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 w-full border-b border-[#ee2b6c]/10 bg-white/95 backdrop-blur-md dark:bg-[#221016]/95"
      >
        <div className="mx-auto flex w-full max-w-[1000px] items-center justify-between px-5 py-3">

          {/* Logo */}
          <TransitionLink href="/calculadora" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ee2b6c] text-white shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bakery_dining</span>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              costo repostero
            </span>
          </TransitionLink>

          {/* ── Desktop: nav central ───────────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(({ href, label }) => (
              <TransitionLink
                key={href}
                href={href}
                className={`text-sm font-semibold transition-colors ${
                  isActive(href)
                    ? 'text-[#ee2b6c]'
                    : 'text-slate-600 hover:text-[#ee2b6c] dark:text-slate-400'
                }`}
              >
                {label}
              </TransitionLink>
            ))}
          </nav>

          {/* ── Dropdown unificado de usuario (mobile + desktop) ───────────── */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="group flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Perfil de usuario"
                aria-expanded={dropdownOpen}
              >
                <span className="flex flex-col items-center justify-center gap-0.5">
                  <UserProfile size={32} />
                  <span
                    className={`inline-flex items-center rounded-full px-1 py-[1px] text-[10px] font-extrabold uppercase tracking-wide leading-none ${
                      isPro
                        ? 'bg-[#ee2b6c]/10 text-[#ee2b6c]'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {isPro ? 'PRO' : 'FREE'}
                  </span>
                </span>
                <span className="material-symbols-outlined text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180">
                  expand_more
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64">
              {/* Header de perfil */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <UserProfile size={40} />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{userName}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</span>
                </div>
              </div>

              {/* Links de navegación */}
              {navLinks.map(({ href, label, icon }) => (
                <DropdownMenuItem key={href} asChild>
                  <TransitionLink
                    href={href}
                    onClick={() => setDropdownOpen(false)}
                    className={`flex items-center gap-2.5 px-2 py-2 rounded-sm text-sm font-semibold transition-colors ${
                      isActive(href)
                        ? 'text-[#ee2b6c] bg-[#ee2b6c]/5'
                        : 'text-slate-600 hover:text-[#ee2b6c] dark:text-slate-400'
                    }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
                    {label}
                  </TransitionLink>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              {isPro ? (
                <div className="px-4 py-2.5 flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#ee2b6c]/10 text-[#ee2b6c] text-[11px] font-bold px-2.5 py-1 uppercase tracking-wide">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>workspace_premium</span>
                    Pro
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {proStatus.proValidUntil
                      ? `Vence el ${formatProValidUntil(proStatus.proValidUntil)}`
                      : 'Plan activo'}
                  </span>
                </div>
              ) : (
                <div className="px-2 pb-2">
                  <UpgradeButton
                    label="Desbloquear Plan Pro"
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-[#ee2b6c] text-white text-sm font-semibold py-2 hover:bg-[#d4235e] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem variant="destructive" onSelect={openLogoutConfirm}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}