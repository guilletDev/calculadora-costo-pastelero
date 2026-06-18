'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname.startsWith('/auth/');
  const isLandingPage = pathname === '/';

  if (isAuthPage || isLandingPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-slate-400 text-sm">
        <p>© 2026 costo repostero. Hecho para emprendedores pasteleros.</p>
      </footer>
    </>
  );
}
