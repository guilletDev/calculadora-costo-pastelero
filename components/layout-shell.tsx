'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { AppBootProvider } from '@/components/boot/app-boot-context';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/forgot-password' || pathname.startsWith('/auth/');
  const isLandingPage = pathname === '/' || pathname === '/privacidad' || pathname === '/terminos-y-condiciones';

  if (isAuthPage || isLandingPage) {
    return <>{children}</>;
  }

  return (
    <AppBootProvider>
      <Navbar />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-slate-400 text-sm">
        <p>© 2026 costo repostero. Hecho para emprendedores pasteleros.</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
          <a href="/privacidad" className="hover:text-[#b80049] transition-colors">
            Política de Privacidad
          </a>
          <a href="/terminos-y-condiciones" className="hover:text-[#b80049] transition-colors">
            Términos y Condiciones
          </a>
        </div>
      </footer>
    </AppBootProvider>
  );
}
