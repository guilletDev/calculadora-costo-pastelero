'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { AppBootProvider } from '@/components/boot/app-boot-context';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/forgot-password' || pathname.startsWith('/auth/');
  const isLandingPage = pathname === '/' || pathname === '/privacidad' || pathname === '/terminos-y-condiciones';

  // Reset de scroll en cada navegación (incluye atrás/adelante). Se fuerza
  // scroll-behavior auto para que el salto sea instantáneo y no quede a mitad
  // de página por el smooth global o por las View Transitions.
  useEffect(() => {
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.scrollTop = 0;
    document.body.scrollTop = 0;
    root.style.scrollBehavior = previousBehavior;
  }, [pathname]);

  if (isAuthPage || isLandingPage) {
    return <>{children}</>;
  }

  return (
    <AppBootProvider>
      <div className="flex min-h-screen w-full flex-1 flex-col md:flex-row">
        <Navbar />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-0">
            {children}
          </div>
          <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-slate-400 text-sm">
            <p>© 2026 costo repostero. Hecho para emprendedores pasteleros.</p>
          </footer>
        </div>
      </div>
    </AppBootProvider>
  );
}
