'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { TransitionLink } from '@/components/transition-link';
import { createClient } from '@/utils/supabase/client';
import { useAppBoot } from '@/components/boot/app-boot-context';
import { UserProfile } from '@/components/user-profile';
import { ThemeToggle } from '@/components/theme-toggle';
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
import { formatProValidUntil } from '@/lib/pricing';
import { UpgradeButton } from '@/components/upgrade-button';

const SIGNOUT_TIMEOUT_MS = 1000;

const NAV_LINKS = [
  { href: '/dashboard',         label: 'Dashboard',  icon: 'dashboard' },
  { href: '/dashboard/pedidos', label: 'Pedidos',    icon: 'receipt_long' },
  { href: '/inventario',        label: 'Inventario', icon: 'inventory' },
  { href: '/recetas',           label: 'Recetas',    icon: 'menu_book' },
  { href: '/productos',         label: 'Productos',  icon: 'storefront' },
];

function isActivePath(pathname: string, href: string) {
  return href === '/' || href === '/dashboard'
    ? pathname === href
    : pathname.startsWith(href);
}

function BrandLogo() {
  return (
    <TransitionLink href="/dashboard" className="flex items-center gap-2.5 shrink-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ee2b6c] text-white shrink-0">
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bakery_dining</span>
      </div>
      <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
        costo repostero
      </span>
    </TransitionLink>
  );
}

interface UserMenuProps {
  onLogout: () => void;
  side?: 'top' | 'bottom';
}

function UserMenu({ onLogout, side = 'bottom' }: UserMenuProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, isPro, profile } = useAppBoot();
  const pathname = usePathname();

  // ── Datos del usuario ───────────────────────────────────────────────────────
  const meta      = user?.user_metadata ?? {};
  const userName  = (meta.full_name || meta.name || user?.email?.split('@')[0] || 'Usuario') as string;
  const userEmail = (user?.email ?? '') as string;

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="group flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-offset-0 select-none"
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

      <DropdownMenuContent align="end" side={side} className="w-64">
        {/* Header de perfil */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <UserProfile size={40} />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{userName}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</span>
          </div>
        </div>

        {/* Mi Perfil */}
        <DropdownMenuItem asChild>
          <TransitionLink
            href="/perfil"
            onClick={() => setDropdownOpen(false)}
            className={`flex items-center gap-2.5 px-2 py-2 rounded-sm text-sm font-semibold transition-colors ${
              pathname === '/perfil'
                ? 'text-[#ee2b6c] bg-[#ee2b6c]/5'
                : 'text-slate-600 hover:text-[#ee2b6c] dark:text-white'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person</span>
            Mi Perfil
          </TransitionLink>
        </DropdownMenuItem>

        {/* Links de navegación (solo mobile: en desktop ya están en el sidebar) */}
        <div className="md:hidden">
          {NAV_LINKS.map(({ href, label, icon }) => (
            <DropdownMenuItem key={href} asChild>
              <TransitionLink
                href={href}
                onClick={() => setDropdownOpen(false)}
                className={`flex items-center gap-2.5 px-2 py-2 rounded-sm text-sm font-semibold transition-colors ${
                  isActivePath(pathname, href)
                    ? 'text-[#ee2b6c] bg-[#ee2b6c]/5'
                    : 'text-slate-600 hover:text-[#ee2b6c] dark:text-white'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
                {label}
              </TransitionLink>
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator />

        {isPro ? (
          <div className="px-4 py-2.5 flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ee2b6c]/10 text-[#ee2b6c] text-[11px] font-bold px-2.5 py-1 uppercase tracking-wide">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>workspace_premium</span>
              Pro
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {profile.proValidUntil
                ? `Vence el ${formatProValidUntil(profile.proValidUntil)}`
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

        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            setDropdownOpen(false);
            onLogout();
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DesktopUserCard({ onLogout }: { onLogout: () => void }) {
  const { user, isPro } = useAppBoot();

  const meta      = user?.user_metadata ?? {};
  const userName  = (meta.full_name || meta.name || user?.email?.split('@')[0] || 'Usuario') as string;

  return (
    <div className="mt-auto space-y-3 border-t border-[#e4bdc2]/30 pt-4">
      <div className="flex items-center gap-3 rounded-xl bg-slate-100/80 p-3 dark:bg-white/5">
        <UserProfile size={34} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {userName}
            </p>
            {isPro && (
              <span className="inline-flex items-center rounded-full bg-[#ee2b6c]/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#ee2b6c]">
                PRO
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isPro ? 'Plan Pro activo' : 'Plan Gratuito'}
          </p>
        </div>
      </div>

      {!isPro && (
        <UpgradeButton
          label="Desbloquear Plan Pro"
          className="flex w-full items-center justify-center gap-2 rounded-md bg-[#ee2b6c] text-white text-xs font-semibold py-2 hover:bg-[#d4235e] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        />
      )}

      <div className="pt-1">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-start gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-[#ee2b6c] dark:text-white dark:hover:bg-white/5 dark:hover:text-[#ee2b6c] transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export function Navbar() {
  const [logoutOpen, setLogoutOpen]     = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const pathname = usePathname();

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    // Feedback instantáneo en el botón ("Cerrando sesión...").
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      // signOut limpia las cookies de sesión: sin eso, el middleware
      // devolvería /login → /dashboard. Tope de 1s para no demorar el cierre.
      await Promise.race([
        supabase.auth.signOut(),
        new Promise<void>((resolve) => setTimeout(resolve, SIGNOUT_TIMEOUT_MS)),
      ]);
    } catch (err) {
      console.error('[navbar] Error al cerrar sesión:', err);
    } finally {
      // Hard-redirect: limpia todo el estado del cliente (boot/contexto/memoria).
      window.location.href = '/login';
    }
  };

  const openLogoutConfirm = () => {
    setLogoutOpen(true);
  };

  return (
    <>
      {/* ── Modal de confirmación logout ───────────────────────────────────── */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="max-w-sm rounded-[24px] bg-stitch-surface-container-lowest border-stitch-outline-variant"
        >
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
              className="flex-1 rounded-full border border-gray-300 bg-stitch-surface-container-lowest text-gray-700 dark:border-stitch-outline-variant dark:bg-white/10 dark:text-stitch-on-surface font-medium text-sm py-2.5 hover:bg-gray-50 hover:border-gray-400 dark:hover:bg-white/15 dark:hover:border-stitch-outline-variant focus:outline-none focus-visible:ring-0 shadow-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleLogout(); }}
              disabled={isLoggingOut}
              className="flex-1 rounded-full bg-[#b80049] hover:bg-[#bc004b] text-white font-medium text-sm py-2.5 focus:outline-none focus-visible:ring-0 shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Header mobile ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-[#ee2b6c]/10 bg-white/95 backdrop-blur-md dark:bg-[#221016]/95 md:hidden">
        <div className="mx-auto flex w-full max-w-[1000px] items-center justify-between px-5 py-3">
          <BrandLogo />

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu onLogout={openLogoutConfirm} />
          </div>
        </div>
      </header>

      {/* ── Sidebar desktop ────────────────────────────────────────────────── */}
      <aside
        aria-label="Navegación principal"
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#e4bdc2]/30 bg-white/95 p-6 backdrop-blur-md dark:bg-[#221016]/95 md:flex"
      >
        <div className="flex flex-col">
          <BrandLogo />

          <nav className="mt-8 flex flex-col space-y-1">
            {NAV_LINKS.map(({ href, label, icon }) => (
              <TransitionLink
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  isActivePath(pathname, href)
                    ? 'bg-[#ee2b6c]/10 text-[#ee2b6c]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#ee2b6c] dark:text-white dark:hover:bg-white/5 dark:hover:text-[#ee2b6c]'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
                {label}
              </TransitionLink>
            ))}
            <TransitionLink
              href="/perfil"
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                pathname === '/perfil'
                  ? 'bg-[#ee2b6c]/10 text-[#ee2b6c]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-[#ee2b6c] dark:text-white dark:hover:bg-white/5 dark:hover:text-[#ee2b6c]'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person</span>
              Mi Perfil
            </TransitionLink>
          </nav>
        </div>

        <DesktopUserCard onLogout={openLogoutConfirm} />
      </aside>
    </>
  );
}
