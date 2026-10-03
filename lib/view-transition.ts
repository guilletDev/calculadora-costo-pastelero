import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export function navigateWithTransition(router: AppRouterInstance, href: string) {
  if (document.startViewTransition) {
    try {
      document.startViewTransition(() => router.push(href));
      return;
    } catch {
      // Una transición ya activa puede lanzar: caemos al push directo.
    }
  }
  router.push(href);
}
